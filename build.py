"""Builds the quiz pages from src/quiz.html + data/questions.json.

  index.html            -> full standalone page (GitHub Pages / Netlify / open locally)
  dist/quiz-body.html   -> same page without the <html> skeleton (for Claude Artifacts)
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(ROOT, "data", "questions.json"), encoding="utf-8") as f:
    questions = json.load(f)


def tidy(s):
    # Turn long runs of dashes/underscores used as blanks into a clean "___"
    s = re.sub(r"-{3,}|_{3,}", "___", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


data = [{"w": q["w"], "q": tidy(q["q"]), "o": [tidy(o) for o in q["o"]], "a": q["a"]} for q in questions]

with open(os.path.join(ROOT, "src", "quiz.html"), encoding="utf-8") as f:
    body = f.read().replace("/*QUESTIONS*/", "const QUESTIONS = " + json.dumps(data, ensure_ascii=False) + ";")

os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
with open(os.path.join(ROOT, "dist", "quiz-body.html"), "w", encoding="utf-8") as f:
    f.write(body)

head, sep, rest = body.partition("</style>")
page = (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    '<meta name="description" content="Practice all NPTEL Psychology of Learning assignment MCQs with shuffled questions and options. By haseeb_production.">\n'
    + head + sep + "\n</head>\n<body>\n" + rest + "\n</body>\n</html>\n"
)
with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
    f.write(page)

print(f"Built {len(data)} questions -> index.html, dist/quiz-body.html")
