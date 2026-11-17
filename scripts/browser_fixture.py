"""Small shared fixture for CI and local Chromium checks under the Pages subpath."""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
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

    def log_message(self, *_):
        pass

    def copyfile(self, source, destination):
        try:
            super().copyfile(source, destination)
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
