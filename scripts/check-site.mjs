import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  "index.html",
  "404.html",
  ...fs
    .readdirSync(path.join(root, "projects"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => `projects/${f}`),
];
let checked = 0;
for (const page of pages) {
  const file = path.join(root, page);
  const source = fs.readFileSync(file, "utf8");
  assert(source.includes('lang="en"'), `Missing language: ${page}`);
  assert(
    (source.match(/<h1[\s>]/g) || []).length === 1,
    `Expected one h1: ${page}`,
  );
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert(new Set(ids).size === ids.length, `Duplicate IDs: ${page}`);
  for (const [, href] of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:)/.test(href)) continue;
    assert(
      !href.startsWith("/"),
      `Root-relative path breaks project Pages: ${page} → ${href}`,
    );
    const [relative, anchor] = href.split("#");
    const target = relative ? path.resolve(path.dirname(file), relative) : file;
    assert(fs.existsSync(target), `Missing asset: ${page} → ${href}`);
    if (anchor)
      assert(
        fs.readFileSync(target, "utf8").includes(`id="${anchor}"`),
        `Missing anchor: ${page} → ${href}`,
      );
    checked++;
  }
  for (const [, json] of source.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  ))
    JSON.parse(json);
}
const cv = fs.readFileSync(path.join(root, "assets/docs/Adarsh_S_CV.pdf"));
assert(cv.subarray(0, 5).toString() === "%PDF-", "CV is not a PDF");
assert(cv.length > 100000, "Expected the supplied full CV");
console.log(
  `PASS: ${pages.length} pages, ${checked} local references, metadata JSON and replacement CV.`,
);
