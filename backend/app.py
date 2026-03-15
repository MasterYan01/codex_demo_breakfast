import base64
import json
import mimetypes
import os
import smtplib
import re
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.parse import parse_qs, unquote, urlparse, urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / 'data' / 'menu.json'
RESERVATION_FILE = ROOT / 'data' / 'reservations.json'
WAITLIST_FILE = ROOT / 'data' / 'waitlist.json'
TAKEOUT_FILE = ROOT / 'data' / 'takeout.json'
HOST = os.getenv('HOST', '127.0.0.1')
PORT = int(os.getenv('PORT', '8020'))
DEFAULT_ALLOWED_ORIGINS = 'http://127.0.0.1:8020,http://localhost:8020,http://127.0.0.1:5500,http://localhost:5500,https://masteryan01.github.io'
ALLOWED_ORIGINS = {origin.strip() for origin in os.getenv('ALLOWED_ORIGINS', DEFAULT_ALLOWED_ORIGINS).split(',') if origin.strip()}
ALLOW_ALL_ORIGINS = '*' in ALLOWED_ORIGINS
RESERVATION_LIMIT = int(os.getenv('RESERVATION_LIMIT', '500'))
RESERVATION_WEBHOOK_URL = os.getenv('RESERVATION_WEBHOOK_URL', '').strip()
WAITLIST_LIMIT = int(os.getenv('WAITLIST_LIMIT', '500'))
TAKEOUT_LIMIT = int(os.getenv('TAKEOUT_LIMIT', '500'))
NOTIFY_WEBHOOK_URL = os.getenv('NOTIFY_WEBHOOK_URL', '').strip() or RESERVATION_WEBHOOK_URL
LINE_NOTIFY_TOKEN = os.getenv('LINE_NOTIFY_TOKEN', '').strip()
SMTP_HOST = os.getenv('SMTP_HOST', '').strip()
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', '').strip()
SMTP_PASS = os.getenv('SMTP_PASS', '').strip()
SMTP_FROM = os.getenv('SMTP_FROM', '').strip() or SMTP_USER
SMTP_TO = [value.strip() for value in os.getenv('SMTP_TO', '').split(',') if value.strip()]
SMTP_STARTTLS = os.getenv('SMTP_STARTTLS', '1').strip() != '0'
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '').strip()
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '').strip()
TWILIO_FROM = os.getenv('TWILIO_FROM', '').strip()
WAITLIST_SMS_TEMPLATE = os.getenv(
    'WAITLIST_SMS_TEMPLATE',
    '樂沐 La Miu：{name} 您好，已可入座（{guests} 位）。請於 10 分鐘內到店。'
)


def load_menu():
    with DATA_FILE.open('r', encoding='utf-8-sig') as fh:
        return json.load(fh)


def save_menu(payload):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open('w', encoding='utf-8') as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)


def json_bytes(payload):
    return json.dumps(payload, ensure_ascii=False).encode('utf-8')


def load_list(path):
    if not path.exists():
        return []
    try:
        with path.open('r', encoding='utf-8-sig') as fh:
            payload = json.load(fh)
            return payload if isinstance(payload, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def save_list(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)


def load_reservations():
    return load_list(RESERVATION_FILE)


def save_reservations(payload):
    save_list(RESERVATION_FILE, payload)


def load_waitlist():
    return load_list(WAITLIST_FILE)


def save_waitlist(payload):
    save_list(WAITLIST_FILE, payload)


def load_takeout():
    return load_list(TAKEOUT_FILE)


def save_takeout(payload):
    save_list(TAKEOUT_FILE, payload)


def build_notify_message(event_type, entry):
    if event_type == 'reservation':
        return (
            f"新訂位：{entry.get('date', '')} {entry.get('time', '')}，{entry.get('guests', '')} 位，{entry.get('name', '')}。"
            f" 聯絡：{entry.get('phone', '')} / {entry.get('email', '')}"
        )
    if event_type == 'waitlist':
        return (
            f"新候位：{entry.get('date', '')} {entry.get('time', '')}，{entry.get('guests', '')} 位，{entry.get('name', '')}。"
            f" 聯絡：{entry.get('phone', '')}"
        )
    if event_type == 'takeout':
        return (
            f"新外帶：{entry.get('date', '')} {entry.get('time', '')}，{entry.get('name', '')}。"
            f" 內容：{entry.get('items', '')}，聯絡：{entry.get('phone', '')}"
        )
    return f"新通知：{event_type}"


def send_webhook_notification(event_type, entry):
    if not NOTIFY_WEBHOOK_URL:
        return None
    message = build_notify_message(event_type, entry)
    payload = {
        'text': message,
        'content': message,
        'event': event_type,
        'data': entry
    }
    data = json_bytes(payload)
    try:
        req = Request(NOTIFY_WEBHOOK_URL, data=data, headers={'Content-Type': 'application/json'})
        with urlopen(req, timeout=5) as response:
            return response.status
    except URLError:
        return None


def send_line_notify(message):
    if not LINE_NOTIFY_TOKEN:
        return None
    data = urlencode({'message': message}).encode('utf-8')
    try:
        req = Request('https://notify-api.line.me/api/notify', data=data)
        req.add_header('Authorization', f'Bearer {LINE_NOTIFY_TOKEN}')
        req.add_header('Content-Type', 'application/x-www-form-urlencoded')
        with urlopen(req, timeout=5) as response:
            return response.status
    except URLError:
        return None


def send_email_notification(subject, message):
    if not SMTP_HOST or not SMTP_TO:
        return None
    email = EmailMessage()
    email['Subject'] = subject
    email['From'] = SMTP_FROM or SMTP_USER or 'no-reply@example.com'
    email['To'] = ', '.join(SMTP_TO)
    email.set_content(message)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=5) as server:
            if SMTP_STARTTLS:
                server.starttls()
            if SMTP_USER and SMTP_PASS:
                server.login(SMTP_USER, SMTP_PASS)
            server.send_message(email)
        return True
    except (smtplib.SMTPException, OSError):
        return False


def notify_admin(event_type, entry):
    message = build_notify_message(event_type, entry)
    subject_map = {
        'reservation': '訂位',
        'waitlist': '候位',
        'takeout': '外帶'
    }
    subject = f"[La Miu] 新{subject_map.get(event_type, '通知')}"
    result = {}
    webhook_status = send_webhook_notification(event_type, entry)
    if webhook_status is not None:
        result['webhook'] = webhook_status
    line_status = send_line_notify(message)
    if line_status is not None:
        result['line'] = line_status
    email_status = send_email_notification(subject, message)
    if email_status is not None:
        result['email'] = email_status
    return result or None


def normalize_twilio_phone(value):
    if not value:
        return ''
    value = str(value).strip()
    if value.startswith('+'):
        return value
    digits = re.sub(r'\D', '', value)
    if digits.startswith('09') and len(digits) == 10:
        return f'+886{digits[1:]}'
    if digits.startswith('0') and len(digits) >= 9:
        return f'+886{digits[1:]}'
    return value


def send_waitlist_sms(entry):
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM):
        return None
    raw_phone = entry.get('phone', '')
    to_number = normalize_twilio_phone(raw_phone)
    if not to_number:
        return None
    message = WAITLIST_SMS_TEMPLATE.format(
        name=entry.get('name', ''),
        guests=entry.get('guests', ''),
        time=entry.get('time', '')
    )
    payload = urlencode({
        'To': to_number,
        'From': TWILIO_FROM,
        'Body': message
    }).encode('utf-8')
    auth = base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode('utf-8')).decode('utf-8')
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    try:
        req = Request(url, data=payload)
        req.add_header('Authorization', f'Basic {auth}')
        req.add_header('Content-Type', 'application/x-www-form-urlencoded')
        with urlopen(req, timeout=5) as response:
            return response.status
    except URLError:
        return None


def parse_iso_timestamp(value):
    if not value:
        return None
    try:
        if value.endswith('Z'):
            value = value.replace('Z', '+00:00')
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def find_duplicate_entry(entry, entries, keys, window_seconds=120):
    if not entries:
        return None
    now = datetime.now(timezone.utc)
    for prev in reversed(entries[-5:]):
        if not prev:
            continue
        if all(str(prev.get(key, '')).strip() == str(entry.get(key, '')).strip() for key in keys):
            prev_time = parse_iso_timestamp(prev.get('createdAt'))
            if prev_time is None:
                return prev
            if abs((now - prev_time).total_seconds()) <= window_seconds:
                return prev
    return None


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

        if path == '/api/reservations':
            return self.handle_reservations_list(parsed)

        if path == '/api/waitlist':
            return self.handle_waitlist_list(parsed)

        if path == '/api/takeout':
            return self.handle_takeout_list(parsed)

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
        if parsed.path == '/api/reservations':
            return self.handle_reservation_create()
        if parsed.path == '/api/waitlist':
            return self.handle_waitlist_create()
        if parsed.path == '/api/waitlist/notify':
            return self.handle_waitlist_notify()
        if parsed.path == '/api/takeout':
            return self.handle_takeout_create()
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

    def handle_reservations_list(self, parsed):
        query = parse_qs(parsed.query)
        try:
            limit = int(query.get('limit', ['50'])[0])
        except ValueError:
            limit = 50
        limit = max(1, min(limit, 200))
        entries = load_reservations()
        entries = list(reversed(entries))[:limit]
        return self.send_json({'ok': True, 'reservations': entries})

    def handle_reservation_create(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode('utf-8'))
            required = ['name', 'phone', 'email', 'date', 'time', 'guests']
            if not all(payload.get(field) for field in required):
                raise ValueError('Missing required fields')

            entry = {
                'id': uuid.uuid4().hex,
                'createdAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'name': str(payload.get('name', '')).strip(),
                'phone': str(payload.get('phone', '')).strip(),
                'email': str(payload.get('email', '')).strip(),
                'date': str(payload.get('date', '')).strip(),
                'time': str(payload.get('time', '')).strip(),
                'guests': str(payload.get('guests', '')).strip(),
                'notes': str(payload.get('notes', '')).strip(),
                'utm': payload.get('utm', {}) if isinstance(payload.get('utm', {}), dict) else {},
                'referrer': str(payload.get('referrer', '')).strip(),
                'landing': str(payload.get('landing', '')).strip(),
                'source': self.headers.get('Origin', '') or self.headers.get('Referer', ''),
                'userAgent': self.headers.get('User-Agent', '')
            }

            reservations = load_reservations()
            duplicate = find_duplicate_entry(entry, reservations, ['name', 'phone', 'email', 'date', 'time', 'guests'])
            if duplicate:
                return self.send_json({'ok': True, 'reservation': duplicate, 'deduped': True})

            reservations.append(entry)
            if len(reservations) > RESERVATION_LIMIT:
                reservations = reservations[-RESERVATION_LIMIT:]
            save_reservations(reservations)
            notify_status = notify_admin('reservation', entry)
            response = {'ok': True, 'reservation': entry}
            if notify_status is not None:
                response['notify'] = notify_status
            return self.send_json(response)
        except Exception as exc:
            return self.send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)

    def handle_waitlist_list(self, parsed):
        query = parse_qs(parsed.query)
        try:
            limit = int(query.get('limit', ['50'])[0])
        except ValueError:
            limit = 50
        limit = max(1, min(limit, 200))
        entries = load_waitlist()
        entries = list(reversed(entries))[:limit]
        return self.send_json({'ok': True, 'waitlist': entries})

    def handle_waitlist_create(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode('utf-8'))
            required = ['name', 'phone', 'date', 'time', 'guests']
            if not all(payload.get(field) for field in required):
                raise ValueError('Missing required fields')

            entry = {
                'id': uuid.uuid4().hex,
                'createdAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'name': str(payload.get('name', '')).strip(),
                'phone': str(payload.get('phone', '')).strip(),
                'date': str(payload.get('date', '')).strip(),
                'time': str(payload.get('time', '')).strip(),
                'guests': str(payload.get('guests', '')).strip(),
                'notes': str(payload.get('notes', '')).strip(),
                'notifiedAt': '',
                'utm': payload.get('utm', {}) if isinstance(payload.get('utm', {}), dict) else {},
                'referrer': str(payload.get('referrer', '')).strip(),
                'landing': str(payload.get('landing', '')).strip(),
                'source': self.headers.get('Origin', '') or self.headers.get('Referer', ''),
                'userAgent': self.headers.get('User-Agent', '')
            }

            entries = load_waitlist()
            duplicate = find_duplicate_entry(entry, entries, ['name', 'phone', 'date', 'time', 'guests'])
            if duplicate:
                return self.send_json({'ok': True, 'waitlist': duplicate, 'deduped': True})

            entries.append(entry)
            if len(entries) > WAITLIST_LIMIT:
                entries = entries[-WAITLIST_LIMIT:]
            save_waitlist(entries)
            notify_status = notify_admin('waitlist', entry)
            response = {'ok': True, 'waitlist': entry}
            if notify_status is not None:
                response['notify'] = notify_status
            return self.send_json(response)
        except Exception as exc:
            return self.send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)

    def handle_waitlist_notify(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode('utf-8'))
            target_id = str(payload.get('id', '')).strip()
            if not target_id:
                raise ValueError('Missing waitlist id')
            entries = load_waitlist()
            target = next((entry for entry in entries if entry.get('id') == target_id), None)
            if not target:
                return self.send_json({'ok': False, 'error': 'Waitlist entry not found'}, status=HTTPStatus.NOT_FOUND)
            sms_status = send_waitlist_sms(target)
            if sms_status is None:
                return self.send_json({'ok': False, 'error': 'SMS not configured'}, status=HTTPStatus.BAD_REQUEST)
            target['notifiedAt'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            save_waitlist(entries)
            return self.send_json({'ok': True, 'status': sms_status, 'waitlist': target})
        except Exception as exc:
            return self.send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)

    def handle_takeout_list(self, parsed):
        query = parse_qs(parsed.query)
        try:
            limit = int(query.get('limit', ['50'])[0])
        except ValueError:
            limit = 50
        limit = max(1, min(limit, 200))
        entries = load_takeout()
        entries = list(reversed(entries))[:limit]
        return self.send_json({'ok': True, 'takeout': entries})

    def handle_takeout_create(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode('utf-8'))
            required = ['name', 'phone', 'date', 'time', 'items']
            if not all(payload.get(field) for field in required):
                raise ValueError('Missing required fields')

            entry = {
                'id': uuid.uuid4().hex,
                'createdAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                'name': str(payload.get('name', '')).strip(),
                'phone': str(payload.get('phone', '')).strip(),
                'date': str(payload.get('date', '')).strip(),
                'time': str(payload.get('time', '')).strip(),
                'items': str(payload.get('items', '')).strip(),
                'notes': str(payload.get('notes', '')).strip(),
                'utm': payload.get('utm', {}) if isinstance(payload.get('utm', {}), dict) else {},
                'referrer': str(payload.get('referrer', '')).strip(),
                'landing': str(payload.get('landing', '')).strip(),
                'source': self.headers.get('Origin', '') or self.headers.get('Referer', ''),
                'userAgent': self.headers.get('User-Agent', '')
            }

            entries = load_takeout()
            duplicate = find_duplicate_entry(entry, entries, ['name', 'phone', 'date', 'time', 'items'])
            if duplicate:
                return self.send_json({'ok': True, 'takeout': duplicate, 'deduped': True})

            entries.append(entry)
            if len(entries) > TAKEOUT_LIMIT:
                entries = entries[-TAKEOUT_LIMIT:]
            save_takeout(entries)
            notify_status = notify_admin('takeout', entry)
            response = {'ok': True, 'takeout': entry}
            if notify_status is not None:
                response['notify'] = notify_status
            return self.send_json(response)
        except Exception as exc:
            return self.send_json({'ok': False, 'error': str(exc)}, status=HTTPStatus.BAD_REQUEST)

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
