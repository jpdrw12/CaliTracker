function switchBodyTab(tab) {
  S.bodyTab = tab;
  ['weight','measurements','prs','challenges'].forEach(t => {
    const sec = document.getElementById('body-'+t+'-section');
    const btn = document.getElementById('btab-'+t);
    if (sec) sec.style.display = t === tab ? '' : 'none';
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'measurements') { renderMeasGrid(); renderPhotoGallery(); }
  if (tab === 'challenges') { renderBodyCompletedChallenges(); }
}

function renderBodyPage() {
  switchBodyTab(S.bodyTab||'weight');
  renderWeightChart();
  renderMeasGrid();
  renderPRList();
  renderBodyCompletedChallenges();
}

function renderBodyCompletedChallenges() {
  const wrap = document.getElementById('body-completed-challenges-wrap');
  if (!wrap) return;
  const completed = (S.completedChallenges || []).slice().reverse();
  const CMETA = { pushups:{label:'Push-ups',emoji:'💪',color:'#1abc9c'}, situps:{label:'Sit-ups',emoji:'🙇',color:'#f39c12'}, squats:{label:'Squats',emoji:'🦵',color:'#8e44ad'} };

  // Active challenges — same card pattern as the Today-tab strip
  const active = Object.entries(S.challenges||{}).filter(([,c])=>c);
  let activeHTML = '';
  if (active.length) {
    const rows = active.map(([key,c]) => {
      const m = CMETA[key];
      const total = getChallengeTotalDone(c);
      const pct = Math.min(100, Math.round((total/c.totalGoal)*100));
      const isComplete = c.completed || total >= c.totalGoal;
      const cStreak = getChallengeStreak(c);
      return `<div class="challenge-strip-row" onclick="openChallengeSheet('${key}')">
        <div class="challenge-strip-icon">${m.emoji}</div>
        <div class="challenge-strip-info">
          <div class="challenge-strip-name">${m.label}${isComplete ? ' <span style="color:gold;font-size:10px">✓ COMPLETE</span>' : ''}${cStreak > 1 ? ` <span style="color:#f39c12;font-size:10px">🔥 ${cStreak}d</span>` : ''}</div>
          <div class="challenge-strip-sub">${total} / ${c.totalGoal} total · ${pct}%</div>
          <div class="challenge-strip-bar-track"><div class="challenge-strip-bar-fill" style="width:${pct}%;background:${m.color}"></div></div>
        </div>
        <div class="challenge-strip-arrow">›</div>
      </div>`;
    }).join('');
    activeHTML = `<div class="data-section-title" style="margin-top:0">ACTIVE</div><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">${rows}</div>`;
  }

  if (completed.length === 0 && !activeHTML) {
    wrap.innerHTML = '<div class="today-empty" style="padding:32px 0;text-align:center;color:var(--muted);font-size:13px">No challenges yet.<br>Start one from the Today tab.</div>';
    return;
  }
  if (completed.length === 0 && activeHTML) {
    wrap.innerHTML = activeHTML;
    return;
  }

  let histHTML = '';
  if (completed.length > 0) {
    const grouped = {};
    completed.forEach(r => {
      if (!grouped[r.exercise]) grouped[r.exercise] = [];
      grouped[r.exercise].push(r);
    });
    const groupsHTML = Object.entries(grouped).map(([key, runs]) => {
      const m = CMETA[key] || {label:key, emoji:'🏆'};
      const rows = runs.map((r, i) => {
        const date = r.completedAt ? new Date(r.completedAt).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}) : '—';
        const runNum = runs.length - i;
        return `<div class="completed-run-row">
          <span class="completed-run-num">Run #${runNum}</span>
          <span class="completed-run-reps">${r.totalReps} reps</span>
          <span class="completed-run-date">${date}</span>
        </div>`;
      }).join('');
      return `<div class="completed-challenge-group">
        <div class="completed-challenge-hdr">${m.emoji} ${m.label} <span class="completed-run-badge">${runs.length} run${runs.length!==1?'s':''}</span></div>
        ${rows}
      </div>`;
    }).join('');
    histHTML = `<div class="data-section-title">COMPLETED</div><div class="data-card">${groupsHTML}</div>`;
  }

  wrap.innerHTML = activeHTML + histHTML;
}

// ── WEIGHT LOG ──
function logWeight() {
  const val = parseFloat(document.getElementById('weight-inp').value);
  const unit = document.getElementById('weight-unit').value;
  if (!val || val <= 0) { toast('Enter a valid weight', '#e74c3c'); return; }
  if (!S.weightLog) S.weightLog = [];
  S.weightLog.push({ date: todayStr(), val, unit, ts: Date.now() });
  S.weightLog.sort((a,b) => a.date.localeCompare(b.date));
  document.getElementById('weight-inp').value = '';
  save(); renderWeightChart(); toast('✓ Weight logged');
}

function renderWeightChart() {
  if (!S.weightLog) S.weightLog = [];
  const log = S.weightLog.slice(-12); // last 12 entries

  // Latest value
  const latestEl = document.getElementById('weight-latest');
  if (log.length > 0) {
    const last = log[log.length-1];
    latestEl.textContent = `${last.val} ${last.unit}`;
  } else {
    latestEl.textContent = '—';
  }

  // SVG chart
  const svg = document.getElementById('weight-chart-svg');
  svg.innerHTML = `<defs><linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1abc9c" stop-opacity="0.5"/><stop offset="100%" stop-color="#1abc9c" stop-opacity="0"/></linearGradient></defs>`;
  if (log.length < 2) {
    svg.innerHTML += `<text x="50%" y="50%" text-anchor="middle" fill="#444" font-size="11" font-family="Barlow,sans-serif">Log at least 2 entries to see chart</text>`;
  } else {
    const W = 280, H = 72;
    const vals = log.map(e => e.val);
    const min = Math.min(...vals) * 0.995;
    const max = Math.max(...vals) * 1.005;
    const px = (i) => (i/(log.length-1))*W;
    const py = (v) => H - ((v-min)/(max-min||1))*H;
    const pts = log.map((e,i) => `${px(i)},${py(e.val)}`).join(' ');
    const areaD = `M${px(0)},${H} ` + log.map((e,i) => `L${px(i)},${py(e.val)}`).join(' ') + ` L${px(log.length-1)},${H} Z`;
    svg.innerHTML += `
      <defs><linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1abc9c" stop-opacity="0.5"/><stop offset="100%" stop-color="#1abc9c" stop-opacity="0"/></linearGradient></defs>
      <path d="${areaD}" fill="url(#bodyGrad)"/>
      <polyline points="${pts}" class="body-chart-line"/>
      ${log.map((e,i)=>`<circle cx="${px(i)}" cy="${py(e.val)}" r="3" class="body-chart-dot"/>`).join('')}`;
  }

  // History list
  const hist = document.getElementById('weight-history');
  if (!hist) return;
  hist.innerHTML = '';
  const reversed = [...S.weightLog].reverse().slice(0,10);
  if (reversed.length === 0) {
    hist.innerHTML = '<div class="today-empty">No entries yet. Log your weight above.</div>';
    return;
  }
  reversed.forEach((entry, i) => {
    const prev = S.weightLog[S.weightLog.length - 1 - i - 1];
    let deltaHTML = '';
    if (prev && prev.unit === entry.unit) {
      const diff = (entry.val - prev.val).toFixed(1);
      if (diff > 0) deltaHTML = `<span class="body-log-delta up">▲ ${diff}</span>`;
      else if (diff < 0) deltaHTML = `<span class="body-log-delta down">▼ ${Math.abs(diff)}</span>`;
    }
    const row = document.createElement('div');
    row.className = 'body-log-row';
    row.innerHTML = `
      <div class="body-log-date">${new Date(entry.date+'T00:00:00').toLocaleDateString('en',{month:'short',day:'numeric'})}</div>
      <div class="body-log-val">${entry.val} <span style="font-size:11px;color:var(--muted)">${entry.unit}</span></div>
      ${deltaHTML}
      <button class="body-log-del" data-ts="${entry.ts}">×</button>`;
    row.querySelector('.body-log-del').onclick = () => {
      S.weightLog = S.weightLog.filter(e => e.ts !== entry.ts);
      save(); renderWeightChart();
    };
    hist.appendChild(row);
  });
}

// ── MEASUREMENTS ──
const MEAS_TYPES = ['waist','chest','arms','hips','thighs'];

function selectMeasType(t) {
  activeMeasType = t;
  MEAS_TYPES.forEach(m => document.getElementById('meas-'+m).classList.toggle('sel', m===t));
}

function logMeasurement() {
  const val = parseFloat(document.getElementById('meas-inp').value);
  if (!val || val <= 0) { toast('Enter a valid measurement', '#e74c3c'); return; }
  if (!S.measurements) S.measurements = {};
  if (!S.measurements[activeMeasType]) S.measurements[activeMeasType] = [];
  S.measurements[activeMeasType].push({ date: todayStr(), val, ts: Date.now() });
  document.getElementById('meas-inp').value = '';
  save(); renderMeasGrid(); toast(`✓ ${activeMeasType} logged`);
}

function renderMeasGrid() {
  if (!S.measurements) S.measurements = {};
  const grid = document.getElementById('meas-grid');
  if (!grid) return;
  grid.innerHTML = '';
  MEAS_TYPES.forEach(type => {
    const entries = S.measurements[type] || [];
    const latest = entries[entries.length-1];
    const card = document.createElement('div');
    card.className = 'meas-card';
    card.innerHTML = `
      <div class="meas-card-label">${type}</div>
      <div class="meas-card-val">${latest ? latest.val : '—'}<span class="meas-card-unit">${latest ? 'cm' : ''}</span></div>
      <div class="meas-card-date">${latest ? new Date(latest.date+'T00:00:00').toLocaleDateString('en',{month:'short',day:'numeric'}) : 'Not logged'}</div>`;
    grid.appendChild(card);
  });
}

// ── PROGRESS PHOTOS ──
function handlePhotoCapture(inp) {
  if (!inp.files || !inp.files[0]) return;
  const file = inp.files[0];
  if (file.size > 5 * 1024 * 1024) { toast('Photo too large (max 5MB)', '#e74c3c'); inp.value=''; return; }
  const reader = new FileReader();
  reader.onload = function(ev) {
    const note = (document.getElementById('photo-note-inp').value || '').trim();
    if (!S.progressPhotos) S.progressPhotos = [];
    S.progressPhotos.unshift({ id: Date.now(), date: todayStr(), ts: Date.now(), dataUrl: ev.target.result, note });
    document.getElementById('photo-note-inp').value = '';
    inp.value = '';
    save(); renderPhotoGallery(); toast('✓ Photo saved');
  };
  reader.readAsDataURL(file);
}

function renderPhotoGallery() {
  const gallery = document.getElementById('photo-gallery');
  if (!gallery) return;
  gallery.innerHTML = '';
  const photos = S.progressPhotos || [];
  if (photos.length === 0) {
    gallery.innerHTML = '<div class="photo-empty" style="grid-column:1/-1">No photos yet — tap Add Photo to start your progress history</div>';
    return;
  }
  photos.forEach(photo => {
    const wrap = document.createElement('div');
    wrap.className = 'photo-thumb-wrap';
    const dateLabel = new Date(photo.date+'T00:00:00').toLocaleDateString('en',{month:'short',day:'numeric'});
    wrap.innerHTML = `<img class="photo-thumb" src="${photo.dataUrl}" loading="lazy"/><div class="photo-thumb-date">${dateLabel}</div>`;
    wrap.querySelector('img').addEventListener('click', () => openPhotoLightbox(photo));
    gallery.appendChild(wrap);
  });
}

function openPhotoLightbox(photo) {
  const dateLabel = new Date(photo.date+'T00:00:00').toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'});
  const lb = document.createElement('div');
  lb.className = 'photo-lightbox';
  lb.innerHTML = `
    <button class="photo-lightbox-close" id="lb-close">✕</button>
    <img src="${photo.dataUrl}"/>
    <div class="photo-lightbox-meta">${dateLabel}${photo.note ? ' · ' + photo.note : ''}</div>
    <button class="photo-lightbox-del" id="lb-del">🗑 Delete Photo</button>`;
  document.body.appendChild(lb);
  lb.querySelector('#lb-close').addEventListener('click', () => lb.remove());
  lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
  lb.querySelector('#lb-del').addEventListener('click', () => {
    if (!confirm('Delete this photo?')) return;
    S.progressPhotos = (S.progressPhotos || []).filter(p => p.id !== photo.id);
    save(); renderPhotoGallery(); lb.remove(); toast('Photo deleted');
  });
}
