# Psychology of Learning Quiz

A practice website for the NPTEL **Psychology of Learning** (IIT Kharagpur) assignment MCQs, Weeks 0–12.

**Live site:** https://finding-haseeb.github.io/psychology-of-learning-quiz/

## Features

- 130 questions (10 per week), shown one at a time
- Questions and answer options shuffled on every attempt (can be turned off)
- Pick which weeks to include and how many questions (10, 25, 50 or all)
- Score out of 100, plus correct / wrong / skipped counts
- Review of wrong answers showing every option: your wrong choice in red, the correct answer in green
- "Retry my mistakes" to practise only the questions you got wrong
- Progress saved in the browser, so you can close the page and resume
- Works on phones, tablets and computers, with light and dark mode

## Project layout

| Path | What it is |
|---|---|
| `index.html` | The built website (this is what GitHub Pages serves) |
| `src/quiz.html` | Page source: layout, styles and quiz logic |
| `data/questions.json` | Question bank (`w` = week, `q` = question, `o` = options, `a` = index of the correct option) |
| `build.py` | Combines the source and the question bank into `index.html` |

## Editing questions

1. Edit `data/questions.json`.
2. Run `python3 build.py`.
3. Commit and push. GitHub Pages updates the site within a minute or two.

## Notes

- Week 12 answers are taken from the submitted assignment screenshots.
- Week 6 Q7: the source PDF marks the letter "a" but gives the answer text "all of the given"; the quiz uses "all of the given".

---

Made by **haseeb_production** · Designed by **madxmonkey**
