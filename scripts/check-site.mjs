import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  "index.html",
  "recruiter.html",
  "workbench.html",
  "audio-studio.html",
  "assets/field/education-photo-credits-v8.html",
  "assets/film-v8/credits.html",
  "lab.html",
  "404.html",
  ...fs
    .readdirSync(path.join(root, "projects"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => `projects/${f}`),
];
let checked = 0;
const linkedScripts = new Set();
for (const page of pages) {
  const file = path.join(root, page);
  const source = fs.readFileSync(file, "utf8");
  assert(source.includes('lang="en"'), `Missing language: ${page}`);
  assert(
    (source.match(/<h1[\s>]/g) || []).length === 1,
    `Expected one h1: ${page}`,
  );
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert(!ids.some(id => ["motionToggle", "motionButton", "studioMotion"].includes(id)),
         `Found a retired manual motion control in ${page}`);
  assert(new Set(ids).size === ids.length, `Duplicate IDs: ${page}`);
  const references = [...source.matchAll(/\s(?:href|src|poster)="([^"]+)"/g)].map(match => match[1]);
  for (const [, srcset] of source.matchAll(/\ssrcset="([^"]+)"/g)) {
    references.push(...srcset.split(",").map(item => item.trim().split(/\s+/)[0]));
  }
  for (const img of source.matchAll(/<img\b[^>]*>/gi)) {
    assert(/\salt="[^"]*"/.test(img[0]), `Missing image alternative: ${page}`);
  }
  for (const href of references) {
    if (/^(https?:|mailto:|tel:|data:)/.test(href)) continue;
    assert(
      !href.startsWith("/"),
      `Root-relative path breaks project Pages: ${page} → ${href}`,
    );
    const [withQuery, anchor] = href.split("#");
    const relative = withQuery.split("?")[0];
    let target = relative ? path.resolve(path.dirname(file), relative) : file;
    assert(fs.existsSync(target), `Missing asset: ${page} → ${href}`);
    if (fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
    if (anchor)
      assert(
        fs.readFileSync(target, "utf8").includes(`id="${anchor}"`),
        `Missing anchor: ${page} → ${href}`,
      );
    if (target.endsWith(".js")) linkedScripts.add(target);
    checked++;
  }
  for (const [, json] of source.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  ))
    JSON.parse(json);
}
for (const script of linkedScripts) execFileSync(process.execPath, ["--check", script]);
const cv = fs.readFileSync(path.join(root, "assets/docs/Adarsh_S_CV.pdf"));
assert(cv.subarray(0, 5).toString() === "%PDF-", "CV is not a PDF");
assert(cv.length > 100000, "Expected the supplied full CV");
console.log(
  `PASS: ${pages.length} pages, ${checked} local references, linked script syntax, metadata JSON and original CV.`,
);
