"""Empaqueta Produciendo Música en un único HTML autocontenido (dist/produciendo-musica.html).
Uso: python3 build.py   (opcional: --fragment para generar solo el cuerpo, sin <html>/<head>)"""
import pathlib, re, sys
root = pathlib.Path(__file__).parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "css/app.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="css/app.css">', "<style>\n" + css + "\n</style>")
def inline(m):
    return "<script>\n" + (root / m.group(1)).read_text(encoding="utf-8") + "\n</script>"
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline, html)
out = root / "dist"; out.mkdir(exist_ok=True)
if "--fragment" in sys.argv:
    head = re.search(r"<head>(.*)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    head = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*', "", head)
    head = head.replace("<title>Produciendo Música</title>", '<title>Produciendo Música</title>\n<meta name="claude:viewport-fit-sides" content="cover">')
    (out / "produciendo-musica-fragment.html").write_text(head + body, encoding="utf-8")
else:
    (out / "produciendo-musica.html").write_text(html, encoding="utf-8")
print("ok")
