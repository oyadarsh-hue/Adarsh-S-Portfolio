"""Small shared fixture for CI and local Chromium checks under the Pages subpath."""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa-artifacts'
PREFIX = '/Adarsh-S-Portfolio/'


class PagesHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if not self.path.startswith(PREFIX):
            self.send_error(404)
            return
        self.path = '/' + self.path[len(PREFIX):]
        super().do_GET()

    def send_head(self):
        # Match GitHub Pages byte-range requests used for long-video seeking.
        self.remaining_bytes = None
        path = Path(self.translate_path(self.path))
        byte_range = self.headers.get('Range')
        if path.suffix != '.mp4' or not byte_range or not path.is_file():
            return super().send_head()
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', byte_range.strip())
        size = path.stat().st_size
        if not match or not any(match.groups()):
            return super().send_head()
        left, right = match.groups()
        start = int(left) if left else max(0, size - int(right))
        end = min(int(right), size - 1) if left and right else size - 1
        if not 0 <= start <= end < size:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        stream = path.open('rb')
        stream.seek(start)
        self.remaining_bytes = end - start + 1
        self.send_response(206)
        self.send_header('Content-Type', 'video/mp4')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(self.remaining_bytes))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        return stream

    def log_message(self, *_):
        pass

    def copyfile(self, source, destination):
        try:
            if self.remaining_bytes is None:
                return super().copyfile(source, destination)
            while self.remaining_bytes:
                chunk = source.read(min(65_536, self.remaining_bytes))
                if not chunk:
                    break
                destination.write(chunk)
                self.remaining_bytes -= len(chunk)
        except (ConnectionResetError, BrokenPipeError):
            pass  # Seeking or navigating can cancel an in-flight media request.


class Report:
    def __init__(self, base):
        self.base = base
        self.checks = []
        self.errors = []

    def check(self, condition, message):
        if not condition:
            raise AssertionError(message)
        self.checks.append(message)

    def page(self, context):
        page = context.new_page()
        page.set_default_timeout(6000)
        page.on('pageerror', lambda error: self.errors.append(str(error)))
        page.on('response', lambda r: self.errors.append(f'{r.status}: {r.url}')
                if r.url.startswith(self.base) and r.status >= 400 else None)
        return page

    def visit(self, page, target=''):
        response = page.goto(self.base + target, wait_until='load')
        self.check(response is not None and response.ok, f'Page opens: {target or "home"}')

    def layout(self, page, label):
        self.check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'),
                   f'No horizontal page overflow: {label}')

    def capture(self, page, name):
        page.screenshot(path=OUT / (name + '.png'), animations='disabled')


@contextmanager
def run_suite(name):
    OUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(PagesHandler, directory=ROOT))
    Thread(target=server.serve_forever, daemon=True).start()
    report = Report(f'http://127.0.0.1:{server.server_port}{PREFIX}')
    try:
        with sync_playwright() as playwright:
            with playwright.chromium.launch(executable_path=os.environ.get('PORTFOLIO_CHROMIUM')) as browser:
                yield browser, report
                report.check(not report.errors, f'Runtime and local resource errors: {report.errors}')
        print(f'PASS: {len(report.checks)} {name} checks')
    finally:
        server.shutdown()
        server.server_close()
        (OUT / f'{name}-report.json').write_text(json.dumps({
            'checks': report.checks, 'errors': report.errors
        }, indent=2), encoding='utf-8')
