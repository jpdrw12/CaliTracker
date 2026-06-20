// ═══════════════════════════════════════════════════
// WEEKLY SUMMARY CARD (Phase 20)
// ═══════════════════════════════════════════════════

function getWeekDateRange() {
  const today = new Date();
  const monday = new Date(today);
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
  monday.setDate(today.getDate() - dow);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

// ── Phase 22: Total reps/sets logged this week (optionally for a specific week) ──
function getWeeklyRepsTotal(weekNum = S.woWeek) {
  let totalReps = 0, totalSets = 0;
  for (let di = 0; di < 7; di++) {
    const d = getWorkoutDay(di);
    d.exercises.forEach(ex => {
      const exData = getExData(di, ex);
      for (let s = 1; s <= exData.sets; s++) {
        const log = S.logs[wKey(weekNum, di, ex.id, s)];
        if (!log || !log.done) continue;
        totalSets++;
        // Try rep count first, then time-based (seconds), else count as 1 set with no numeric value
        const repVal = parseRepValue(log.reps);
        if (repVal !== null) { totalReps += repVal; continue; }
        const timeVal = parseTimeValue(log.reps);
        if (timeVal !== null) { totalReps += timeVal; continue; }
        // Dual-sided exercises store repsL/repsR instead of reps
        if (log.repsL) {
          const l = parseRepValue(log.repsL) ?? parseTimeValue(log.repsL);
          if (l !== null) totalReps += l;
        }
        if (log.repsR) {
          const r = parseRepValue(log.repsR) ?? parseTimeValue(log.repsR);
          if (r !== null) totalReps += r;
        }
      }
    });
  }
  return { totalReps, totalSets };
}

// ── Phase 25: Week-aware completion % (mirrors woDayPct/woWeekPct but for any week) ──
function woDayPctFor(weekNum, di) {
  const d = getWorkoutDay(di);
  const total = d.exercises.reduce((a, e) => a + e.sets, 0);
  const done = d.exercises.reduce((a, e) => {
    for (let s = 1; s <= e.sets; s++) if (S.logs[wKey(weekNum, di, e.id, s)]?.done) a++;
    return a;
  }, 0);
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
function woWeekPctFor(weekNum) {
  return Math.round(WORKOUTS.reduce((a, _, i) => a + woDayPctFor(weekNum, i), 0) / 7);
}

// Returns null if last week has no logged data at all (so the UI can omit the comparison cleanly)
function getWeekComparison() {
  const lastWeek = S.woWeek - 1;
  if (lastWeek < 0) return null;
  const hasAnyLog = Object.keys(S.logs).some(k => k.startsWith(`w${lastWeek}-`) && S.logs[k]?.done);
  if (!hasAnyLog) return null;

  const thisPct = woWeekPct();
  const lastPct = woWeekPctFor(lastWeek);
  const { totalReps: thisReps } = getWeeklyRepsTotal(S.woWeek);
  const { totalReps: lastReps } = getWeeklyRepsTotal(lastWeek);

  return {
    pctDelta: thisPct - lastPct,
    repsDelta: thisReps - lastReps,
    lastReps,
  };
}

// ── Phase 23: Best single day this week ──
function getBestWorkoutDay() {
  let best = { dayIdx: -1, pct: -1 };
  for (let di = 0; di < 7; di++) {
    const pct = woDayPct(di);
    if (pct > best.pct) best = { dayIdx: di, pct };
  }
  if (best.pct <= 0) return null;
  return { name: getWorkoutDay(best.dayIdx).name, pct: best.pct };
}

// ── Phase 24: Meals tracked this week ──
function getWeeklyMealsTotal() {
  let done = 0;
  const total = 7 * 3; // 3 slots/day
  for (let di = 0; di < 7; di++) {
    done += mlDayDone(di);
  }
  return { done, total };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function buildWeeklySummaryCanvas(sections = { challenges: true, meals: true, prs: true }) {
  const W = 750, H = 1500;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const isLight = document.documentElement.classList.contains('light');
  const bg = isLight ? '#f5f5f0' : '#07070f';
  const surface = isLight ? '#ffffff' : '#0d0d1a';
  const text = isLight ? '#1a1a1a' : '#f0f0f0';
  const muted = isLight ? '#888' : '#666';
  const border = isLight ? '#ddd' : '#222';
  const teal = '#1abc9c';

  // Background — subtle vertical gradient instead of flat fill
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  if (isLight) {
    bgGrad.addColorStop(0, '#fafaf6');
    bgGrad.addColorStop(1, '#eeeee6');
  } else {
    bgGrad.addColorStop(0, '#0a0a14');
    bgGrad.addColorStop(1, '#05050a');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  let y = 60;

  // Logo mark — a simple rounded square badge with a stylized flex icon, drawn (no image asset needed)
  const badgeSize = 64, badgeX = 50, badgeY = y - 44;
  const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeSize, badgeY + badgeSize);
  badgeGrad.addColorStop(0, '#1abc9c');
  badgeGrad.addColorStop(1, '#16a085');
  ctx.fillStyle = badgeGrad;
  roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 16);
  ctx.fill();
  ctx.fillStyle = '#07070f';
  ctx.font = '800 36px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💪', badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 13);
  ctx.textAlign = 'left';

  const textX = badgeX + badgeSize + 20;

  // Header
  ctx.fillStyle = muted;
  ctx.font = '600 20px Barlow, sans-serif';
  ctx.fillText('FLOOR CALISTHENICS', textX, y - 14);
  ctx.fillStyle = text;
  ctx.font = '800 34px "Barlow Condensed", sans-serif';
  ctx.fillText('CALITRACK', textX, y + 18);

  y += 56;
  ctx.fillStyle = text;
  ctx.font = '800 48px "Barlow Condensed", sans-serif';
  ctx.fillText('WEEKLY SUMMARY', 50, y);
  y += 36;
  ctx.fillStyle = muted;
  ctx.font = '500 24px Barlow, sans-serif';
  ctx.fillText(getWeekDateRange(), 50, y);
  y += 60;

  // ── Workout card ──
  const cardX = 50, cardW = W - 100;
  const comparison = getWeekComparison();
  let cardH = comparison ? 360 : 320;
  ctx.fillStyle = surface;
  roundRect(ctx, cardX, y, cardW, cardH, 24);
  ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = 2;
  roundRect(ctx, cardX, y, cardW, cardH, 24);
  ctx.stroke();

  let cy = y + 50;
  ctx.fillStyle = muted;
  ctx.font = '700 20px "Barlow Condensed", sans-serif';
  ctx.fillText('WORKOUT', cardX + 36, cy);

  const weekPct = woWeekPct();
  ctx.fillStyle = teal;
  ctx.font = '800 44px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${weekPct}%`, cardX + cardW - 36, cy + 8);
  ctx.textAlign = 'left';

  if (comparison) {
    const pctUp = comparison.pctDelta >= 0;
    ctx.fillStyle = pctUp ? '#27ae60' : '#e74c3c';
    ctx.font = '700 15px Barlow, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${pctUp ? '↑' : '↓'} ${Math.abs(comparison.pctDelta)}% vs last week`, cardX + cardW - 36, cy + 28);
    ctx.textAlign = 'left';
  }

  cy += comparison ? 56 : 46;
  const { totalReps, totalSets } = getWeeklyRepsTotal();
  const repsStr = totalReps.toLocaleString();
  ctx.fillStyle = teal;
  ctx.font = '800 32px "Barlow Condensed", sans-serif';
  ctx.fillText(repsStr, cardX + 36, cy);
  const numW = ctx.measureText(repsStr).width;
  ctx.fillStyle = muted;
  ctx.font = '600 16px Barlow, sans-serif';
  ctx.fillText('TOTAL REPS', cardX + 36 + numW + 14, cy - 2);
  ctx.fillText(`${totalSets} sets logged`, cardX + 36 + numW + 14, cy + 18);

  if (comparison) {
    cy += 38;
    const repsUp = comparison.repsDelta >= 0;
    ctx.fillStyle = repsUp ? '#27ae60' : '#e74c3c';
    ctx.font = '700 15px Barlow, sans-serif';
    ctx.fillText(`${repsUp ? '↑' : '↓'} ${Math.abs(comparison.repsDelta).toLocaleString()} reps vs last week (${comparison.lastReps.toLocaleString()})`, cardX + 36, cy);
  }

  cy += comparison ? 50 : 56;
  // Day dots — partial-fill progress ring instead of binary done/not-done
  const dotSize = 18, gap = (cardW - 72 - dotSize * 7) / 6;
  for (let i = 0; i < 7; i++) {
    const d = getWorkoutDay(i);
    const pct = woDayPct(i);
    const dx = cardX + 36 + i * (dotSize + gap);
    const cx = dx + dotSize / 2;
    const r = dotSize / 2;

    // Track (empty ring)
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = isLight ? '#e0e0d8' : '#222230';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (pct > 0) {
      // Progress arc, starting from top (-90deg), proportional to completion
      const endAngle = -Math.PI / 2 + (Math.PI * 2 * Math.min(pct, 100) / 100);
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, endAngle);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    if (pct >= 100) {
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 11px Barlow, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓', cx, cy + 4);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = muted;
    ctx.font = '600 13px Barlow, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.name, cx, cy + 30);
    ctx.textAlign = 'left';
  }

  cy += 60;
  const streak = calcStreak();
  ctx.fillStyle = '#f39c12';
  ctx.font = '700 18px "Barlow Condensed", sans-serif';
  ctx.fillText(streak > 0 ? `🔥 ${streak} day streak` : 'No active streak', cardX + 36, cy);

  const best = getBestWorkoutDay();
  if (best) {
    ctx.fillStyle = muted;
    ctx.font = '600 16px Barlow, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Best day: ${best.name} (${best.pct}%)`, cardX + cardW - 36, cy);
    ctx.textAlign = 'left';
  }

  y += cardH + 30;

  // ── Challenges ──
  const activeKeys = sections.challenges ? Object.entries(S.challenges || {}).filter(([,c]) => c) : [];
  if (activeKeys.length > 0) {
    const chH = 50 + activeKeys.length * 90;
    ctx.fillStyle = surface;
    roundRect(ctx, cardX, y, cardW, chH, 24);
    ctx.fill();
    ctx.strokeStyle = border;
    roundRect(ctx, cardX, y, cardW, chH, 24);
    ctx.stroke();

    let chy = y + 50;
    ctx.fillStyle = muted;
    ctx.font = '700 20px "Barlow Condensed", sans-serif';
    ctx.fillText('CHALLENGES', cardX + 36, chy);
    chy += 40;

    activeKeys.forEach(([key, c]) => {
      const meta = CHALLENGE_META[key];
      const total = getChallengeTotalDone(c);
      const pct = Math.min(1, total / c.totalGoal);

      ctx.fillStyle = text;
      ctx.font = '700 20px Barlow, sans-serif';
      ctx.fillText(`${meta.emoji} ${meta.label}`, cardX + 36, chy);
      ctx.fillStyle = muted;
      ctx.font = '600 18px Barlow, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${total} / ${c.totalGoal}`, cardX + cardW - 36, chy);
      ctx.textAlign = 'left';

      chy += 22;
      const barW = cardW - 72, barH = 10;
      ctx.fillStyle = isLight ? '#e8e8e0' : '#1a1a2e';
      roundRect(ctx, cardX + 36, chy, barW, barH, 5);
      ctx.fill();
      ctx.fillStyle = teal;
      roundRect(ctx, cardX + 36, chy, barW * pct, barH, 5);
      ctx.fill();

      chy += 50;
    });

    y += chH + 30;
  }

  // ── Meals tracked this week ──
  const { done: mealsDone, total: mealsTotal } = sections.meals ? getWeeklyMealsTotal() : { done: 0, total: 0 };
  if (mealsDone > 0) {
    const mealH = 100;
    ctx.fillStyle = surface;
    roundRect(ctx, cardX, y, cardW, mealH, 24);
    ctx.fill();
    ctx.strokeStyle = border;
    roundRect(ctx, cardX, y, cardW, mealH, 24);
    ctx.stroke();

    const my = y + 56;
    ctx.fillStyle = text;
    ctx.font = '700 22px Barlow, sans-serif';
    ctx.fillText('🍽 Meals Tracked', cardX + 36, my);
    ctx.fillStyle = teal;
    ctx.font = '800 28px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${mealsDone}/${mealsTotal}`, cardX + cardW - 36, my + 2);
    ctx.textAlign = 'left';

    y += mealH + 30;
  }

  // ── PRs this week (optional) ──
  const weekAgo = Date.now() - 7 * 86400000;
  const recentPRs = sections.prs ? (S.prs || []).filter(p => p.ts && p.ts >= weekAgo).slice(0, 3) : [];
  if (recentPRs.length > 0) {
    const prH = 130 + (recentPRs.length - 1) * 36;
    ctx.fillStyle = surface;
    roundRect(ctx, cardX, y, cardW, prH, 24);
    ctx.fill();
    ctx.strokeStyle = border;
    roundRect(ctx, cardX, y, cardW, prH, 24);
    ctx.stroke();

    let py = y + 50;
    ctx.fillStyle = muted;
    ctx.font = '700 20px "Barlow Condensed", sans-serif';
    ctx.fillText('PRS THIS WEEK', cardX + 36, py);
    py += 38;

    recentPRs.forEach(p => {
      ctx.fillStyle = text;
      ctx.font = '700 18px Barlow, sans-serif';
      ctx.fillText(`🏆 ${p.ex}`, cardX + 36, py);
      ctx.fillStyle = '#f39c12';
      ctx.font = '700 18px Barlow, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(p.val, cardX + cardW - 36, py);
      ctx.textAlign = 'left';
      py += 36;
    });

    y += prH + 30;
  }

  // Footer
  y += 20;
  ctx.fillStyle = muted;
  ctx.font = '500 16px Barlow, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CaliTrack · Built for consistency', W / 2, y);
  ctx.textAlign = 'left';
  y += 50;

  // Crop the canvas to the actual content height so there's no empty space below the footer
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = W;
  finalCanvas.height = y;
  finalCanvas.getContext('2d').drawImage(canvas, 0, 0, W, y, 0, 0, W, y);
  return finalCanvas;
}

// Same-day cache, keyed by the active section toggles, so repeat opens of the
// modal on the same day don't redo the canvas work unless toggles changed.
let _summaryCache = { dateKey: null, sectionsKey: null, canvas: null };
let _summarySections = { challenges: true, meals: true, prs: true };

function _sectionsKeyFor(sections) {
  return `${sections.challenges?1:0}${sections.meals?1:0}${sections.prs?1:0}`;
}

async function _getOrBuildSummaryCanvas(sections) {
  const dateKey = todayStr();
  const sectionsKey = _sectionsKeyFor(sections);
  if (_summaryCache.canvas && _summaryCache.dateKey === dateKey && _summaryCache.sectionsKey === sectionsKey) {
    return _summaryCache.canvas;
  }
  const canvas = await buildWeeklySummaryCanvas(sections);
  _summaryCache = { dateKey, sectionsKey, canvas };
  return canvas;
}

function _invalidateSummaryCache() {
  _summaryCache = { dateKey: null, sectionsKey: null, canvas: null };
}

function renderSummaryToggles() {
  const wrap = document.getElementById('summary-toggles');
  if (!wrap) return;
  const defs = [
    { key: 'challenges', label: 'Challenges' },
    { key: 'meals', label: 'Meals' },
    { key: 'prs', label: 'PRs' },
  ];
  wrap.innerHTML = defs.map(d =>
    `<button class="summary-toggle-chip${_summarySections[d.key] ? ' on' : ''}" data-key="${d.key}">${_summarySections[d.key] ? '✓' : ''} ${d.label}</button>`
  ).join('');
  wrap.querySelectorAll('.summary-toggle-chip').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      _summarySections[key] = !_summarySections[key];
      renderSummaryToggles();
      await _renderSummaryPreview();
    });
  });
}

async function _renderSummaryPreview() {
  const overlay = document.getElementById('summary-overlay');
  const img = document.getElementById('summary-img');
  const canvas = await _getOrBuildSummaryCanvas(_summarySections);
  img.src = canvas.toDataURL('image/png');
  overlay._canvas = canvas;
}

async function openWeeklySummary() {
  const overlay = document.getElementById('summary-overlay');
  overlay.classList.add('open');
  renderSummaryToggles();
  await _renderSummaryPreview();
}

function closeWeeklySummary() {
  document.getElementById('summary-overlay').classList.remove('open');
  // Invalidate so the next open always reflects any data changes made since this session
  _invalidateSummaryCache();
}

async function downloadWeeklySummary() {
  const overlay = document.getElementById('summary-overlay');
  const canvas = overlay._canvas;
  if (!canvas) return;
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calitrack-week-${todayStr()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

async function shareWeeklySummary() {
  const overlay = document.getElementById('summary-overlay');
  const canvas = overlay._canvas;
  if (!canvas) return;
  canvas.toBlob(async blob => {
    const file = new File([blob], `calitrack-week-${todayStr()}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My CaliTrack Week' });
      } catch(e) { /* user cancelled — no-op */ }
    } else {
      downloadWeeklySummary();
    }
  }, 'image/png');
}
