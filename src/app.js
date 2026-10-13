(function () {
  if (window.__polQuizStarted) return;
  window.__polQuizStarted = true;
  const WEEK_LABEL = w => "Week " + w;
  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  const app = document.getElementById("app");

  // ---------- Browser storage (all optional; the quiz works without it) ----------
  function readJSON(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function removeKey(key) { try { localStorage.removeItem(key); } catch (e) {} }
  // Everything below is kept separately for each subject: "mp:<subject>:<name>"
  let subject = null;
  let QUESTIONS = [], WEEKS = [];
  const storeId = sj => sj.store || sj.id;
  const K = name => "mp:" + storeId(subject) + ":" + name;
  const store = { get: () => readJSON(K("quiz"), null), set: v => writeJSON(K("quiz"), v), clear: () => removeKey(K("quiz")) };

  // Per-question stats { [id]: {c: correct, w: wrong} }, attempt history, bookmarks
  let stats = {}, history = [], bookmarks = new Set();
  const saveStats = () => writeJSON(K("stats"), stats);
  const saveHistory = () => writeJSON(K("history"), history);
  const saveBookmarks = () => writeJSON(K("bookmarks"), [...bookmarks]);

  // Psychology of Learning used these keys before the site had several subjects
  (function migrateOldKeys() {
    const map = { "pol-quiz-v1": "quiz", "pol-stats": "stats", "pol-history": "history", "pol-bookmarks": "bookmarks" };
    Object.keys(map).forEach(old => {
      const nk = "mp:psychology_of_learning:" + map[old];
      try { if (localStorage.getItem(old) != null && localStorage.getItem(nk) == null) localStorage.setItem(nk, localStorage.getItem(old)); localStorage.removeItem(old); } catch (e) {}
    });
  })();

  // ---------- Theme toggle: black (dark) by default ----------
  const themeBtn = document.getElementById("themeBtn");
  const root = document.documentElement;
  const isLight = () => root.getAttribute("data-theme") === "light";
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    themeBtn.textContent = t === "light" ? "Dark mode" : "Light mode";
    try { localStorage.setItem("mp-theme", t); } catch (e) {}
  }
  themeBtn.onclick = () => setTheme(isLight() ? "dark" : "light");
  let savedTheme = "dark";
  try { savedTheme = localStorage.getItem("mp-theme") || localStorage.getItem("pol-theme") || "dark"; } catch (e) {}
  setTheme(savedTheme === "light" ? "light" : "dark");

  // ---------- Instant answer switch ----------
  const instantBtn = document.getElementById("instantBtn");
  let instant = readJSON("mp-instant", false) === true;
  function setInstant(on) {
    instant = on;
    instantBtn.setAttribute("aria-checked", String(on));
    instantBtn.title = on ? "Instant answer is on: the answer and explanation show as soon as you tap an option" : "Instant answer is off: answers are shown at the end";
    writeJSON("mp-instant", on);
  }
  instantBtn.onclick = () => {
    setInstant(!instant);
    if (run && !run.done && app.querySelector(".opts")) renderQuestion();
  };
  setInstant(instant);

  const perWeek = w => QUESTIONS.filter(q => q.w === w).length;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtTime = ms => { const t = Math.round((ms || 0) / 1000); const m = Math.floor(t / 60), s = t % 60; return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0"); };
  const BM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';

  function weakIds() {
    return QUESTIONS.map((q, id) => id).filter(id => {
      const s = stats[id]; if (!s || !s.w) return false;
      return s.c / (s.c + s.w) < 0.6;
    });
  }

  // ---------- State ----------
  let settings = { weeks: [], count: "all", shuffleQ: true, shuffleO: true };
  let run = null; // { items:[{id, order}], answers:[displayIdx|null], locked:[bool], i, done, elapsed, label }

  function buildRun(ids, opts) {
    opts = opts || {};
    let list = ids.slice();
    if (settings.shuffleQ) list = shuffle(list);
    const count = opts.all ? "all" : settings.count;
    if (count !== "all") list = list.slice(0, Number(count));
    const items = list.map(id => {
      const n = QUESTIONS[id].o.length;
      const base = [...Array(n).keys()];
      const isTF = n === 2 && /^true$/i.test(QUESTIONS[id].o[0]);
      return { id, order: settings.shuffleO && !isTF ? shuffle(base) : base };
    });
    run = { items, answers: items.map(() => null), locked: items.map(() => false), i: 0, done: false, elapsed: 0, label: opts.label || "Practice" };
    save();
  }
  function save() { store.set({ settings, run }); }

  // ---------- Timer (counts only while a question is on screen) ----------
  let lastTick = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = now - lastTick; lastTick = now;
    if (!run || run.done || !app.querySelector(".opts") || document.hidden) return;
    run.elapsed = (run.elapsed || 0) + Math.min(dt, 5000);
    const el = document.getElementById("timer");
    if (el) el.textContent = fmtTime(run.elapsed);
    if (Math.floor(run.elapsed / 1000) % 5 === 0) save();
  }, 1000);

  // ---------- Start screen ----------
  function renderStart() {
    const saved = store.get();
    const canResume = saved && saved.run && !saved.run.done && saved.run.items && saved.run.items.length;
    const answeredSaved = canResume ? saved.run.answers.filter(a => a !== null).length : 0;
    const seen = Object.keys(stats).filter(id => QUESTIONS[id]).length;
    let c = 0, w = 0; Object.values(stats).forEach(s => { c += s.c || 0; w += s.w || 0; });
    const acc = c + w ? Math.round((c / (c + w)) * 100) : 0;
    const best = history.length ? Math.max(...history.map(h => h.score)) : 0;
    const weak = weakIds();
    const bms = [...bookmarks].filter(id => QUESTIONS[id]);

    app.innerHTML = `
      <section class="hero">
        <button class="linkish back" id="backHome" type="button">← All subjects</button>
        <span class="eyebrow">NPTEL · ${esc(subject.institute)}</span>
        <h1>${esc(subject.name)}</h1>
        <p>Practise all <b>${QUESTIONS.length}</b> assignment questions one at a time, with an explanation for every answer. Turn on <b>Instant answer</b> at the top to see the answer as soon as you tap, or leave it off and get your score out of 100 at the end.</p>
        <div class="stats">
          <span><b>${QUESTIONS.length}</b> questions</span>
          <span><b>${WEEKS.length}</b> weeks</span>
          <span><b>${QUESTIONS.filter(q => q.o.length === 2).length}</b> true/false</span>
        </div>
      </section>
      ${canResume ? `
      <div class="resume">
        <p><b>You have a quiz in progress.</b> ${answeredSaved} of ${saved.run.items.length} answered.</p>
        <div class="actions">
          <button class="primary" id="resumeBtn" type="button">Resume</button>
          <button class="secondary" id="discardBtn" type="button">Discard</button>
        </div>
      </div>` : ""}
      <section class="stat4" aria-label="Your progress">
        <div class="tile"><b>${seen}<small style="font-size:.7em;color:var(--muted)">/${QUESTIONS.length}</small></b><span>Questions seen</span></div>
        <div class="tile"><b>${acc}%</b><span>Accuracy</span></div>
        <div class="tile"><b>${history.length}</b><span>Quizzes taken</span></div>
        <div class="tile"><b>${best}</b><span>Best score</span></div>
      </section>
      <section class="panel">
        <div class="field">
          <div class="field-head">
            <h3>Weeks to include</h3>
            <span><button class="linkish" id="allW" type="button">Select all</button> · <button class="linkish" id="noneW" type="button">Clear</button></span>
          </div>
          <div class="chips" id="weekChips">
            ${WEEKS.map(w => `
              <label class="chip"><input type="checkbox" id="wk-${w}" value="${w}" ${settings.weeks.includes(w) ? "checked" : ""}>
              <span>${WEEK_LABEL(w)} <small>${perWeek(w)}</small></span></label>`).join("")}
          </div>
        </div>
        <div class="field">
          <div class="field-head"><h3>How many questions</h3></div>
          <div class="chips count-row" id="countChips">
            ${["10", "25", "50", "all"].map(c => `
              <label class="chip"><input type="radio" name="count" id="cnt-${c}" value="${c}" ${settings.count === c ? "checked" : ""}>
              <span>${c === "all" ? "All selected" : c}</span></label>`).join("")}
          </div>
        </div>
        <div class="toggles">
          <label class="toggle"><input type="checkbox" id="shQ" ${settings.shuffleQ ? "checked" : ""}>
            <div><b>Shuffle questions</b><span>New random order every attempt</span></div></label>
          <label class="toggle"><input type="checkbox" id="shO" ${settings.shuffleO ? "checked" : ""}>
            <div><b>Shuffle options</b><span>A, B, C, D appear in a new order</span></div></label>
        </div>
        <div class="field">
          <button class="primary" id="startBtn" type="button"></button>
          <p class="note">Your progress, bookmarks and history are saved in this browser only.</p>
        </div>
      </section>
      <section class="panel">
        <h3 class="section-title">Revision</h3>
        <div class="rev">
          <div class="revcard">
            <h4>Weak questions <b>${weak.length}</b></h4>
            <p>Questions you get wrong more often than right (under 60% correct).</p>
            <button class="secondary" id="weakBtn" type="button" ${weak.length ? "" : "disabled"}>${weak.length ? "Practise weak questions" : "Nothing to drill yet"}</button>
          </div>
          <div class="revcard">
            <h4>Bookmarked <b>${bms.length}</b></h4>
            <p>Tap the Save button on any question during a quiz to keep it here.</p>
            <button class="secondary" id="bmBtn" type="button" ${bms.length ? "" : "disabled"}>${bms.length ? "Practise bookmarks" : "No bookmarks yet"}</button>
          </div>
        </div>
      </section>
      ${history.length ? `
      <section class="panel">
        <div class="field-head"><h3 class="section-title">Recent quizzes</h3><button class="linkish danger" id="resetBtn" type="button">Reset my progress</button></div>
        <div id="resetConfirm" hidden class="confirm"><p><b>Delete your stats, history and bookmarks?</b> This can't be undone.</p>
          <div class="row"><button class="primary" id="resetYes" type="button">Yes, reset</button><button class="secondary" id="resetNo" type="button">Cancel</button></div></div>
        <div class="hist">
          ${history.slice(0, 8).map(h => `
            <div class="hrow"><span class="when">${esc(h.label || "Practice")} · ${new Date(h.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${new Date(h.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
            <span>${h.correct}/${h.total} · ${fmtTime(h.ms)}</span><b>${h.score}</b></div>`).join("")}
        </div>
      </section>` : ""}`;

    const startBtn = document.getElementById("startBtn");
    function readSettings() {
      settings.weeks = [...app.querySelectorAll("#weekChips input:checked")].map(i => Number(i.value));
      settings.count = (app.querySelector("#countChips input:checked") || {}).value || "all";
      settings.shuffleQ = document.getElementById("shQ").checked;
      settings.shuffleO = document.getElementById("shO").checked;
      const pool = QUESTIONS.filter(q => settings.weeks.includes(q.w)).length;
      const n = settings.count === "all" ? pool : Math.min(pool, Number(settings.count));
      startBtn.textContent = pool ? `Start quiz · ${n} question${n === 1 ? "" : "s"}` : "Pick at least one week";
      startBtn.disabled = !pool;
    }
    app.querySelector(".panel:not(.stat4)").addEventListener("change", readSettings);
    document.getElementById("allW").onclick = () => { app.querySelectorAll("#weekChips input").forEach(i => i.checked = true); readSettings(); };
    document.getElementById("noneW").onclick = () => { app.querySelectorAll("#weekChips input").forEach(i => i.checked = false); readSettings(); };
    startBtn.onclick = () => {
      readSettings();
      const ids = QUESTIONS.map((q, id) => id).filter(id => settings.weeks.includes(QUESTIONS[id].w));
      const label = settings.weeks.length === WEEKS.length ? "All weeks" : settings.weeks.length === 1 ? WEEK_LABEL(settings.weeks[0]) : settings.weeks.length + " weeks";
      buildRun(ids, { label });
      renderQuestion();
    };
    document.getElementById("weakBtn").onclick = () => { buildRun(weakIds(), { all: true, label: "Weak questions" }); renderQuestion(); };
    document.getElementById("bmBtn").onclick = () => { buildRun([...bookmarks].filter(id => QUESTIONS[id]), { all: true, label: "Bookmarks" }); renderQuestion(); };
    if (canResume) {
      document.getElementById("resumeBtn").onclick = () => { settings = saved.settings || settings; run = saved.run; run.locked = run.locked || run.items.map(() => false); renderQuestion(); };
      document.getElementById("discardBtn").onclick = () => { store.clear(); renderStart(); };
    }
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      const box = document.getElementById("resetConfirm");
      resetBtn.onclick = () => { box.hidden = false; };
      document.getElementById("resetNo").onclick = () => { box.hidden = true; };
      document.getElementById("resetYes").onclick = () => {
        stats = {}; history = []; bookmarks = new Set();
        saveStats(); saveHistory(); saveBookmarks(); renderStart();
      };
    }
    document.getElementById("backHome").onclick = goHome;
    readSettings();
  }

  // ---------- Home: pick a subject ----------
  function subjectSummary(sj) {
    const st = readJSON("mp:" + storeId(sj) + ":stats", {});
    const hist = readJSON("mp:" + storeId(sj) + ":history", []);
    let c = 0, w = 0; Object.values(st).forEach(s => { c += s.c || 0; w += s.w || 0; });
    const saved = readJSON("mp:" + storeId(sj) + ":quiz", null);
    const inProgress = !!(saved && saved.run && !saved.run.done);
    return { seen: Object.keys(st).length, acc: c + w ? Math.round((c / (c + w)) * 100) : null, taken: hist.length, inProgress };
  }
  function renderHome() {
    subject = null; run = null;
    setSubtitle("");
    const total = SUBJECTS.reduce((n, sj) => n + sj.questions.length, 0);
    app.innerHTML = `
      <section class="hero">
        <span class="eyebrow">NPTEL assignment practice</span>
        <h1>MOOC <em>Practice</em></h1>
        <p>Pick a subject and practise every weekly assignment question, with shuffled questions and options, instant answers, explanations and a score out of 100.</p>
        <div class="stats"><span><b>${SUBJECTS.length}</b> subjects</span><span><b>${total}</b> questions</span></div>
      </section>
      <section class="subjects">
        ${SUBJECTS.map(sj => {
          const sm = subjectSummary(sj);
          const weeks = [...new Set(sj.questions.map(q => q.w))].sort((a, b) => a - b);
          return `
          <button class="subj" type="button" data-id="${sj.id}">
            <span class="subj-badge">${esc(sj.short)}</span>
            <span class="subj-body">
              <span class="subj-name">${esc(sj.name)}</span>
              <span class="subj-meta">${esc(sj.institute)} · Weeks ${weeks[0]}–${weeks[weeks.length - 1]} · ${sj.questions.length} questions</span>
              <span class="subj-prog">${sm.inProgress ? `<b>Quiz in progress</b> · ` : ""}${sm.seen}/${sj.questions.length} seen${sm.acc === null ? "" : ` · ${sm.acc}% accuracy`}${sm.taken ? ` · ${sm.taken} quiz${sm.taken === 1 ? "" : "zes"}` : ""}</span>
            </span>
            <span class="subj-go" aria-hidden="true">→</span>
          </button>`;
        }).join("")}
      </section>`;
    app.querySelectorAll(".subj").forEach(b => b.onclick = () => openSubject(b.dataset.id, true));
  }

  // ---------- Answers: a question has one correct option (a: number) or several (a: [numbers]) ----------
  const isMulti = q => Array.isArray(q.a);
  const correctSet = q => (isMulti(q) ? q.a : [q.a]);
  const correctDs = (it, q) => correctSet(q).map(a => it.order.indexOf(a)).sort((x, y) => x - y);
  const selDs = sel => (sel === null || sel === undefined ? [] : Array.isArray(sel) ? sel : [sel]);
  function isRight(it, q, sel) {
    const got = selDs(sel).map(d => it.order[d]).sort((x, y) => x - y);
    const want = correctSet(q).slice().sort((x, y) => x - y);
    return got.length === want.length && got.every((v, i) => v === want[i]);
  }
  const lettersOf = ds => ds.map(d => LETTERS[d]).join(", ");

  // ---------- Question screen ----------
  function correctCount() {
    return run.items.reduce((n, it, k) => n + (run.answers[k] !== null && run.locked[k] && isRight(it, QUESTIONS[it.id], run.answers[k]) ? 1 : 0), 0);
  }
  function feedbackHTML(q, it, sel) {
    const ok = isRight(it, q, sel);
    const cds = correctDs(it, q);
    const mine = selDs(sel);
    const chosen = mine.length === 1 ? it.order[mine[0]] : null;
    return `
      <div class="fb ${ok ? "ok" : ""}" role="status">
        <span class="fb-title">${ok ? "Correct" : "Incorrect"}</span>
        ${ok ? "" : `<p><span class="pill">Correct answer${cds.length > 1 ? "s" : ""}: ${lettersOf(cds)}</span>${cds.map(d => esc(q.o[it.order[d]])).join("; ")}</p>`}
        <p><b>Explanation:</b> ${esc(q.why || "")}</p>
        ${ok || chosen === null || !q.x || !q.x[chosen] ? "" : `<p><b>Explanation of ${LETTERS[mine[0]]} (your answer):</b> ${esc(q.x[chosen])}</p>`}
      </div>`;
  }
  function renderQuestion(showConfirm) {
    const total = run.items.length;
    const it = run.items[run.i];
    const q = QUESTIONS[it.id];
    const sel = run.answers[run.i];
    const multi = isMulti(q);
    if (instant && sel !== null && !multi) run.locked[run.i] = true;
    const reveal = sel !== null && run.locked[run.i];
    const cds = correctDs(it, q);
    const mine = selDs(sel);
    const answered = run.answers.filter(a => a !== null).length;
    const last = run.i === total - 1;
    const unanswered = total - answered;
    const marked = bookmarks.has(it.id);

    app.innerHTML = `
      <section class="progress" aria-label="Progress">
        <div class="progress-meta"><span class="mono">${esc(run.label || "Practice")} · Q ${run.i + 1}/${total}</span><span class="mono">Time <span id="timer">${fmtTime(run.elapsed)}</span></span></div>
        <div class="bar"><i style="width:${(answered / total) * 100}%"></i></div>
      </section>
      <article class="card">
        <div class="qhead">
          <div class="qmeta"><span class="tag">${WEEK_LABEL(q.w)}</span>
            <button class="bm" id="bmToggle" type="button" aria-pressed="${marked}">${BM_ICON}${marked ? "Saved" : "Save"}</button></div>
          ${instant ? `<span class="score-so-far">${correctCount()} correct so far</span>` : `<span class="qnum mono">${String(run.i + 1).padStart(2, "0")}</span>`}
        </div>
        <div class="qtext" id="qtext">${esc(q.q)}</div>
        ${multi ? `<span class="msq">Select all that apply</span>` : ""}
        <div class="opts ${multi ? "multi" : ""}" role="${multi ? "group" : "radiogroup"}" aria-labelledby="qtext">
          ${it.order.map((oi, di) => {
            const isC = cds.includes(di), isMine = mine.includes(di);
            const cls = reveal ? (isC ? "is-right" : isMine ? "is-wrong" : "") : "";
            const mark = reveal ? (isC ? (isMine || !multi ? "Correct" : "Missed") : isMine ? "Your answer" : "") : "";
            return `
            <button type="button" class="opt ${cls}" role="${multi ? "checkbox" : "radio"}" id="opt-${di}" data-d="${di}" aria-checked="${isMine}" ${reveal ? "disabled" : ""}>
              <span class="key">${LETTERS[di]}</span><span class="txt">${esc(q.o[oi])}</span>${mark ? `<span class="mark">${mark}</span>` : ""}
            </button>`;
          }).join("")}
        </div>
        ${instant && multi && !reveal ? `<button class="primary" id="checkBtn" type="button" ${sel === null ? "disabled" : ""}>Check answer</button>` : ""}
        ${reveal ? feedbackHTML(q, it, sel) : ""}
        ${showConfirm ? `
        <div class="confirm" role="alert">
          <p><b>${unanswered} question${unanswered === 1 ? " is" : "s are"} still unanswered.</b> Unanswered questions count as wrong.</p>
          <div class="row">
            <button class="primary" id="finishAnyway" type="button">Finish and see score</button>
            <button class="secondary" id="gotoFirst" type="button">Go to first unanswered</button>
          </div>
        </div>` : ""}
        <div class="nav">
          <button class="secondary" id="prevBtn" type="button" ${run.i === 0 ? "disabled" : ""}>Previous</button>
          <div class="right">
            ${last ? "" : `<button class="ghost" id="endBtn" type="button">Finish now</button>`}
            <button class="primary" id="nextBtn" type="button">${last ? "Finish quiz" : sel === null ? "Skip" : "Next"}</button>
          </div>
        </div>
        <span class="hint">${instant ? (multi ? "Instant answer is on: pick every correct option, then tap Check answer." : "Instant answer is on: tap an option to see if it's right.") : "Tip: press A–D or 1–4 to choose, Enter for next."}</span>
      </article>
      <div><button class="linkish" id="quitBtn" type="button">Quit to start screen</button></div>`;

    app.querySelectorAll(".opt").forEach(b => b.onclick = () => choose(Number(b.dataset.d)));
    const checkBtn = document.getElementById("checkBtn");
    if (checkBtn) checkBtn.onclick = () => {
      if (run.answers[run.i] === null) return;
      run.locked[run.i] = true; save(); renderQuestion();
      const fb = app.querySelector(".fb");
      if (fb && fb.getBoundingClientRect().bottom > window.innerHeight) fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    document.getElementById("prevBtn").onclick = () => go(run.i - 1);
    document.getElementById("nextBtn").onclick = next;
    const endBtn = document.getElementById("endBtn");
    if (endBtn) endBtn.onclick = tryFinish;
    document.getElementById("quitBtn").onclick = () => { save(); renderStart(); };
    document.getElementById("bmToggle").onclick = () => {
      if (bookmarks.has(it.id)) bookmarks.delete(it.id); else bookmarks.add(it.id);
      saveBookmarks();
      const b = document.getElementById("bmToggle"), on = bookmarks.has(it.id);
      b.setAttribute("aria-pressed", String(on)); b.innerHTML = BM_ICON + (on ? "Saved" : "Save");
    };
    if (showConfirm) {
      document.getElementById("finishAnyway").onclick = finish;
      document.getElementById("gotoFirst").onclick = () => go(run.answers.findIndex(a => a === null));
    }
  }
  function choose(d) {
    if (run.locked[run.i]) return;
    if (isMulti(QUESTIONS[run.items[run.i].id])) {
      const cur = selDs(run.answers[run.i]);
      const nextSel = cur.includes(d) ? cur.filter(x => x !== d) : cur.concat(d).sort((x, y) => x - y);
      run.answers[run.i] = nextSel.length ? nextSel : null;
      save();
      app.querySelectorAll(".opt").forEach(b => b.setAttribute("aria-checked", String(nextSel.includes(Number(b.dataset.d)))));
      const cb = document.getElementById("checkBtn"); if (cb) cb.disabled = !nextSel.length;
      const nb0 = document.getElementById("nextBtn");
      if (nb0 && run.i !== run.items.length - 1) nb0.textContent = nextSel.length ? "Next" : "Skip";
      const answered0 = run.answers.filter(a => a !== null).length;
      app.querySelector(".bar i").style.width = (answered0 / run.items.length) * 100 + "%";
      return;
    }
    run.answers[run.i] = d;
    if (instant) {
      run.locked[run.i] = true; save();
      renderQuestion();
      const fb = app.querySelector(".fb");
      if (fb && fb.getBoundingClientRect().bottom > window.innerHeight) fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    save();
    app.querySelectorAll(".opt").forEach(b => b.setAttribute("aria-checked", String(Number(b.dataset.d) === d)));
    const nb = document.getElementById("nextBtn");
    if (nb && nb.textContent === "Skip") nb.textContent = "Next";
    const answered = run.answers.filter(a => a !== null).length;
    app.querySelector(".bar i").style.width = (answered / run.items.length) * 100 + "%";
  }
  function go(i) { if (i < 0 || i >= run.items.length) return; run.i = i; save(); renderQuestion(); window.scrollTo({ top: 0 }); }
  function next() { if (run.i === run.items.length - 1) tryFinish(); else go(run.i + 1); }
  function tryFinish() {
    if (run.answers.some(a => a === null)) { renderQuestion(true); document.querySelector(".confirm").scrollIntoView({ block: "center" }); }
    else finish();
  }

  // ---------- Results ----------
  function finish() {
    run.done = true;
    if (!run.recorded) {
      const g = grade();
      g.forEach(x => {
        if (x.skipped) return;
        const s = stats[x.it.id] || (stats[x.it.id] = { c: 0, w: 0 });
        if (x.ok) s.c++; else s.w++;
      });
      const correct = g.filter(x => x.ok).length;
      history.unshift({ at: Date.now(), label: run.label || "Practice", correct, total: g.length, score: Math.round((correct / g.length) * 1000) / 10, ms: run.elapsed || 0 });
      history = history.slice(0, 50);
      saveStats(); saveHistory();
      run.recorded = true;
    }
    save();
    renderResults("wrong");
    window.scrollTo({ top: 0 });
  }
  function grade() {
    return run.items.map((it, k) => {
      const q = QUESTIONS[it.id];
      const d = run.answers[k];
      return { k, q, it, d, cds: correctDs(it, q), mine: selDs(d), ok: isRight(it, q, d), skipped: d === null };
    });
  }
  function whyHTML(x) {
    const q = x.q;
    const chosen = x.mine.length === 1 ? x.it.order[x.mine[0]] : null;
    const right = correctSet(q);
    const others = x.it.order.map((oi, di) => ({ oi, di })).filter(o => !right.includes(o.oi) && o.oi !== chosen && q.x && q.x[o.oi]);
    return `
      <div class="why">
        <p><span class="wl g">Explanation · ${lettersOf(x.cds)} ${x.cds.length > 1 ? "are" : "is"} correct</span>${esc(q.why || "")}</p>
        ${!x.ok && chosen !== null && !right.includes(chosen) && q.x && q.x[chosen] ? `<p><span class="wl r">Explanation · your answer ${LETTERS[x.mine[0]]} is wrong</span>${esc(q.x[chosen])}</p>` : ""}
        ${others.length ? `<details><summary>Explanation of the other options</summary><ul>${others.map(o => `<li><b>${LETTERS[o.di]}.</b> ${esc(q.x[o.oi])}</li>`).join("")}</ul></details>` : ""}
      </div>`;
  }
  function renderResults(tab) {
    const g = grade();
    const total = g.length;
    const correct = g.filter(x => x.ok).length;
    const skipped = g.filter(x => x.skipped).length;
    const wrong = total - correct - skipped;
    const pct = total ? (correct / total) * 100 : 0;
    const score = Math.round(pct * 10) / 10;
    const C = 2 * Math.PI * 64;
    const verdict = pct >= 90 ? "Excellent work" : pct >= 75 ? "Well done" : pct >= 50 ? "Good effort, keep going" : "Keep practising";
    const misses = g.filter(x => !x.ok);
    const shown = tab === "all" ? g : misses;

    app.innerHTML = `
      <section class="card">
        <div class="score">
          <div class="ring" aria-label="Score ${score} out of 100">
            <svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="64" fill="none" stroke="var(--line)" stroke-width="12"/>
              <circle cx="75" cy="75" r="64" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round"
                stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/></svg>
            <div class="val"><div><b>${score}</b><small>out of 100</small></div></div>
          </div>
          <div class="verdict">
            <span class="eyebrow">${esc(run.label || "Your result")}</span>
            <h2>${verdict}</h2>
            <p>You got <b>${correct}</b> correct out of <b>${total}</b> questions in <b>${fmtTime(run.elapsed)}</b>.</p>
          </div>
        </div>
        <div class="tally">
          <div class="tile good"><b>${correct}</b><span>Correct</span></div>
          <div class="tile bad"><b>${wrong}</b><span>Wrong</span></div>
          <div class="tile"><b>${skipped}</b><span>Skipped</span></div>
        </div>
        <div class="actions">
          ${misses.length ? `<button class="primary" id="retryWrong" type="button">Retry my ${misses.length} mistake${misses.length === 1 ? "" : "s"}</button>` : ""}
          <button class="secondary" id="again" type="button">New shuffled attempt</button>
          <button class="secondary" id="settingsBtn" type="button">Back to start</button>
        </div>
      </section>
      <section class="review-wrap" style="display:flex;flex-direction:column;gap:14px">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" id="tab-wrong" aria-selected="${tab !== "all"}" type="button">Wrong answers (${misses.length})</button>
          <button class="tab" role="tab" id="tab-all" aria-selected="${tab === "all"}" type="button">All questions (${total})</button>
        </div>
        ${tab !== "all" && misses.length ? `
        <div class="save-all">
          <span>${misses.filter(x => bookmarks.has(x.it.id)).length} of ${misses.length} saved to Bookmarks</span>
          <button class="secondary" id="saveAllWrong" type="button" ${misses.every(x => bookmarks.has(x.it.id)) ? "disabled" : ""}>${misses.every(x => bookmarks.has(x.it.id)) ? "All wrong answers saved" : "Save all wrong answers"}</button>
        </div>` : ""}
        <div class="review">
          ${shown.length ? shown.map(x => `
            <div class="ritem ${x.ok ? "ok" : ""}">
              <div class="meta"><span>Q${x.k + 1}</span><span>·</span><span>${WEEK_LABEL(x.q.w)}</span><span>·</span><span>${x.ok ? "Correct" : x.skipped ? "Skipped" : "Wrong"}</span>
                <button class="bm rbm" type="button" data-id="${x.it.id}" aria-pressed="${bookmarks.has(x.it.id)}">${BM_ICON}${bookmarks.has(x.it.id) ? "Saved" : "Save"}</button></div>
              <div class="rq">${esc(x.q.q)}${isMulti(x.q) ? ` <span class="msq">Select all that apply</span>` : ""}</div>
              <div class="ropts">
                ${x.it.order.map((oi, di) => {
                  const isC = x.cds.includes(di), isMine = x.mine.includes(di);
                  const cls = isC ? "right" : isMine ? "wrong" : "";
                  const tag = isC ? (isMine ? "Your answer · Correct" : "Correct answer") : isMine ? "Your answer" : "";
                  return `<div class="ropt ${cls}"><span class="key">${LETTERS[di]}</span><span class="txt">${esc(x.q.o[oi])}</span>${tag ? `<span class="rtag">${tag}</span>` : ""}</div>`;
                }).join("")}
              </div>
              ${x.skipped ? `<div class="ans skip"><span class="lbl">Skipped</span><span>You did not answer this question.</span></div>` : ""}
              ${whyHTML(x)}
            </div>`).join("")
          : `<div class="empty">No wrong answers. Every question was correct.</div>`}
        </div>
      </section>`;

    document.getElementById("tab-wrong").onclick = () => renderResults("wrong");
    app.querySelectorAll(".rbm").forEach(b => b.onclick = () => {
      const id = Number(b.dataset.id);
      if (bookmarks.has(id)) bookmarks.delete(id); else bookmarks.add(id);
      saveBookmarks();
      const y = window.scrollY; renderResults(tab); window.scrollTo({ top: y });
    });
    const saveAll = document.getElementById("saveAllWrong");
    if (saveAll) saveAll.onclick = () => {
      misses.forEach(x => bookmarks.add(x.it.id));
      saveBookmarks();
      const y = window.scrollY; renderResults(tab); window.scrollTo({ top: y });
    };
    document.getElementById("tab-all").onclick = () => renderResults("all");
    const rw = document.getElementById("retryWrong");
    if (rw) rw.onclick = () => {
      buildRun(misses.map(x => x.it.id), { all: true, label: "Retry mistakes" });
      renderQuestion(); window.scrollTo({ top: 0 });
    };
    document.getElementById("again").onclick = () => {
      const ids = QUESTIONS.map((q, id) => id).filter(id => settings.weeks.includes(QUESTIONS[id].w));
      buildRun(ids, { label: run.label }); renderQuestion(); window.scrollTo({ top: 0 });
    };
    document.getElementById("settingsBtn").onclick = () => { store.clear(); run = null; renderStart(); window.scrollTo({ top: 0 }); };
  }

  // ---------- Navigation between subjects ----------
  const subtitleEl = document.getElementById("brandSub");
  function setSubtitle(t) { if (subtitleEl) { subtitleEl.textContent = t; subtitleEl.hidden = !t; } }
  function leaveQuiz() {
    if (!subject) return;
    if (run && !run.done) save();
    else if (run && run.done) store.clear();
  }
  function setHash(h) {
    if (location.hash.replace("#", "") === h) return;
    try { window.history.pushState(null, "", h ? "#" + h : location.pathname + location.search); }
    catch (e) { try { location.hash = h; } catch (e2) {} }
  }
  function openSubject(id, push) {
    const sj = SUBJECTS.find(x => x.id === id);
    if (!sj) { renderHome(); return; }
    leaveQuiz();
    subject = sj;
    QUESTIONS = sj.questions;
    WEEKS = [...new Set(QUESTIONS.map(q => q.w))].sort((a, b) => a - b);
    stats = readJSON(K("stats"), {});
    history = readJSON(K("history"), []);
    bookmarks = new Set(readJSON(K("bookmarks"), []));
    settings = { weeks: WEEKS.slice(), count: "all", shuffleQ: true, shuffleO: true };
    run = null;
    const saved = store.get();
    if (saved && saved.settings) settings = Object.assign(settings, saved.settings, { weeks: (saved.settings.weeks || WEEKS).filter(w => WEEKS.includes(w)) });
    if (!settings.weeks.length) settings.weeks = WEEKS.slice();
    setSubtitle(sj.name);
    if (push) setHash(sj.id);
    if (saved && saved.run && saved.run.done) { run = saved.run; renderResults("wrong"); }
    else renderStart();
    window.scrollTo({ top: 0 });
  }
  function goHome() {
    leaveQuiz();
    setHash("");
    renderHome();
    window.scrollTo({ top: 0 });
  }

  // Logo goes to the subject list (an unfinished quiz is saved and can be resumed)
  document.getElementById("homeBtn").onclick = goHome;
  window.addEventListener("popstate", route);
  window.addEventListener("hashchange", route);
  function route() {
    const id = location.hash.replace("#", "");
    if (subject && subject.id === id) return;
    if (id && SUBJECTS.some(x => x.id === id)) openSubject(id, false);
    else if (subject) { leaveQuiz(); renderHome(); }
  }

  // Keyboard shortcuts on the question screen
  document.addEventListener("keydown", e => {
    if (!run || run.done || !app.querySelector(".opts")) return;
    if (e.target.matches && e.target.matches("input, textarea")) return;
    const k = e.key.toUpperCase();
    const n = run.items[run.i].order.length;
    let d = LETTERS.indexOf(k);
    if (d < 0 && /^[1-9]$/.test(k)) d = Number(k) - 1;
    if (d >= 0 && d < n && !e.metaKey && !e.ctrlKey) { e.preventDefault(); choose(d); return; }
    const onButton = e.target.closest && e.target.closest("button");
    if (e.key === "Enter" && !onButton) { e.preventDefault(); next(); }
    if (e.key === "ArrowRight" && !onButton) next();
    if (e.key === "ArrowLeft" && !onButton) go(run.i - 1);
  });

  // Boot: open the subject named in the link (#subject_id), else the subject list
  const startId = location.hash.replace("#", "");
  if (startId && SUBJECTS.some(x => x.id === startId)) openSubject(startId, false);
  else renderHome();
})();
