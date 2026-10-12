# Psychology of Learning Quiz

A practice website for the NPTEL **Psychology of Learning** (IIT Kharagpur) assignment MCQs, Weeks 0–12.

**Live site:** https://finding-haseeb.github.io/psychology-of-learning-quiz/

## Features

- 130 questions (10 per week), shown one at a time
- **Instant answer** switch at the top: tap an option and immediately see if it's right, the correct answer, and why
- **Why explanations** for every question in the report: why the correct answer is right, why your answer was wrong, and why each other option is wrong
- Questions and answer options shuffled on every attempt (can be turned off)
- Pick which weeks to include and how many questions (10, 25, 50 or all)
- Score out of 100, correct / wrong / skipped counts and time taken
- Review of wrong answers showing every option: your wrong choice in red, the correct answer in green
- "Retry my mistakes" to practise only the questions you got wrong
- Progress stats: questions seen, accuracy, quizzes taken, best score
- **Weak questions** drill (questions you get right less than 60% of the time) and **bookmarks**
- Recent quiz history
- Progress saved in the browser, so you can close the page and resume
- Works on phones, tablets and computers; black (dark) theme by default with a light mode switch

## Project layout

| Path | What it is |
|---|---|
| `index.html` | The built website (this is what GitHub Pages serves) |
| `src/quiz.html` | Page layout and styles |
| `src/app.js` | Quiz logic |
| `data/questions.json` | Question bank (`w` = week, `q` = question, `o` = options, `a` = index of the correct option, `why` = explanation, `x` = why each wrong option is wrong) |
| `build.py` | Combines the page, the script and the question bank into `index.html` |

## Editing questions

1. Edit `data/questions.json`.
2. Run `python3 build.py`.
3. Commit and push. GitHub Pages updates the site within a minute or two.

## Notes

- Week 12 answers are taken from the submitted assignment screenshots.
- Week 6 Q7: the source PDF marks the letter "a" but gives the answer text "all of the given"; the quiz uses "all of the given".

---

Made by **haseeb_production** · Designed by **madxmonkey**
