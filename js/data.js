function renderDataPage(){
  const totalSets=Object.values(S.logs).filter(v=>v.done).length;
  const totalMeals=Object.values(S.mealLogs).filter(Boolean).length;
  const weeks=S.woWeek+1;
  const totalTasks=Object.values(S.taskDone||{}).filter(Boolean).length;
  const totalNotes=S.notes.length;
  const bs = getBodyStats();
  document.getElementById('stat-grid').innerHTML=`
    <div class="data-stat-item"><div class="data-stat-num">${totalSets}</div><div class="data-stat-lbl">Sets Logged</div></div>
    <div class="data-stat-item"><div class="data-stat-num">${totalMeals}</div><div class="data-stat-lbl">Meals Tracked</div></div>
    <div class="data-stat-item"><div class="data-stat-num">${totalTasks}</div><div class="data-stat-lbl">Tasks Done</div></div>
    <div class="data-stat-item"><div class="data-stat-num">${totalNotes}</div><div class="data-stat-lbl">Notes</div></div>
    <div class="data-stat-item"><div class="data-stat-num">${calcStreak()}</div><div class="data-stat-lbl">Day Streak</div></div>
    <div class="data-stat-item"><div class="data-stat-num">${bs.weightEntries}</div><div class="data-stat-lbl">Weight Entries</div></div>
    <div class="data-stat-item"><div class="data-stat-num">${bs.prs}</div><div class="data-stat-lbl">PRs Logged</div></div>
    <div class="data-stat-item"><div class="data-stat-num">${Object.keys(S.mealCustom).length}</div><div class="data-stat-lbl">Custom Meals</div></div>`;
  // Chart — last 8 weeks completion %
  const chartEl = document.getElementById('chart-bars');
  if (!chartEl) return;
  chartEl.innerHTML = '';
  const weekPcts = [];
  for (let w = Math.max(0, S.woWeek - 7); w <= S.woWeek; w++) {
    const pct = Math.round(WORKOUTS.reduce((a,_,i) => {
      const d = WORKOUTS[i];
      const total = d.exercises.reduce((s,e)=>s+e.sets,0);
      const done  = d.exercises.reduce((s,e)=>{
        for(let set=1;set<=e.sets;set++) if(S.logs[`w${w}-d${i}-${e.id}-s${set}`]?.done) s++;
        return s;
      },0);
      return a + (total>0?(done/total)*100:0);
    }, 0) / 7);
    weekPcts.push({ w, pct });
  }
  const max = Math.max(...weekPcts.map(x=>x.pct), 1);
  weekPcts.forEach(({w, pct}) => {
    const isCurrent = w === S.woWeek;
    const barH = Math.max(3, Math.round((pct / max) * 52));
    const label = `W${w+1}`;
    const wrap = document.createElement('div');
    wrap.className = 'chart-bar-wrap';
    wrap.innerHTML = `
      <div class="chart-bar-pct">${pct>0?pct+'%':''}</div>
      <div class="chart-bar${isCurrent?' current':''}" style="height:${barH}px"></div>
      <div class="chart-bar-lbl">${label}</div>`;
    chartEl.appendChild(wrap);
  });
  updateAutoBackupUI();
  // Storage usage bar
  try {
    const used = new Blob([localStorage.getItem('calitrack_data')||'']).size;
    const cap = 5 * 1024 * 1024; // 5MB estimate
    const pct = Math.min(100, Math.round((used / cap) * 100));
    const kb = (used / 1024).toFixed(1);
    const fill = document.getElementById('storage-bar-fill');
    const txt  = document.getElementById('storage-bar-text');
    if (fill && txt) {
      txt.textContent = `${kb} KB / ~5 MB`;
      fill.style.width = pct + '%';
      fill.className = 'storage-bar-fill' + (pct > 80 ? ' danger' : pct > 60 ? ' warn' : '');
    }
  } catch(e) {}

}

function exportData(){
  const payload=JSON.stringify({...S,exportedAt:new Date().toISOString()},null,2);
  dlText(payload,`calitrack-backup-${new Date().toISOString().slice(0,10)}.json`);
  toast('✓ Backup exported');
}
function triggerImport(){document.getElementById('import-file').click();}
let _importPending = null;
function importData(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const data=JSON.parse(ev.target.result);
      if(!data.logs)throw new Error('Invalid');
      _importPending = data;
      // Build preview rows
      const rows = [
        ['Sets logged', Object.values(data.logs||{}).filter(v=>v.done).length],
        ['Tasks', (data.tasks||[]).length],
        ['Notes', (data.notes||[]).length],
        ['Meals tracked', Object.keys(data.mealLogs||{}).length],
        ['Weight entries', (data.weightLog||[]).length],
        ['PRs', (data.prs||[]).length],
        ['Progress photos', (data.progressPhotos||[]).length],
        ['Exported', data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}) : 'Unknown'],
      ];
      document.getElementById('import-preview-rows').innerHTML =
        rows.map(([k,v])=>`<div class="import-preview-row"><span>${k}</span><span class="import-preview-val">${v}</span></div>`).join('');
      document.getElementById('import-preview-overlay').classList.add('open');
    }catch{toast('Import failed — invalid file','#e74c3c');}
    e.target.value='';
  };
  reader.readAsText(file);
}
function cancelImportPreview(){
  _importPending=null;
  document.getElementById('import-preview-overlay').classList.remove('open');
}
function confirmImport(){
  if(!_importPending)return;
  S=migrate(_importPending);_importPending=null;
  document.getElementById('import-preview-overlay').classList.remove('open');
  save();renderWorkout();renderMeals();renderSchedule();renderNotes();renderDataPage();
  toast('✓ Data imported successfully');
}
function clearAllData(){
  if(!confirm('Delete ALL data? This cannot be undone.'))return;
  if(!confirm('Are you sure? All progress will be lost.'))return;
  S=defaultState();save();renderWorkout();renderMeals();renderSchedule();renderNotes();renderDataPage();
  toast('All data cleared');
}
function dlText(text,filename){
  const blob=new Blob([text],{type:'text/plain'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════
// PHASE 1: TODAY AUTO-SELECT
// ═══════════════════════════════════════════════════
function todayWorkoutDayIdx() {
  // Mon=0 ... Sun=6, matching WORKOUTS array order
  const dow = new Date().getDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1;
}

function autoSelectToday() {
  S.woDay = todayWorkoutDayIdx();
  // Also sync meal day to today
  const dow = new Date().getDay();
  S.mlDay = dow === 0 ? 6 : dow - 1;
}

// ═══════════════════════════════════════════════════
// PHASE 1: STREAK
// ═══════════════════════════════════════════════════
function getDayCompletionKey(dateStr) {
  return 'done-' + dateStr;
}

function markTodayActive() {
  const today = todayStr();
  if (!S.streakData) S.streakData = {};
  // Mark today as visited (not completed — completion is tracked separately)
  S.lastOpenedDate = today;
}

function isDayCompleted(dateStr) {
  // A day is "completed" if any set was logged as done on that workout week/day
  // We use streakData which we update whenever a full day's workout is done
  return !!(S.streakData && S.streakData[dateStr]);
}

function checkDayCompletion() {
  // Called after any set is checked — if all sets done for today mark streak
  const todayIdx = todayWorkoutDayIdx();
  const pct = woDayPct(todayIdx);
  if (pct === 100) {
    const today = todayStr();
    if (!S.streakData) S.streakData = {};
    if (!S.streakData[today]) {
      S.streakData[today] = true;
      save();
      showCelebration();
    }
  }
}

function calcStreak() {
  if (!S.streakData) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (S.streakData[ds]) {
      streak++;
    } else if (i > 0) {
      break; // gap found — streak ends
    }
  }
  return streak;
}

// ═══════════════════════════════════════════════════
// PHASE 1: CELEBRATION
// ═══════════════════════════════════════════════════
function showCelebration() {
  const streak = calcStreak();
  const msgs = [
    '🔥 Day complete! Keep it up!',
    '💪 Crushed it! Great work!',
    '⚡ All done! You showed up!',
    '🏆 Full workout complete!',
  ];
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  const streakMsg = streak > 1 ? ` ${streak} day streak!` : '';
  toast(msg + streakMsg, '#f39c12');
  if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
}

// ═══════════════════════════════════════════════════
// PHASE 1: PREVIOUS SESSION REPS
// ═══════════════════════════════════════════════════
function getPrevReps(dayIdx, exId, setNum) {
  // Look back up to 4 weeks for a previous log for this exercise/set
  for (let w = S.woWeek - 1; w >= Math.max(0, S.woWeek - 4); w--) {
    const k = wKey(w, dayIdx, exId, setNum);
    const entry = S.logs[k];
    if (entry && entry.reps) return entry.reps;
  }
  return null;
}

// ═══════════════════════════════════════════════════
// PHASE 1: BACKUP PROMPT
// ═══════════════════════════════════════════════════
function checkBackupPrompt() {
  const today = todayStr();
  const last = S.lastOpenedDate;
  if (!last) return;
  const daysSince = Math.floor((new Date(today) - new Date(last)) / (1000 * 60 * 60 * 24));
  const lastPrompt = S.lastBackupPrompt;
  const daysSincePrompt = lastPrompt
    ? Math.floor((new Date(today) - new Date(lastPrompt)) / (1000 * 60 * 60 * 24))
    : 999;
  // Prompt if: 5-day gap since last open, OR 7 days since last prompt
  const shouldPrompt = (daysSince >= 5 || daysSincePrompt >= 7) && S.lastBackupPrompt !== today;
  if (shouldPrompt) {
    S.lastBackupPrompt = today;
    save();
    setTimeout(() => {
      const el = document.getElementById('backup-prompt');
      if (el) el.classList.add('show');
    }, 1500);
  }
}

// ═══════════════════════════════════════════════════
// PHASE 3: SWIPE TO DELETE
// ═══════════════════════════════════════════════════
function makeSwipeable(el, onDelete) {
  let startX = 0, curX = 0, swiping = false;
  const THRESHOLD = 72;

  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    curX = startX;
    swiping = true;
  }, {passive: true});

  el.addEventListener('touchmove', e => {
    if (!swiping) return;
    curX = e.touches[0].clientX;
    const dx = startX - curX;
    if (dx > 0) {
      el.style.transform = `translateX(${-Math.min(dx, THRESHOLD + 20)}px)`;
      el.parentElement.classList.toggle('revealing', dx > 20);
    }
  }, {passive: true});

  el.addEventListener('touchend', () => {
    if (!swiping) return;
    swiping = false;
    const dx = startX - curX;
    if (dx > THRESHOLD) {
      el.style.transform = `translateX(-100%)`;
      el.style.opacity = '0';
      el.style.transition = 'transform 0.2s, opacity 0.2s';
      if (navigator.vibrate) navigator.vibrate(30);
      setTimeout(onDelete, 200);
    } else {
      el.style.transform = '';
      el.parentElement.classList.remove('revealing');
    }
  });
}

// Wrap a card in a swipeable div
function wrapSwipeable(card, onDelete) {
  const wrap = document.createElement('div');
  wrap.className = 'swipe-wrap';
  const bg = document.createElement('div');
  bg.className = 'swipe-delete-bg';
  bg.innerHTML = '🗑';
  card.parentNode?.insertBefore(wrap, card);
  wrap.appendChild(bg);
  wrap.appendChild(card);
  makeSwipeable(card, onDelete);
  return wrap;
}

// ═══════════════════════════════════════════════════

// PHASE 3: SWIPE TO DELETE
// ═══════════════════════════════════════════════════
function addSwipeToDelete(el, onDelete) {
  let startX = 0, currentX = 0, swiping = false;
  const inner = el.querySelector('.swipe-inner') || el;

  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    swiping = true;
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    if (!swiping) return;
    currentX = e.touches[0].clientX - startX;
    if (currentX < 0) {
      inner.style.transform = `translateX(${Math.max(currentX, -80)}px)`;
      inner.style.transition = 'none';
    }
  }, { passive: true });

  el.addEventListener('touchend', () => {
    if (!swiping) return;
    swiping = false;
    inner.style.transition = 'transform 0.2s';
    if (currentX < -60) {
      inner.style.transform = 'translateX(-80px)';
      setTimeout(() => {
        inner.style.transform = '';
        onDelete();
      }, 300);
    } else {
      inner.style.transform = '';
    }
    currentX = 0;
  });
}

// ═══════════════════════════════════════════════════
// PHASE 3: REST TIMER
// ═══════════════════════════════════════════════════
let restTimerInterval = null;
const REST_TIMES = { heavy: 120, medium: 90, light: 60, recovery: 0 };
const CIRCUMFERENCE = 113; // 2π * 18

function startRestTimer(seconds) {
  if (seconds <= 0) return;
  clearInterval(restTimerInterval);

  const timerEl = document.getElementById('rest-timer');
  const numEl   = document.getElementById('rest-timer-num');
  const subEl   = document.getElementById('rest-timer-sub');
  const arc     = document.getElementById('rest-timer-arc');

  let remaining = seconds;
  numEl.textContent = remaining;
  subEl.textContent = `${seconds}s rest`;
  arc.style.strokeDashoffset = 0;
  timerEl.classList.add('show');
  if (navigator.vibrate) navigator.vibrate(15);

  restTimerInterval = setInterval(() => {
    remaining--;
    numEl.textContent = remaining;
    const progress = (seconds - remaining) / seconds;
    arc.style.strokeDashoffset = CIRCUMFERENCE * progress;
    if (remaining <= 0) {
      clearInterval(restTimerInterval);
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      playDing();
      subEl.textContent = 'Rest complete!';
      arc.style.stroke = '#27ae60';
      setTimeout(() => {
        timerEl.classList.remove('show');
        arc.style.stroke = '#1abc9c';
      }, 1500);
    }
  }, 1000);
}

let _dingAudioCtx = null;
let _dingAudioBuffer = null;
let _dingLoadPromise = null;

function _loadDingBuffer() {
  if (_dingLoadPromise) return _dingLoadPromise;
  _dingLoadPromise = (async () => {
    try {
      if (!_dingAudioCtx) _dingAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const res = await fetch('assets/ding.mp3');
      const arrayBuf = await res.arrayBuffer();
      _dingAudioBuffer = await _dingAudioCtx.decodeAudioData(arrayBuf);
    } catch(e) { /* fall back to <audio> below if this fails */ }
  })();
  return _dingLoadPromise;
}

function playDing() {
  // Preferred path: Web Audio API — uses the 'ambient' session category on iOS,
  // which mixes with other apps' audio instead of pausing it.
  try {
    if (_dingAudioCtx && _dingAudioBuffer) {
      if (_dingAudioCtx.state === 'suspended') _dingAudioCtx.resume();
      const src = _dingAudioCtx.createBufferSource();
      src.buffer = _dingAudioBuffer;
      src.connect(_dingAudioCtx.destination);
      src.start(0);
      return;
    }
  } catch(e) {}
  // Fallback: plain <audio> element (will interrupt other apps' audio, but ensures sound still plays)
  try {
    const a = document.getElementById('ding-audio');
    a.currentTime = 0;
    a.play();
  } catch(e) {}
}

function skipRestTimer() {
  clearInterval(restTimerInterval);
  const timerEl = document.getElementById('rest-timer');
  const arc = document.getElementById('rest-timer-arc');
  timerEl.classList.remove('show');
  arc.style.stroke = '#1abc9c';
  arc.style.strokeDashoffset = 0;
}

// ═══════════════════════════════════════════════════
// PHASE 3: THEME TOGGLE
// ═══════════════════════════════════════════════════
function applyTheme(theme) {
  const root = document.documentElement;
  const isLight = theme === 'light';
  root.classList.toggle('light', isLight);
  const lbl = document.getElementById('theme-label');
  const tog = document.getElementById('theme-ios-toggle');
  if (lbl) lbl.textContent = isLight ? '☀️ Light Mode' : '🌙 Dark Mode';
  if (tog) tog.classList.toggle('on', isLight);
}

function toggleTheme() {
  const current = S.theme || 'dark';
  S.theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(S.theme);
  save();
}

// ═══════════════════════════════════════════════════
// PHASE 3: ONBOARDING
// ═══════════════════════════════════════════════════
function checkOnboarding() {
  if (!S.onboardingDone) {
    document.getElementById('onboarding').classList.add('show');
  }
}

function closeOnboarding() {
  S.onboardingDone = true;
  save();
  document.getElementById('onboarding').classList.remove('show');
}

// ═══════════════════════════════════════════════════
// AUTO-BACKUP (File System Access API)
// ═══════════════════════════════════════════════════
const FS_SUPPORTED = 'showSaveFilePicker' in window;
const IDB_DB_NAME  = 'calitrack-fs';
const IDB_STORE    = 'handles';
const IDB_KEY      = 'backup-handle';

// Open IndexedDB for storing file handles
function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = () => rej(req.error);
  });
}

async function idbGet(key) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

async function idbSet(key, val) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(val, key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

async function idbDelete(key) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).delete(key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

// Request permission and return handle, or null
async function getVerifiedHandle() {
  const handle = await idbGet(IDB_KEY);
  if (!handle) return null;
  const perm = await handle.queryPermission({ mode: 'readwrite' });
  if (perm === 'granted') return handle;
  const req = await handle.requestPermission({ mode: 'readwrite' });
  return req === 'granted' ? handle : null;
}

// Write backup to file — called on every save (debounced)
let autoBackupTimer = null;
async function autoBackup() {
  if (!FS_SUPPORTED) return;
  clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(async () => {
    try {
      const handle = await getVerifiedHandle();
      if (!handle) return;
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify({ ...S, autoBackedUpAt: new Date().toISOString() }, null, 2));
      await writable.close();
      S.lastAutoBackup = new Date().toISOString();
      localStorage.setItem('calitrack_data', JSON.stringify(S));
      updateAutoBackupUI();
    } catch (err) {
      // Fail silently — localStorage is always source of truth
    }
  }, 2000);
}

// Set up a new backup file via save picker
async function setupAutoBackup() {
  if (!FS_SUPPORTED) return;
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'calitrack-backup.json',
      types: [{ description: 'CaliTrack Backup', accept: { 'application/json': ['.json'] } }],
    });
    await idbSet(IDB_KEY, handle);
    S.autoBackupFileName = handle.name;
    S.lastAutoBackup = null;
    save();
    toast('✓ Auto-backup configured');
    updateAutoBackupUI();
    // Write immediately
    autoBackup();
  } catch (err) {
    if (err.name !== 'AbortError') toast('Failed to set up backup', '#e74c3c');
  }
}

async function disableAutoBackup() {
  if (!confirm('Disable auto-backup? Your existing backup file will not be deleted.')) return;
  await idbDelete(IDB_KEY);
  S.autoBackupFileName = null;
  S.lastAutoBackup = null;
  save();
  updateAutoBackupUI();
  toast('Auto-backup disabled');
}

function handleAutoBackupBtn() {
  if (S.autoBackupFileName) {
    // Already configured — offer to write now or disable
    autoBackup();
    toast('✓ Backup written');
  } else {
    setupAutoBackup();
  }
}

async function updateAutoBackupUI() {
  if (!FS_SUPPORTED) {
    document.getElementById('backup-status-icon').textContent  = 'ℹ️';
    document.getElementById('backup-status-title').textContent = 'Not available on this browser';
    document.getElementById('backup-status-sub').textContent   = 'Auto-backup uses the File System Access API, which requires Chrome, Edge, or Firefox on desktop or Android.';
    document.getElementById('backup-status-btn').style.display = 'none';
    document.getElementById('backup-hint').style.display       = 'none';
    return;
  }

  const hasHandle = !!(await idbGet(IDB_KEY));
  const lastBackup = S.lastAutoBackup
    ? new Date(S.lastAutoBackup).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
    : null;

  if (hasHandle && S.autoBackupFileName) {
    document.getElementById('backup-status-icon').textContent  = '✅';
    document.getElementById('backup-status-title').textContent = S.autoBackupFileName;
    document.getElementById('backup-status-sub').textContent   = lastBackup ? `Last saved ${lastBackup}` : 'Ready — will save on next data change';
    const btn = document.getElementById('backup-status-btn');
    btn.textContent = 'Save now';
    btn.className   = 'backup-status-action';
    // Add disable link if not present
    if (!document.getElementById('backup-disable-btn')) {
      const dis = document.createElement('button');
      dis.id        = 'backup-disable-btn';
      dis.textContent = 'Disable';
      dis.className = 'backup-status-action danger';
      dis.style.marginLeft = '6px';
      dis.onclick   = disableAutoBackup;
      btn.parentElement.appendChild(dis);
    }
  } else {
    document.getElementById('backup-status-icon').textContent  = '📂';
    document.getElementById('backup-status-title').textContent = 'Not configured';
    document.getElementById('backup-status-sub').textContent   = 'Set up auto-backup to save your data to a local file automatically on every change.';
    const btn = document.getElementById('backup-status-btn');
    btn.textContent = 'Set up';
    btn.className   = 'backup-status-action';
    const dis = document.getElementById('backup-disable-btn');
    if (dis) dis.remove();
  }
}

// ═══════════════════════════════════════════════════
// TODAY VIEW
// ═══════════════════════════════════════════════════
