function renderToday() {
  const now = new Date();
  document.getElementById('today-date-display').textContent =
    now.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  document.getElementById('today-weekday-display').textContent =
    now.toLocaleDateString('en', { weekday: 'long' }).toUpperCase();

  const streak = calcStreak();
  const streakPill = document.getElementById('today-streak-pill');
  if (streak > 0) {
    streakPill.style.display = 'inline-flex';
    document.getElementById('today-streak-num').textContent = streak;
  } else {
    streakPill.style.display = 'none';
  }

  const body = document.getElementById('today-body');
  body.innerHTML = '';

  // ── WORKOUT SECTION ──
  const todayIdx = todayWorkoutDayIdx();
  const d = WORKOUTS[todayIdx];
  const pct = woDayPct(todayIdx);
  const woSection = document.createElement('div');
  woSection.className = 'ts';

  const exRows = d.exercises.slice(0, 5).map(ex => {
    const anyDone = Array.from({length: ex.sets}, (_, i) =>
      S.logs[wKey(S.woWeek, todayIdx, ex.id, i+1)]?.done
    ).some(Boolean);
    return `<div class="today-ex-row">
      <div class="today-ex-dot${anyDone?' done':''}"></div>
      <div class="today-ex-name">${ex.name}</div>
      <div class="today-ex-sets">${ex.sets} × ${ex.target}</div>
    </div>`;
  }).join('');

  const moreCount = d.exercises.length - 5;

  woSection.innerHTML = `
    <div class="ts-hdr">
      <div class="ts-title">💪 Workout</div>
      <button class="ts-link" onclick="switchTab('workout')">Full view →</button>
    </div>
    <div class="ts-body">
      <div class="today-wo-top">
        <div class="today-wo-emoji">${d.emoji}</div>
        <div class="today-wo-info">
          <div class="today-wo-tag" style="color:${d.color}">Day ${d.day} — ${d.name} · ${d.label}</div>
          <div class="today-wo-name">${d.label.toUpperCase()} DAY</div>
          <div class="today-wo-note">${d.note}</div>
        </div>
        <div class="today-wo-pct">
          <div class="today-wo-pct-num" style="color:${pct===100?'var(--green)':d.color}">${pct}%</div>
          <div class="today-wo-pct-lbl">DONE</div>
        </div>
      </div>
      <div class="today-ex-list">${exRows}${moreCount>0?`<div style="font-size:10px;color:var(--muted);text-align:center;padding:4px">+${moreCount} more exercises</div>`:''}</div>
      <div class="today-wo-prog"><div class="today-wo-prog-fill" style="width:${pct}%;background:${pct===100?'var(--green)':d.color}"></div></div>
      <button class="today-see-all" onclick="switchTab('workout')">SEE FULL WORKOUT →</button>
    </div>`;
  body.appendChild(woSection);

  // ── MEALS SECTION ──
  const meals = getActiveMeals();
  const mealDay = meals[todayWorkoutDayIdx()];
  const mlSection = document.createElement('div');
  mlSection.className = 'ts';
  const slots = [
    { key:'breakfast', label:'☀️ B\'FAST' },
    { key:'lunch',     label:'🌤 LUNCH'  },
    { key:'dinner',    label:'🌙 DINNER' },
  ];
  const mealRows = slots.map(slot => {
    const meal = getMeal(todayWorkoutDayIdx(), slot.key);
    const k = mlKey(S.mlWeek, todayWorkoutDayIdx(), slot.key);
    const eaten = !!S.mealLogs[k];
    return `<div class="today-meal-pill${eaten?' eaten':''}" data-k="${k}">
      <div class="today-meal-slot">${slot.label}</div>
      <div class="today-meal-chk"></div>
      <div class="today-meal-name">${meal.name}</div>
    </div>`;
  }).join('');

  mlSection.innerHTML = `
    <div class="ts-hdr">
      <div class="ts-title">🥗 Meals</div>
      <button class="ts-link" onclick="switchTab('meals')">Full view →</button>
    </div>
    <div class="ts-body">${mealRows}</div>`;

  mlSection.querySelectorAll('.today-meal-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const k = pill.dataset.k;
      if (S.mealLogs[k]) { delete S.mealLogs[k]; } else { S.mealLogs[k] = true; }
      save(); renderToday();
      if (navigator.vibrate) navigator.vibrate(8);
    });
  });
  body.appendChild(mlSection);

  // ── TASKS SECTION ──
  const todayTasks = tasksDueOnDate(todayStr());
  if (todayTasks.length > 0) {
    const taskSection = document.createElement('div');
    taskSection.className = 'ts';
    const catColors = { daily:'#4ec94e', weekly:'#f39c12', monthly:'#7b9ef0', once:'#e74c3c' };
    const sorted = [...todayTasks].sort((a, b) => {
      const ad = isTaskDone(a, todayStr()) ? 1 : 0;
      const bd = isTaskDone(b, todayStr()) ? 1 : 0;
      if (ad !== bd) return ad - bd;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1; if (b.time) return 1;
      return 0;
    });
    const taskRows = sorted.map(task => {
      const done = isTaskDone(task, todayStr());
      return `<div class="today-task-pill${done?' done':''}" data-id="${task.id}">
        <div class="today-task-chk"></div>
        <div class="today-task-dot" style="background:${catColors[task.cat]}"></div>
        <div class="today-task-name">${task.title}</div>
        ${task.time ? `<div class="today-task-time">${task.time}</div>` : ''}
      </div>`;
    }).join('');

    taskSection.innerHTML = `
      <div class="ts-hdr">
        <div class="ts-title">📅 Tasks</div>
        <button class="ts-link" onclick="switchTab('schedule')">Full view →</button>
      </div>
      <div class="ts-body">${taskRows}</div>`;

    taskSection.querySelectorAll('.today-task-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const id = pill.dataset.id;
        const task = S.tasks.find(t => t.id === id);
        if (!task) return;
        if (!S.taskDone) S.taskDone = {};
        const k = id + '-' + todayStr();
        S.taskDone[k] = !S.taskDone[k];
        save(); renderToday(); updateSchedBadge();
        if (navigator.vibrate) navigator.vibrate(8);
      });
    });
    body.appendChild(taskSection);
  }

  // ── PINNED NOTES SECTION ──
  const pinned = S.notes.filter(n => n.pinned);
  if (pinned.length > 0) {
    const noteSection = document.createElement('div');
    noteSection.className = 'ts';
    const noteCards = pinned.map(note => {
      const preview = (note.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
      const tags = (note.tags || []).map(t => `<span class="today-ntag">${t}</span>`).join('');
      return `<div class="today-note-card" data-id="${note.id}">
        <div class="today-note-hdr"><span>📌</span><div class="today-note-title">${note.title || 'Untitled'}</div></div>
        ${preview ? `<div class="today-note-preview">${preview}</div>` : ''}
        ${tags ? `<div class="today-note-tags">${tags}</div>` : ''}
      </div>`;
    }).join('');

    noteSection.innerHTML = `
      <div class="ts-hdr">
        <div class="ts-title">📌 Pinned Notes</div>
        <button class="ts-link" onclick="switchTab('notes')">All notes →</button>
      </div>
      <div class="ts-body">${noteCards}</div>`;

    noteSection.querySelectorAll('.today-note-card').forEach(card => {
      card.addEventListener('click', () => {
        switchTab('notes');
        setTimeout(() => openNoteEditor(card.dataset.id), 50);
      });
    });
    body.appendChild(noteSection);
  }
  try{renderChallengeStrip();}catch(e){}
}

// ═══════════════════════════════════════════════════
// QUICK-ADD
// ═══════════════════════════════════════════════════
let qaType = 'task';
let qaCat  = 'daily';

function openQuickAdd() {
  qaType = 'task'; qaCat = 'daily';
  document.getElementById('qa-task-title').value = '';
  document.getElementById('qa-task-time').value  = '';
  document.getElementById('qa-note-title').value = '';
  document.getElementById('qa-note-body').value  = '';
  selectQAType('task');
  ['daily','weekly','monthly','once'].forEach(c =>
    document.getElementById('qa-cat-'+c).classList.toggle('sel', c==='daily')
  );
  document.getElementById('quickadd-modal').classList.add('open');
}

function closeQuickAdd() { document.getElementById('quickadd-modal').classList.remove('open'); }

function selectQAType(type) {
  qaType = type;
  document.getElementById('qa-task-btn').classList.toggle('sel', type==='task');
  document.getElementById('qa-note-btn').classList.toggle('sel', type==='note');
  document.getElementById('qa-task-fields').style.display = type==='task' ? 'block' : 'none';
  document.getElementById('qa-note-fields').style.display = type==='note' ? 'block' : 'none';
}

function selectQACat(c) {
  qaCat = c;
  ['daily','weekly','monthly','once'].forEach(cc =>
    document.getElementById('qa-cat-'+cc).classList.toggle('sel', cc===c)
  );
}

function saveQuickAdd() {
  if (qaType === 'task') {
    const title = document.getElementById('qa-task-title').value.trim();
    if (!title) { toast('Please enter a task title', '#e74c3c'); return; }
    const time = document.getElementById('qa-task-time').value || null;
    S.tasks.push({
      id: Date.now().toString(), title, cat: qaCat, time,
      recurring: qaCat !== 'once', dueDate: todayStr(),
      createdAt: new Date().toISOString()
    });
    toast('✓ Task added');
  } else {
    const title = document.getElementById('qa-note-title').value.trim() || 'Untitled';
    const body  = document.getElementById('qa-note-body').value.trim();
    S.notes.unshift({
      id: Date.now().toString(), title, body, tags: [], pinned: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    toast('✓ Note added');
  }
  save(); closeQuickAdd(); renderToday(); updateSchedBadge();
}

// ═══════════════════════════════════════════════════
// PHASE 7: BODY & PROGRESS TRACKING
// ═══════════════════════════════════════════════════
let activeMeasType = 'waist';

function switchBodyTab(tab) {
  S.bodyTab = tab;
  if (tab === 'measurements') { renderMeasGrid(); renderPhotoGallery(); }
  ['weight','measurements','prs'].forEach(t => {
    document.getElementById('body-'+t+'-section').style.display = t===tab?'block':'none';
    document.getElementById('btab-'+t).classList.toggle('active', t===tab);
  });
  save();
}
