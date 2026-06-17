// INIT
// ═══════════════════════════════════════════════════
// Unlock audio on first user interaction (required by mobile browsers)
document.addEventListener('click', function unlockAudio() {
  const a = document.getElementById('ding-audio');
  if (a) { a.volume = 0; a.play().then(() => { a.pause(); a.currentTime = 0; a.volume = 1; }).catch(() => { a.volume = 1; }); }
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

  // Week navigation arrows (restored — lost in refactor)
  document.getElementById('wo-prev').addEventListener('click', () => {
    if (S.woWeek > 0) { S.woWeek--; save(); renderWorkout(); }
  });
  document.getElementById('wo-next').addEventListener('click', () => {
    S.woWeek++; save(); renderWorkout();
  });

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
