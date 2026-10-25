"""Small App Store Connect API client shared by the asc scripts (JWT with the API key)."""
import json, os, sys, time, urllib.request, urllib.error
import jwt

BUNDLE = 'com.robotrainerpro.app'
API = 'https://api.appstoreconnect.apple.com'
KEY_ID, ISSUER = os.environ['ASC_KEY_ID'], os.environ['ASC_ISSUER_ID']
KEY = open(os.environ['ASC_KEY_PATH']).read()


def token():
    now = int(time.time())
    return jwt.encode({'iss': ISSUER, 'iat': now, 'exp': now + 1100, 'aud': 'appstoreconnect-v1'},
                      KEY, algorithm='ES256', headers={'kid': KEY_ID, 'typ': 'JWT'})


def call(method, path, body=None, ok_conflict=False, ok_missing=False):
    url = path if path.startswith('http') else API + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        text = e.read().decode()
        if ok_conflict and e.code == 409:
            print('  already set:', text[:300])
            return None
        if ok_missing and e.code == 404:
            return None
        sys.exit(f'{method} {path} -> {e.code}\n{text}')


def rel(kind, id_):
    return {'data': {'type': kind, 'id': id_}}


def all_pages(path):
    out = []
    while path:
        r = call('GET', path)
        out += r['data']
        path = r.get('links', {}).get('next')
    return out


def upload_parts(ops, blob):
    for op in ops:
        part = blob[op['offset']:op['offset'] + op['length']]
        req = urllib.request.Request(op['url'], data=part, method=op['method'],
                                     headers={h['name']: h['value'] for h in op['requestHeaders']})
        urllib.request.urlopen(req).read()
