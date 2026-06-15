// ── WEEKLY CHALLENGES ──

const CHALLENGE_META = {
  pushups: { label:'Push-ups', emoji:'💪', color:'var(--teal)' },
  situps:  { label:'Sit-ups',  emoji:'🤸', color:'var(--yellow)' },
  squats:  { label:'Squats',   emoji:'🦵', color:'var(--purple)' },
};

function getWeekMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0,10);
}

function getWeekDates(mondayStr) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayStr + 'T00:00:00');
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0,10));
  }
  return dates;
}

function getChallengeTotalDone(c) {
  return Object.values(c.logs||{}).flat().reduce((a,e)=>a+e.reps,0);
}

function getChallengeWeekDone(c) {
  const dates = getWeekDates(c.weekStart);
  return dates.reduce((a,d)=>a+getChallengeDayDone(c,d),0);
}

function getChallengeDayDone(c, dateStr) {
  return (c.logs[dateStr]||[]).reduce((a,e)=>a+e.reps,0);
}

function getDayTasksTotal(c) {
  return Math.max(1, Math.ceil((c.weeklyGoal / 7) / c.taskSize));
}

function getDayTasksDone(c, dateStr) {
  const entries = (c.logs[dateStr]||[]).filter(e=>!e.bonus);
  return entries.length;
}

function checkWeekReset(c) {
  const monday = getWeekMonday(todayStr());
  if (c.weekStart !== monday) { c.weekStart = monday; }
}

function checkMilestones(c) {
  const total = getChallengeTotalDone(c);
  if (!c.milestonesHit) c.milestonesHit = [];
  let newHit = null;
  c.milestones.forEach(ms => {
    if (total >= ms && !c.milestonesHit.includes(ms)) {
      c.milestonesHit.push(ms);
      newHit = ms;
    }
  });
  if (newHit !== null) {
    const meta = CHALLENGE_META[c.exercise];
    toast(`🎉 Milestone! ${newHit} ${meta.label} done!`, 'var(--teal)');
    if (!c.celebratePending) c.celebratePending = [];
    c.celebratePending.push(newHit);
  }
}

function unlogChallengeReps(key) {
  const c = S.challenges[key];
  if (!c) return;
  const today = todayStr();
  const entries = c.logs[today] || [];
  // Remove the last non-bonus entry
  const lastIdx = entries.map((e,i)=>(!e.bonus?i:-1)).filter(i=>i>=0).pop();
  if (lastIdx === undefined) return;
  entries.splice(lastIdx, 1);
  if (entries.length === 0) delete c.logs[today];
  save();
  renderChallengeStrip();
  renderWorkoutChallengeBanner();
  const overlay = document.getElementById('csheet-overlay');
  if (overlay && overlay.classList.contains('open')) renderChallengeSheet(key);
}

function logChallengeReps(key, reps, bonus) {
  if (!reps || reps < 1) return;
  const c = S.challenges[key];
  if (!c) return;
  checkWeekReset(c);
  const today = todayStr();
  if (!c.logs[today]) c.logs[today] = [];
  c.logs[today].push({ id: Date.now(), reps, bonus: !!bonus });
  checkMilestones(c);
  save();
  renderChallengeStrip();
  renderWorkoutChallengeBanner();
  // Re-render sheet if open
  const overlay = document.getElementById('csheet-overlay');
  if (overlay && overlay.classList.contains('open')) renderChallengeSheet(key);
}

// ── CHALLENGE RENDER ──

function renderChallengeStrip() {
  if(!S.challenges)S.challenges={};
  const wrap = document.getElementById('challenge-strip-wrap');
  if (!wrap) return;
  const active = Object.entries(S.challenges||{}).filter(([,c])=>c);
  wrap.innerHTML = '';
  const strip = document.createElement('div');
  strip.className = 'challenge-strip';
  active.forEach(([key,c]) => {
    checkWeekReset(c);
    const meta = CHALLENGE_META[key];
    const total = getChallengeTotalDone(c);
    const pct = Math.min(100, Math.round((total / c.totalGoal) * 100));
    const tasksDone = getDayTasksDone(c, todayStr());
    const tasksTotal = getDayTasksTotal(c);
    const row = document.createElement('div');
    row.className = 'challenge-strip-row';
    row.innerHTML = `
      <div class="challenge-strip-icon">${meta.emoji}</div>
      <div class="challenge-strip-info">
        <div class="challenge-strip-name">${meta.label} Challenge</div>
        <div class="challenge-strip-sub">${total} / ${c.totalGoal} total · Today ${tasksDone}/${tasksTotal} tasks</div>
        <div class="challenge-strip-bar-track"><div class="challenge-strip-bar-fill" style="width:${pct}%;background:${meta.color}"></div></div>
      </div>
      <div class="challenge-strip-arrow">›</div>`;
    row.addEventListener('click', () => openChallengeSheet(key));
    strip.appendChild(row);
  });
  // New challenge button (if < 3 active)
  const available = ['pushups','situps','squats'].filter(k=>!S.challenges[k]);
  if (available.length > 0) {
    const btn = document.createElement('button');
    btn.className = 'challenge-new-btn';
    btn.innerHTML = '＋ New Weekly Challenge';
    btn.addEventListener('click', () => openChallengeModal());
    strip.appendChild(btn);
  }
  wrap.appendChild(strip);
}

function renderWorkoutChallengeBanner() {
  if(!S.challenges)S.challenges={};
  const wrap = document.getElementById('wo-challenge-wrap');
  if (!wrap) return;
  const active = Object.entries(S.challenges||{}).filter(([,c])=>c);
  if (!active.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = '';
  active.forEach(([key,c]) => {
    checkWeekReset(c);
    const meta = CHALLENGE_META[key];
    const total = getChallengeTotalDone(c);
    const pct = Math.min(100, Math.round((total / c.totalGoal) * 100));
    const tasksDone = getDayTasksDone(c, todayStr());
    const tasksTotal = getDayTasksTotal(c);
    // Milestone pips
    const pips = (c.milestones||[]).map(ms => {
      const mpct = Math.min(100, (ms / c.totalGoal) * 100);
      const hit = (c.milestonesHit||[]).includes(ms);
      return `<div class="milestone-pip${hit?' hit':''}" style="left:${mpct}%"></div>`;
    }).join('');
    const banner = document.createElement('div');
    banner.className = 'wo-challenge-banner';
    banner.innerHTML = `
      <div class="wo-challenge-banner-row">
        <span>${meta.emoji}</span>
        <span class="wo-challenge-banner-name">${meta.label} Challenge</span>
        <span class="wo-challenge-banner-count">Today ${tasksDone}/${tasksTotal} · ${total}/${c.totalGoal}</span>
      </div>
      <div class="wo-challenge-bar-track">${pips}<div class="wo-challenge-bar-fill" style="width:${pct}%;background:${meta.color}"></div></div>`;
    banner.addEventListener('click', () => openChallengeSheet(key));
    wrap.appendChild(banner);
  });
}

function openChallengeSheet(key) {
  renderChallengeSheet(key);
  document.getElementById('csheet-overlay').classList.add('open');
}

function closeChallengeSheet() {
  document.getElementById('csheet-overlay').classList.remove('open');
}

function renderChallengeSheet(key) {
  const c = S.challenges[key];
  if (!c) return;
  checkWeekReset(c);
  const meta = CHALLENGE_META[key];
  const total = getChallengeTotalDone(c);
  const weekDone = getChallengeWeekDone(c);
  const pct = Math.min(100, (total / c.totalGoal) * 100);
  const weekPct = Math.min(100, (weekDone / c.weeklyGoal) * 100);
  const today = todayStr();
  const tasksDone = getDayTasksDone(c, today);
  const tasksTotal = getDayTasksTotal(c);

  // Next milestone
  const nextMs = (c.milestones||[]).slice().sort((a,b)=>a-b).find(ms=>total < ms);
  const nextMsText = nextMs ? `${nextMs - total} reps to ${nextMs} milestone` : '🎉 All milestones hit!';

  // Milestone pips on main bar
  const pips = (c.milestones||[]).map(ms => {
    const mpct = Math.min(100,(ms/c.totalGoal)*100);
    const hit = (c.milestonesHit||[]).includes(ms);
    return `<div class="csheet-milestone-pip${hit?' hit':''}" style="left:${mpct}%"></div>`;
  }).join('');

  // 7-day grid
  const weekDates = getWeekDates(c.weekStart);
  const dayLabels = ['M','T','W','T','F','S','S'];
  const dayCells = weekDates.map((d,i) => {
    const done = getChallengeDayDone(c,d);
    const dailyTarget = Math.round(c.weeklyGoal / 7);
    const isToday = d === today;
    let cls = 'csheet-day-cell';
    if (done >= dailyTarget) cls += ' done';
    else if (done > 0) cls += ' partial';
    if (isToday) cls += ' today-cell';
    return `<div class="${cls}"><div class="csheet-day-lbl">${dayLabels[i]}</div><div class="csheet-day-val">${done>0?done:'—'}</div></div>`;
  }).join('');

  // Task list for today
  const tasks = Array.from({length:tasksTotal},(_,i) => {
    const done = i < tasksDone;
    return `<div class="csheet-task${done?' done-task':''}" data-idx="${i}">
      <div class="csheet-task-chk"></div>
      <div><div class="csheet-task-label">${c.taskSize} ${meta.label}</div>
      <div class="csheet-task-sub">Task ${i+1} of ${tasksTotal}</div></div>
    </div>`;
  }).join('');

  // Celebration card
  const celebrate = (c.celebratePending||[]).length > 0
    ? `<div class="csheet-celebrate">
        <div class="csheet-celebrate-title">🏆 Milestone Reached!</div>
        <div class="csheet-celebrate-sub">${c.celebratePending[c.celebratePending.length-1]} ${meta.label} completed!</div>
       </div>` : '';

  const el = document.getElementById('csheet-content');
  el.innerHTML = `
    <div class="csheet-hdr">
      <div class="csheet-title">${meta.emoji} ${meta.label}</div>
      <div class="csheet-hdr-actions">
        <button class="csheet-hdr-btn" id="csheet-edit-btn">✏️ Edit</button>
        <button class="csheet-hdr-btn del" id="csheet-del-btn">🗑 Delete</button>
      </div>
    </div>
    ${celebrate}
    <div class="csheet-prog-wrap">
      <div class="csheet-prog-label"><span>TOTAL PROGRESS</span><span>${total} / ${c.totalGoal}</span></div>
      <div class="csheet-prog-track">${pips}<div class="csheet-prog-fill" style="width:${pct}%;background:${meta.color}"></div></div>
      <div class="csheet-next-ms">${nextMsText}</div>
    </div>
    <div class="csheet-section">
      <div class="csheet-section-title">This Week</div>
      <div class="csheet-week-row">
        <span class="csheet-week-lbl">${weekDone}</span>
        <div class="csheet-week-bar-track"><div class="csheet-week-bar-fill" style="width:${weekPct}%"></div></div>
        <span class="csheet-week-lbl">${c.weeklyGoal}</span>
      </div>
      <div class="csheet-day-grid">${dayCells}</div>
    </div>
    <div class="csheet-section">
      <div class="csheet-section-title">Today's Tasks (${tasksDone}/${tasksTotal} done)</div>
    </div>
    <div class="csheet-task-list" id="csheet-tasks">${tasks}</div>
    <div class="csheet-section" style="padding-bottom:8px;">
      <div class="csheet-section-title">Bonus Reps</div>
    </div>
    <div class="csheet-bonus-row">
      <input class="csheet-bonus-inp" id="csheet-bonus-inp" type="number" inputmode="numeric" placeholder="e.g. 15"/>
      <button class="csheet-bonus-btn" id="csheet-bonus-btn">＋ Log</button>
    </div>`;

  // Bind task clicks — tap to log, tap done task to unlog
  el.querySelectorAll('.csheet-task').forEach(t => {
    t.addEventListener('click', () => {
      if (t.classList.contains('done-task')) {
        unlogChallengeReps(key);
      } else {
        logChallengeReps(key, c.taskSize, false);
      }
      if (navigator.vibrate) navigator.vibrate(8);
    });
  });

  // Bind bonus log
  el.querySelector('#csheet-bonus-btn').addEventListener('click', () => {
    const val = parseInt(el.querySelector('#csheet-bonus-inp').value);
    if (!val || val < 1) return;
    logChallengeReps(key, val, true);
    el.querySelector('#csheet-bonus-inp').value = '';
    if (navigator.vibrate) navigator.vibrate(8);
  });

  // Clear celebrate pending after showing
  if (c.celebratePending && c.celebratePending.length > 0) {
    c.celebratePending = [];
    save();
  }

  // Edit / Delete button bindings
  el.querySelector('#csheet-edit-btn').addEventListener('click', () => {
    closeChallengeSheet();
    openChallengeModal(key);
  });
  el.querySelector('#csheet-del-btn').addEventListener('click', () => {
    deleteChallenge(key);
  });
}

function deleteChallenge(key) {
  const meta = CHALLENGE_META[key];
  if (!confirm(`Delete the ${meta.label} challenge? All progress will be lost.`)) return;
  delete S.challenges[key];
  save();
  closeChallengeSheet();
  renderChallengeStrip();
  renderWorkoutChallengeBanner();
  toast(`${meta.label} challenge deleted`);
}

// ── NEW CHALLENGE MODAL ──

let _cmodalEx = null;
let _cmodalMilestones = [];

let _cmodalEditKey = null;

function openChallengeModal(editKey) {
  _cmodalEditKey = editKey || null;
  const c = editKey ? S.challenges[editKey] : null;

  // Populate fields
  _cmodalEx = editKey || null;
  _cmodalMilestones = c ? c.milestones.slice() : [100, 500, 1000];
  document.getElementById('cmodal-total').value    = c ? c.totalGoal  : '1000';
  document.getElementById('cmodal-weekly').value   = c ? c.weeklyGoal : '200';
  document.getElementById('cmodal-tasksize').value = c ? c.taskSize   : '20';

  // Exercise buttons — in edit mode lock to current exercise, in new mode disable active ones
  document.querySelectorAll('.cmodal-ex-btn').forEach(btn => {
    btn.classList.remove('selected','disabled');
    if (editKey) {
      if (btn.dataset.key === editKey) btn.classList.add('selected');
      else btn.classList.add('disabled');
    } else {
      if (S.challenges[btn.dataset.key]) btn.classList.add('disabled');
    }
  });

  // Update modal title and save button
  const titleEl = document.getElementById('cmodal-title');
  const saveBtn = document.getElementById('cmodal-save-btn');
  if (editKey) {
    titleEl.textContent = `✏️ Edit ${CHALLENGE_META[editKey].label}`;
    saveBtn.textContent = 'Save Changes';
    saveBtn.onclick = updateChallenge;
  } else {
    titleEl.textContent = '🏆 New Challenge';
    saveBtn.textContent = 'Start Challenge';
    saveBtn.onclick = saveNewChallenge;
  }

  updateCmodalMsRow();
  updateCmodalPreview();
  document.getElementById('cmodal-overlay').classList.add('open');
}

function closeChallengeModal() {
  document.getElementById('cmodal-overlay').classList.remove('open');
}

function selectChallengeEx(key) {
  _cmodalEx = key;
  document.querySelectorAll('.cmodal-ex-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`.cmodal-ex-btn[data-key="${key}"]`);
  if (btn) btn.classList.add('selected');
  // Default milestones based on total goal
  const total = parseInt(document.getElementById('cmodal-total').value)||1000;
  _cmodalMilestones = [Math.round(total*0.1), Math.round(total*0.5), total].filter((v,i,a)=>a.indexOf(v)===i);
  updateCmodalMsRow();
  updateCmodalPreview();
}

function updateCmodalPreview() {
  const weekly = parseInt(document.getElementById('cmodal-weekly').value)||200;
  const taskSize = parseInt(document.getElementById('cmodal-tasksize').value)||20;
  const perDay = Math.max(1, Math.ceil((weekly / 7) / taskSize));
  document.getElementById('cmodal-preview').textContent = `= ${perDay} task${perDay!==1?'s':''}/day (${taskSize} reps each)`;
}

function updateCmodalMsRow() {
  const row = document.getElementById('cmodal-ms-row');
  row.innerHTML = _cmodalMilestones.sort((a,b)=>a-b).map(ms =>
    `<div class="cmodal-ms-tag">${ms} <span class="cmodal-ms-del" data-ms="${ms}">✕</span></div>`
  ).join('');
  row.querySelectorAll('.cmodal-ms-del').forEach(x => {
    x.addEventListener('click', () => {
      _cmodalMilestones = _cmodalMilestones.filter(m => m !== parseInt(x.dataset.ms));
      updateCmodalMsRow();
    });
  });
}

function addCmodalMilestone() {
  const val = parseInt(document.getElementById('cmodal-ms-inp').value);
  if (!val || val < 1) return;
  if (!_cmodalMilestones.includes(val)) _cmodalMilestones.push(val);
  document.getElementById('cmodal-ms-inp').value = '';
  updateCmodalMsRow();
}

function saveNewChallenge() {
  if (!_cmodalEx) { toast('Pick an exercise first', 'var(--red)'); return; }
  const total  = parseInt(document.getElementById('cmodal-total').value)||1000;
  const weekly = parseInt(document.getElementById('cmodal-weekly').value)||200;
  const task   = parseInt(document.getElementById('cmodal-tasksize').value)||20;
  if (!S.challenges) S.challenges = {};
  S.challenges[_cmodalEx] = {
    exercise: _cmodalEx,
    totalGoal: total,
    weeklyGoal: weekly,
    taskSize: task,
    milestones: _cmodalMilestones.slice().sort((a,b)=>a-b),
    weekStart: getWeekMonday(todayStr()),
    logs: {},
    milestonesHit: [],
    celebratePending: [],
    createdAt: nowISO(),
  };
  save();
  closeChallengeModal();
  renderChallengeStrip();
  renderWorkoutChallengeBanner();
  toast(`🏆 ${CHALLENGE_META[_cmodalEx].label} challenge started!`, 'var(--teal)');
}

function updateChallenge() {
  const key = _cmodalEditKey;
  if (!key || !S.challenges[key]) return;
  const total  = parseInt(document.getElementById('cmodal-total').value)||1000;
  const weekly = parseInt(document.getElementById('cmodal-weekly').value)||200;
  const task   = parseInt(document.getElementById('cmodal-tasksize').value)||20;
  const c = S.challenges[key];
  c.totalGoal   = total;
  c.weeklyGoal  = weekly;
  c.taskSize    = task;
  c.milestones  = _cmodalMilestones.slice().sort((a,b)=>a-b);
  // Remove milestones already hit that are now above the new total goal
  c.milestonesHit = (c.milestonesHit||[]).filter(ms => ms <= total);
  save();
  closeChallengeModal();
  renderChallengeStrip();
  renderWorkoutChallengeBanner();
  toast(`✓ ${CHALLENGE_META[key].label} challenge updated`, 'var(--teal)');
}

// ── PERSONAL RECORDS ──
function logPR() {
  const ex  = document.getElementById('pr-ex-inp').value.trim();
  const val = document.getElementById('pr-val-inp').value.trim();
  if (!ex || !val) { toast('Fill in both fields', '#e74c3c'); return; }
  if (!S.prs) S.prs = [];
  // Update existing or add new
  const idx = S.prs.findIndex(p => p.ex.toLowerCase() === ex.toLowerCase());
  const entry = { ex, val, date: todayStr(), ts: Date.now() };
  if (idx >= 0) S.prs[idx] = entry;
  else S.prs.push(entry);
  document.getElementById('pr-ex-inp').value = '';
  document.getElementById('pr-val-inp').value = '';
  save(); renderPRList(); toast('🏆 PR saved!', '#f39c12');
}

function renderPRList() {
  if (!S.prs) S.prs = [];
  const list = document.getElementById('pr-list');
  if (!list) return;
  list.innerHTML = '';
  if (S.prs.length === 0) {
    list.innerHTML = '<div class="today-empty">No PRs yet. Log your first personal record below.</div>';
    return;
  }
  [...S.prs].sort((a,b)=>a.ex.localeCompare(b.ex)).forEach(pr => {
    const card = document.createElement('div');
    card.className = 'pr-card';
    card.innerHTML = `
      <div class="pr-card-top">
        <div class="pr-ex-name">${pr.ex}</div>
        <button class="pr-del" data-ts="${pr.ts}">×</button>
      </div>
      <div class="pr-val">${pr.val}</div>
      <div class="pr-meta">Set ${new Date(pr.date+'T00:00:00').toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</div>`;
    card.querySelector('.pr-del').onclick = () => {
      if (!confirm(`Delete PR for "${pr.ex}"?`)) return;
      S.prs = S.prs.filter(p => p.ts !== pr.ts);
      save(); renderPRList();
    };
    list.appendChild(card);
  });
}

// Update data page stats to include body data
function getBodyStats() {
  return {
    weightEntries: (S.weightLog||[]).length,
    prs: (S.prs||[]).length,
  };
}

// ═══════════════════════════════════════════════════
// PHASE 8: KEYBOARD DONE TOOLBAR
// ═══════════════════════════════════════════════════
function dismissKeyboard() {
  document.activeElement?.blur();
  document.getElementById('kbd-toolbar').classList.remove('show');
}

function initKeyboardToolbar() {
  // Show Done toolbar whenever any text/number input or textarea is focused
  // except inputs inside modals that already have their own action buttons
  document.addEventListener('focusin', e => {
    const tag = e.target.tagName;
    const isInput = (tag === 'INPUT' || tag === 'TEXTAREA');
    const inModal = e.target.closest('.modal-sheet, #note-editor-modal');
    if (isInput && !inModal) {
      document.getElementById('kbd-toolbar').classList.add('show');
    }
  });
  document.addEventListener('focusout', e => {
    // Small delay so the Done button tap registers before hiding
    setTimeout(() => {
      if (!document.activeElement || document.activeElement === document.body) {
        document.getElementById('kbd-toolbar').classList.remove('show');
      }
    }, 150);
  });
}

// ═══════════════════════════════════════════════════
// WEEK NAV & RESETS
// ═══════════════════════════════════════════════════
document.getElementById('wo-prev').onclick=()=>{S.woWeek=Math.max(0,S.woWeek-1);save();renderWorkout();};
document.getElementById('wo-next').onclick=()=>{S.woWeek++;save();renderWorkout();};
document.getElementById('ml-prev').onclick=()=>{S.mlWeek=Math.max(0,S.mlWeek-1);save();renderMeals();};
document.getElementById('ml-next').onclick=()=>{S.mlWeek++;save();renderMeals();};
document.getElementById('cal-prev').onclick=()=>{const{y,m}=getCalDate();if(m===0){S.calMonth={y:y-1,m:11};}else{S.calMonth={y,m:m-1};}save();renderSchedule();};
document.getElementById('cal-next').onclick=()=>{const{y,m}=getCalDate();if(m===11){S.calMonth={y:y+1,m:0};}else{S.calMonth={y,m:m+1};}save();renderSchedule();};
document.getElementById('wo-reset-btn').onclick=()=>{
  if(!confirm('Reset all sets for this day?'))return;
  WORKOUTS[S.woDay].exercises.forEach(ex=>{for(let s=1;s<=ex.sets;s++)delete S.logs[wKey(S.woWeek,S.woDay,ex.id,s)];});
  save();renderWorkout();
};
document.getElementById('ml-reset-btn').onclick=()=>{
  if(!confirm('Reset meals for this day?'))return;
  ['breakfast','lunch','dinner'].forEach(sl=>delete S.mealLogs[mlKey(S.mlWeek,S.mlDay,sl)]);
  save();renderMeals();
};

// MODAL BACKDROPS
['shop-modal','meal-modal','task-modal','quickadd-modal','ex-edit-modal','task-edit-modal'].forEach(id=>{
  document.getElementById(id).addEventListener('click',e=>{if(e.target===document.getElementById(id))document.getElementById(id).classList.remove('open');});
});
// Challenge sheet + modal backdrop close
document.getElementById('csheet-overlay').addEventListener('click',e=>{if(e.target===document.getElementById('csheet-overlay'))closeChallengeSheet();});
document.getElementById('cmodal-overlay').addEventListener('click',e=>{if(e.target===document.getElementById('cmodal-overlay'))closeChallengeModal();});
// Tap outside input to dismiss keyboard
document.addEventListener('touchend', e => {
  const tag = e.target.tagName;
  if(tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.target.closest('.modal-sheet') && !e.target.closest('#note-editor-modal')) {
    if(document.activeElement && (document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='TEXTAREA')) {
      document.activeElement.blur();
    }
  }
}, {passive:true});
initSessionNotes();
initKeyboardToolbar();

// ═══════════════════════════════════════════════════
