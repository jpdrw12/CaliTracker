// INIT
// ═══════════════════════════════════════════════════
// Load the rest-timer ding via Web Audio API on first user interaction
document.addEventListener('click', function unlockDingAudio() {
  _loadDingBuffer();
}, { once: true });

  if (!S.lastOpenedDate || S.lastOpenedDate !== todayStr()) {
    autoSelectToday();
  }
  checkBackupPrompt();
  markTodayActive();
  applyTheme(S.theme || 'dark');
  save();

  // ISO week auto-advance
  checkISOWeekAdvance();

  // Day edit button
  document.getElementById('wo-edit-day').addEventListener('click', () => openDayEdit());

  // Day edit modal backdrop close
  document.getElementById('day-edit-modal').addEventListener('click', e => {
    if (e.target.id === 'day-edit-modal') closeDayEdit();
  });

  // Safety re-bind for week nav (in case challenges.js top-level binding ever fails silently)
  const woPrevBtn = document.getElementById('wo-prev');
  const woNextBtn = document.getElementById('wo-next');
  if (woPrevBtn && !woPrevBtn.onclick) {
    woPrevBtn.addEventListener('click', () => { S.woWeek = Math.max(0, S.woWeek - 1); save(); renderWorkout(); });
  }
  if (woNextBtn && !woNextBtn.onclick) {
    woNextBtn.addEventListener('click', () => { S.woWeek++; save(); renderWorkout(); });
  }

  switchTab('today');
  renderWorkout();
  renderMeals();
  updateSchedBadge();
  checkOnboarding();
  updateAutoBackupUI();
  Object.values(S.challenges||{}).forEach(c=>{ if(c){ checkWeekReset(c); checkChallengeComplete(c); } });

  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
