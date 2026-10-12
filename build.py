"""Builds MOOC Practice from src/quiz.html + src/app.js + data/.

  index.html            -> full standalone page (GitHub Pages / Netlify / open locally)
  dist/quiz-body.html   -> same page without the <html> skeleton (for Claude Artifacts)
"""
import base64
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))


def tidy(s):
    # Turn long runs of dashes/underscores used as blanks into a clean "___"
    s = re.sub(r"-{3,}|_{3,}", "___", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def load(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return json.load(f)


subjects = []
for meta in load("data/subjects.json"):
    qs = load(f"data/subjects/{meta['id']}.json")
    meta = dict(meta)
    meta["questions"] = [
        {"w": q["w"], "q": tidy(q["q"]), "o": [tidy(o) for o in q["o"]], "a": q["a"],
         "why": q.get("why", ""), "x": q.get("x", [])}
        for q in qs
    ]
    subjects.append(meta)


def data_uri(path):
    with open(os.path.join(ROOT, path), "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


with open(os.path.join(ROOT, "src", "quiz.html"), encoding="utf-8") as f:
    body = f.read()
with open(os.path.join(ROOT, "src", "app.js"), encoding="utf-8") as f:
    app_js = f.read()
body = (body
        .replace("/*SUBJECTS*/", "const SUBJECTS = " + json.dumps(subjects, ensure_ascii=False) + ";")
        .replace("/*APP*/", app_js)
        .replace("/*LOGO64*/", data_uri("assets/logo-64.png"))
        .replace("/*LOGO192*/", data_uri("assets/logo-192.png")))

os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
with open(os.path.join(ROOT, "dist", "quiz-body.html"), "w", encoding="utf-8") as f:
    f.write(body)

head, sep, rest = body.partition("</style>")
page = (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    '<meta name="description" content="MOOC Practice: NPTEL assignment MCQs with shuffled questions, instant answers and explanations. By haseeb_production, designed by madxmonkey.">\n'
    + head + sep + "\n</head>\n<body>\n" + rest + "\n</body>\n</html>\n"
)
with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
    f.write(page)

print("Built", ", ".join(f"{s['name']}: {len(s['questions'])}" for s in subjects), "-> index.html, dist/quiz-body.html")
