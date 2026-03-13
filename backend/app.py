import json
import mimetypes
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / 'data' / 'menu.json'
HOST = os.getenv('HOST', '127.0.0.1')
PORT = int(os.getenv('PORT', '8020'))
DEFAULT_ALLOWED_ORIGINS = 'http://127.0.0.1:8020,http://localhost:8020,http://127.0.0.1:5500,http://localhost:5500,https://masteryan01.github.io'
ALLOWED_ORIGINS = {origin.strip() for origin in os.getenv('ALLOWED_ORIGINS', DEFAULT_ALLOWED_ORIGINS).split(',') if origin.strip()}
ALLOW_ALL_ORIGINS = '*' in ALLOWED_ORIGINS


def load_menu():
    with DATA_FILE.open('r', encoding='utf-8-sig') as fh:
        return json.load(fh)


def save_menu(payload):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open('w', encoding='utf-8') as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)


def json_bytes(payload):
    return json.dumps(payload, ensure_ascii=False).encode('utf-8')


class MenuHandler(BaseHTTPRequestHandler):
    server_version = 'LaMiuHTTP/1.1'

    def get_cors_origin(self):
        origin = self.headers.get('Origin', '')
        if ALLOW_ALL_ORIGINS:
            return origin or '*'
        if origin and origin in ALLOWED_ORIGINS:
            return origin
        return ''

    def send_cors_headers(self):
        origin = self.get_cors_origin()
        if origin:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/menu':
            return self.send_json(load_menu())

        if path.startswith('/api/categories/'):
            slug = unquote(path.split('/api/categories/', 1)[1]).strip('/')
            return self.handle_category(slug)

        if path.startswith('/api/items/'):
            slug = unquote(path.split('/api/items/', 1)[1]).strip('/')
            return self.handle_item(slug)

        return self.serve_static(path)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/menu':
            return self.handle_menu_write()
        self.send_error(HTTPStatus.NOT_FOUND, 'Endpoint not found')

    def do_PUT(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/menu':
            return self.handle_menu_write()
        self.send_error(HTTPStatus.NOT_FOUND, 'Endpoint not found')

    def handle_menu_write(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode('utf-8'))
            if not isinstance(payload, dict) or 'categories' not in payload or 'items' not in payload:
                raise ValueError('Invalid payload shape')
            save_menu(payload)
            self.send_json({'ok': True, 'saved': True})
        except Exception as exc:
            self.send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)

    def handle_category(self, slug):
        data = load_menu()
        category = next((item for item in data['categories'] if item['slug'] == slug), None)
        if category is None:
            return self.send_json({'ok': False, 'error': 'Category not found'}, status=HTTPStatus.NOT_FOUND)
        items = [item for item in data['items'] if item['category'] == slug]
        return self.send_json({'ok': True, 'category': category, 'items': items, 'brand': data.get('brand', {})})

    def handle_item(self, slug):
        data = load_menu()
        item = next((entry for entry in data['items'] if entry['slug'] == slug), None)
        if item is None:
            return self.send_json({'ok': False, 'error': 'Item not found'}, status=HTTPStatus.NOT_FOUND)
        category = next((entry for entry in data['categories'] if entry['slug'] == item['category']), None)
        related = [entry for entry in data['items'] if entry['category'] == item['category'] and entry['slug'] != slug][:3]
        return self.send_json({'ok': True, 'item': item, 'category': category, 'related': related, 'brand': data.get('brand', {})})

    def serve_static(self, path):
        rel_path = path.lstrip('/') or 'index.html'
        rel_path = rel_path.split('?', 1)[0]
        file_path = (ROOT / rel_path).resolve()
        if ROOT not in file_path.parents and file_path != ROOT:
            return self.send_error(HTTPStatus.FORBIDDEN, 'Forbidden')
        if file_path.is_dir():
            file_path = file_path / 'index.html'
        if not file_path.exists():
            return self.send_error(HTTPStatus.NOT_FOUND, 'File not found')

        mime_type, _ = mimetypes.guess_type(str(file_path))
        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', mime_type or 'application/octet-stream')
        self.send_header('Content-Length', str(file_path.stat().st_size))
        self.end_headers()
        with file_path.open('rb') as fh:
            self.wfile.write(fh.read())

    def send_json(self, payload, status=HTTPStatus.OK):
        content = json_bytes(payload)
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, fmt, *args):
        print('%s - - [%s] %s' % (self.address_string(), self.log_date_time_string(), fmt % args))


if __name__ == '__main__':
    httpd = ThreadingHTTPServer((HOST, PORT), MenuHandler)
    print(f'La Miu server running at http://{HOST}:{PORT}')
    print(f'Allowed origins: {sorted(ALLOWED_ORIGINS)}')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down server...')
    finally:
        httpd.server_close()
