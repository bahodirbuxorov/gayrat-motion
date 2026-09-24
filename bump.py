"""Append a content hash to css/js URLs in index.html so browsers never serve stale files.
Run after editing css/style.css or js/main.js:  python bump.py"""
import hashlib, pathlib, re

root = pathlib.Path(__file__).parent
html = root / 'index.html'
text = html.read_text(encoding='utf-8')
for rel in ('css/style.css', 'js/main.js'):
    digest = hashlib.sha1((root / rel).read_bytes()).hexdigest()[:8]
    text, n = re.subn(rf'{re.escape(rel)}(\?v=[0-9a-f]+)?"', f'{rel}?v={digest}"', text)
    print(f'{rel} -> v={digest} ({n} ref)')
html.write_text(text, encoding='utf-8')
