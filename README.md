# MOOC Practice

A practice website for NPTEL weekly assignment MCQs. Subjects:

- **Psychology of Learning** (IIT Kharagpur), Weeks 0–12 plus "Week 7 2026", 140 questions
- **Introduction to Internet of Things** (IIT Kharagpur), Weeks 0–12, 195 questions (17 with more than one correct answer)

Direct links: add `#psychology_of_learning` or `#introduction_to_internet_of_things` to the site address.

**Live site:** https://finding-haseeb.github.io/mooc-practice/

## Features

- Subject picker; each subject keeps its own progress, bookmarks and history
- Questions shown one at a time
- **Instant answer** switch at the top (off by default): tap an option and immediately see if it's right, the correct answer, and why
- Multiple-answer questions ("Select all that apply"): pick every correct option, then Check answer; counted correct only when the selection matches exactly
- **Why explanations** for every question in the report: why the correct answer is right, why your answer was wrong, and why each other option is wrong
- Questions and answer options shuffled on every attempt (can be turned off)
- Pick which weeks to include and how many questions (10, 25, 50 or all)
- Score out of 100, correct / wrong / skipped counts and time taken
- Review of wrong answers showing every option: your wrong choice in red, the correct answer in green
- "Retry my mistakes" to practise only the questions you got wrong
- Save button on every question in the results review, plus "Save all wrong answers"; saved questions appear under Bookmarked
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
| `assets/` | madxmonkey logo |
| `src/app.js` | Quiz logic |
| `data/subjects.json` | List of subjects (id, name, institute) |
| `data/subjects/<id>.json` | Question bank (`w` = week, `q` = question, `o` = options, `a` = index of the correct option (or a list of indexes for multiple-answer questions), `why` = explanation, `x` = why each wrong option is wrong) |
| `build.py` | Combines the page, the script and the question bank into `index.html` |

## Editing questions

1. Edit the subject file in `data/subjects/` (or add a new one and list it in `data/subjects.json`).
2. Run `python3 build.py`.
3. Commit and push. GitHub Pages updates the site within a minute or two.

## Notes

- Psychology of Learning, Week 12: answers taken from the submitted assignment screenshots.
- Psychology of Learning, "Week 7 2026": the 2026 Week 7 assignment, from screenshots with the accepted answers; kept separate from the original Week 7.
- Psychology of Learning, Week 6 Q7: the source PDF marks the letter "a" but gives the answer text "all of the given"; the quiz uses "all of the given".
- Introduction to IoT, Weeks 1–8: questions, answer keys and explanations from the official weekly assignment solution PDFs.
- Introduction to IoT, Weeks 0 and 9–11: from the submitted assignment screenshots, using the "Accepted answer" shown; explanations written for this site.
- Introduction to IoT, Week 12: no accepted answers were shown yet, so the submitted (selected) options are used; each was checked against the lecture topics.

---

Made by **haseeb_production** · Designed by **madxmonkey**
