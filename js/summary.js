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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function buildWeeklySummaryCanvas() {
  const W = 750, H = 1100;
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

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  let y = 60;

  // Header
  ctx.fillStyle = muted;
  ctx.font = '600 22px Barlow, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FLOOR CALISTHENICS', 50, y);
  y += 50;
  ctx.fillStyle = text;
  ctx.font = '800 56px "Barlow Condensed", sans-serif';
  ctx.fillText('WEEKLY SUMMARY', 50, y);
  y += 36;
  ctx.fillStyle = muted;
  ctx.font = '500 24px Barlow, sans-serif';
  ctx.fillText(getWeekDateRange(), 50, y);
  y += 60;

  // ── Workout card ──
  const cardX = 50, cardW = W - 100;
  let cardH = 230;
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

  cy += 50;
  // Day dots
  const dotSize = 16, gap = (cardW - 72 - dotSize * 7) / 6;
  for (let i = 0; i < 7; i++) {
    const d = getWorkoutDay(i);
    const pct = woDayPct(i);
    const dx = cardX + 36 + i * (dotSize + gap);
    ctx.beginPath();
    ctx.arc(dx + dotSize / 2, cy, dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = pct >= 100 ? d.color : (isLight ? '#e8e8e0' : '#1a1a2e');
    ctx.fill();
    if (pct >= 100) {
      ctx.fillStyle = '#fff';
      ctx.font = '700 11px Barlow, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓', dx + dotSize/2, cy + 4);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = muted;
    ctx.font = '600 13px Barlow, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.name, dx + dotSize / 2, cy + 28);
    ctx.textAlign = 'left';
  }

  cy += 60;
  const streak = calcStreak();
  ctx.fillStyle = '#f39c12';
  ctx.font = '700 18px "Barlow Condensed", sans-serif';
  ctx.fillText(streak > 0 ? `🔥 ${streak} day streak` : 'No active streak', cardX + 36, cy);

  y += cardH + 30;

  // ── Challenges ──
  const activeKeys = Object.entries(S.challenges || {}).filter(([,c]) => c);
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

  // ── PRs this week (optional) ──
  const weekAgo = Date.now() - 7 * 86400000;
  const recentPRs = (S.prs || []).filter(p => p.ts && p.ts >= weekAgo).slice(0, 3);
  if (recentPRs.length > 0) {
    const prH = 50 + recentPRs.length * 46;
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
  ctx.fillStyle = muted;
  ctx.font = '500 16px Barlow, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CaliTrack · Built for consistency', W / 2, H - 40);
  ctx.textAlign = 'left';

  return canvas;
}

async function openWeeklySummary() {
  const canvas = await buildWeeklySummaryCanvas();
  const overlay = document.getElementById('summary-overlay');
  const img = document.getElementById('summary-img');
  img.src = canvas.toDataURL('image/png');
  overlay.classList.add('open');
  overlay._canvas = canvas;
}

function closeWeeklySummary() {
  document.getElementById('summary-overlay').classList.remove('open');
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
