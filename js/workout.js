function renderWorkout(){
  try{renderWorkoutChallengeBanner();}catch(e){}
  // Preserve scroll position
  const pageEl = document.getElementById('page-workout');
  const scrollY = pageEl ? pageEl.scrollTop : 0;

  const pct=woWeekPct();
  const streak=calcStreak();
  document.getElementById('wo-prog').style.width=pct+'%';
  document.getElementById('wo-pct-lbl').textContent=pct+'%';
  document.getElementById('wo-wk').textContent=`W${S.woISOWeek||getISOWeek(new Date())} (${S.woWeek+1})`;
  const streakEl=document.getElementById('wo-streak');
  if(streakEl){streakEl.textContent=streak>0?`🔥 ${streak} day streak`:'';}

  // Day selector — mark today
  const todayIdx = todayWorkoutDayIdx();
  const sel=document.getElementById('wo-day-sel');

  // Remove any existing today-btn wrapper
  const existing = document.getElementById('today-jump-wrap');
  if(existing) existing.remove();

  sel.innerHTML='';

  // Today button if viewing a different day
  if(S.woDay !== todayIdx){
    const wrap = document.createElement('div');
    wrap.id = 'today-jump-wrap';
    wrap.style.cssText = 'display:flex;align-items:center;padding:8px 16px 0;';
    const todayBtn = document.createElement('button');
    todayBtn.className = 'wo-today-btn';
    todayBtn.textContent = '⤎ Today';
    todayBtn.onclick = () => { S.woDay = todayIdx; save(); renderWorkout(); };
    wrap.appendChild(todayBtn);
    sel.parentElement.insertBefore(wrap, sel);
  }

  WORKOUTS.forEach((d,i)=>{
    const p=woDayPct(i),active=i===S.woDay,isToday=i===todayIdx;
    const btn=document.createElement('button');
    btn.className='day-btn'+(active?' active':'')+(isToday?' today-day':'');
    btn.style.cssText=`--dc:${d.color};--dbg:${d.bg}1a`;
    btn.innerHTML=`<div class="de">${d.emoji}</div><div class="dn">${d.name}${isToday?'<span style="font-size:7px;color:var(--teal);display:block">TODAY</span>':''}</div><div class="dt">${d.label}</div>${p>0?`<div class="mb-track"><div class="mb-fill" style="width:${p}%;background:${d.color}"></div></div>`:'<div style="height:8px"></div>'}`;
    btn.onclick=()=>{S.woDay=i;save();renderWorkout();};
    sel.appendChild(btn);
  });

  const d=getWorkoutDay(S.woDay),p=woDayPct(S.woDay);
  const info=WORKOUT_INFO[d.type],isOpen=S.infoOpen===S.woDay;
  document.getElementById('wo-day-hdr').innerHTML=`
    <div class="dhc" style="background:${d.bg}1a;border-color:${d.color}44" id="dhc-card">
      <div style="display:flex;align-items:center;gap:12px;width:100%">
        <div class="dhe">${d.emoji}</div>
        <div style="flex:1"><div class="dht" style="color:${d.color}">Day ${d.day} — ${d.name}</div><div class="dhtitle">${d.label.toUpperCase()} DAY</div><div class="dhn">${d.note}</div></div>
        <div class="dpct"><div class="dpct-n" style="color:${d.color}">${p}%</div><div class="dpct-l">DONE</div></div>
        <div class="dhc-toggle${isOpen?' open':''}" id="dhc-arrow">▼</div>
      </div>
      <div class="dhc-info${isOpen?' open':''}" id="dhc-info">
        <div class="dhc-info-title" style="color:${d.color}">${info.title}</div>
        <div class="dhc-info-body">${info.body}</div>
        ${info.tips.map(t=>`<div class="dhc-tip"><span class="dhc-tip-icon">${t.icon}</span><span>${t.text}</span></div>`).join('')}
      </div>
    </div>`;
  document.getElementById('dhc-card').addEventListener('click',()=>{
    S.infoOpen=(S.infoOpen===S.woDay)?null:S.woDay;save();renderWorkout();
  });

  const el=document.getElementById('exercises');el.innerHTML='';
  getWorkoutDay(S.woDay).exercises.forEach(ex=>{
    const exData=getExData(S.woDay,ex);
    const done=Array.from({length:exData.sets},(_,i)=>S.logs[wKey(S.woWeek,S.woDay,ex.id,i+1)]?.done?1:0).reduce((a,b)=>a+b,0);
    const all=done===exData.sets,infoKey=S.woDay+'-'+ex.id,isOpen=S.exInfoOpen===infoKey;
    const info=EXERCISE_INFO[ex.name];
    const card=document.createElement('div');
    card.className='ex-card'+(all?' done':'');
    card.style.setProperty('--dc',d.color);
    const stepsHTML=info?`<div class="ex-how${isOpen?' open':''}"><div class="ex-how-title">How to perform</div><ul class="ex-how-steps">${info.steps.map((s,i)=>`<li data-n="${i+1}">${s}</li>`).join('')}</ul>${info.note?`<div class="ex-how-note">💡 ${info.note}</div>`:''}</div>`:'';
    let rows='';
    for(let s=1;s<=exData.sets;s++){
      const k=wKey(S.woWeek,S.woDay,ex.id,s),e=S.logs[k]||{};
      const prev=getPrevReps(S.woDay,ex.id,s);
      const prevHint=prev?`<span class="prev-reps">Last: ${prev}</span>`:'';
      if(isTimedExercise(exData.target)){
        if(isDualSided(exData.target)){
          const doneL=!!(e.repsL&&e.doneL),doneR=!!(e.repsR&&e.doneR),allDone=e.done;
          rows+=`<div class="set-row set-row-dual"><button class="set-chk${allDone?' done':''}" data-k="${k}"></button><span class="set-lbl">Set ${s}</span><div class="dual-timers"><button class="timer-btn timer-btn-L${doneL?' done-timer':''}" data-k="${k}" data-side="L"><span>⏱</span><span class="side-lbl">L</span><span class="timer-val" id="tvL-${k}">${doneL?e.repsL:'0:00'}</span></button><button class="timer-btn timer-btn-R${doneR?' done-timer':''}" data-k="${k}" data-side="R"><span>⏱</span><span class="side-lbl">R</span><span class="timer-val" id="tvR-${k}">${doneR?e.repsR:'0:00'}</span></button></div>${prevHint}</div>`;
        } else {
          const alreadyDone=e.done,timerVal=e.reps||'0:00';
          rows+=`<div class="set-row"><button class="set-chk${e.done?' done':''}" data-k="${k}"></button><span class="set-lbl">Set ${s}</span><button class="timer-btn${e.done?' done-timer':''}" data-k="${k}"><span>⏱</span><span class="timer-val" id="tv-${k}">${e.done?timerVal:'0:00'}</span></button>${prevHint}</div>`;
        }
      } else {
        rows+=`<div class="set-row"><button class="set-chk${e.done?' done':''}" data-k="${k}"></button><span class="set-lbl">Set ${s}</span><input class="set-inp" inputmode="numeric" type="text" placeholder="${prev?'Last: '+prev:'reps / time'}" value="${e.reps||''}" data-k="${k}"/>${prevHint}</div>`;
      }
    }
    const customBadge=exData.isCustom?`<span class="ex-custom-badge">custom</span>`:'';
    card.innerHTML=`
      <div class="ex-top" id="extop-${infoKey}">
        <div><div class="ex-name">${ex.name}${customBadge}</div><div class="ex-meta">${exData.sets} sets · ${exData.target}</div></div>
        <div style="display:flex;align-items:center;gap:5px">
          <div class="ex-badge${all?' done':''}" style="${all?`background:${d.color}`:''}">${done}/${exData.sets}</div>
          <button class="ex-edit-btn" title="Edit">⚙</button>
          ${info?`<button class="ex-info-btn${isOpen?' open':''}" id="exbtn-${infoKey}">▼</button>`:''}
        </div>
      </div>${stepsHTML}${rows}`;
    if(info)card.querySelector(`#extop-${infoKey}`).addEventListener('click',e=>{
      if(e.target.classList.contains('ex-edit-btn'))return;
      S.exInfoOpen=(S.exInfoOpen===infoKey)?null:infoKey;save();renderWorkout();
    });
    card.querySelector('.ex-edit-btn').addEventListener('click',e=>{
      e.stopPropagation();openExEdit(S.woDay,ex);
    });
    card.querySelectorAll('.set-chk').forEach(b=>b.addEventListener('click',e=>{
      e.stopPropagation();
      const k=b.dataset.k;if(!S.logs[k])S.logs[k]={};
      const wasUnchecked=!S.logs[k].done;
      S.logs[k].done=!S.logs[k].done;
      if(!S.logs[k].done){
        // Unchecking — clear timer state so buttons reset
        delete S.logs[k].reps;
        delete S.logs[k].repsL;delete S.logs[k].doneL;
        delete S.logs[k].repsR;delete S.logs[k].doneR;
        // Stop any running timers for this key
        [k,k+'-L',k+'-R'].forEach(tk=>{if(activeTimers[tk]){clearInterval(activeTimers[tk].iv);delete activeTimers[tk];}});
      }
      save();renderWorkout();checkDayCompletion();
      if(navigator.vibrate)navigator.vibrate(8);
      if(wasUnchecked&&S.logs[k].done){
        const restSecs=REST_TIMES[getWorkoutDay(S.woDay).type]||90;
        if(restSecs>0)startRestTimer(restSecs);
      }
    }));
    card.querySelectorAll('.set-inp').forEach(inp=>inp.addEventListener('input',()=>{
      const k=inp.dataset.k;if(!S.logs[k])S.logs[k]={};S.logs[k].reps=inp.value;save();
    }));
    card.querySelectorAll('.set-inp').forEach(inp=>inp.addEventListener('blur',()=>{
      if(inp.value) checkForPR(ex.name, inp.value);
    }));
    card.querySelectorAll('.timer-btn').forEach(btn=>btn.addEventListener('click',e=>{
      e.stopPropagation();
      const k=btn.dataset.k,side=btn.dataset.side||null;
      const tk=side?k+'-'+side:k;
      if(activeTimers[tk]){
        clearInterval(activeTimers[tk].iv);
        const elapsed=activeTimers[tk].elapsed;
        delete activeTimers[tk];
        if(!S.logs[k])S.logs[k]={};
        if(side){
          S.logs[k]['reps'+side]=fmtElapsed(elapsed);
          S.logs[k]['done'+side]=true;
          checkForTimedPR(ex.name, fmtElapsed(elapsed));
          if(S.logs[k].doneL&&S.logs[k].doneR){S.logs[k].done=true;save();renderWorkout();checkDayCompletion();if(navigator.vibrate)navigator.vibrate(8);const restSecs=REST_TIMES[getWorkoutDay(S.woDay).type]||90;if(restSecs>0)startRestTimer(restSecs);}
          else{save();const tv=document.getElementById('tv'+side+'-'+k);if(tv)tv.textContent=fmtElapsed(elapsed);btn.classList.remove('running');btn.classList.add('done-timer');btn.disabled=true;}
        } else {
          S.logs[k].reps=fmtElapsed(elapsed);
          S.logs[k].done=true;
          checkForTimedPR(ex.name, fmtElapsed(elapsed));
          save();renderWorkout();checkDayCompletion();
          if(navigator.vibrate)navigator.vibrate(8);
          const restSecs=REST_TIMES[getWorkoutDay(S.woDay).type]||90;
          if(restSecs>0)startRestTimer(restSecs);
        }
      } else {
        activeTimers[tk]={elapsed:0,iv:null};
        btn.classList.add('running');
        activeTimers[tk].iv=setInterval(()=>{
          activeTimers[tk].elapsed++;
          const tvId=side?'tv'+side+'-'+k:'tv-'+k;
          const tv=document.getElementById(tvId);
          if(tv)tv.textContent=fmtElapsed(activeTimers[tk].elapsed);
        },1000);
      }
    }));
    el.appendChild(card);
  });

  loadSessionNote();
  renderWorkoutHistory();
  if(pageEl&&scrollY)requestAnimationFrame(()=>{pageEl.scrollTop=scrollY;});
}

// ═══════════════════════════════════════════════════
// WORKOUT HISTORY LOG
// ═══════════════════════════════════════════════════
function getSessionPct(week, dayIdx) {
  const d = WORKOUTS[dayIdx];
  let totalSets = 0, doneSets = 0;
  d.exercises.forEach(ex => {
    for (let s = 1; s <= ex.sets; s++) {
      totalSets++;
      if (S.logs[wKey(week, dayIdx, ex.id, s)]?.done) doneSets++;
    }
  });
  return totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
}

function buildWorkoutHistory() {
  // Find every week+day combo that has at least one logged set
  const sessions = {};
  Object.keys(S.logs).forEach(k => {
    const m = k.match(/^w(\d+)-d(\d+)-/);
    if (!m) return;
    const week = parseInt(m[1]), day = parseInt(m[2]);
    const key = `${week}-${day}`;
    if (!sessions[key] && S.logs[k]?.done) sessions[key] = { week, day };
    else if (!sessions[key]) sessions[key] = { week, day, hasAny: true };
  });
  // Filter to sessions with at least one done set
  const list = Object.values(sessions).filter(s => {
    const d = WORKOUTS[s.day];
    return d.exercises.some(ex => {
      for (let i = 1; i <= ex.sets; i++) {
        if (S.logs[wKey(s.week, s.day, ex.id, i)]?.done) return true;
      }
      return false;
    });
  });
  // Sort newest first (higher week number = more recent, then later day index)
  list.sort((a,b) => b.week - a.week || b.day - a.day);
  return list;
}

let _woHistoryToggleBound = false;
function initWorkoutHistoryToggle() {
  if (_woHistoryToggleBound) return;
  const toggle = document.getElementById('wo-history-toggle');
  const body   = document.getElementById('wo-history-body');
  const arrow  = document.getElementById('wo-history-arrow');
  if (!toggle || !body || !arrow) return;
  toggle.addEventListener('click', () => {
    const open = body.classList.toggle('open');
    arrow.classList.toggle('open', open);
  });
  _woHistoryToggleBound = true;
}

function renderWorkoutHistory() {
  initWorkoutHistoryToggle();
  const listEl = document.getElementById('wo-history-list');
  if (!listEl) return;
  const sessions = buildWorkoutHistory();

  if (sessions.length === 0) {
    listEl.innerHTML = '<div class="wo-history-empty">No completed sessions yet — log a set to start your history</div>';
    return;
  }

  listEl.innerHTML = sessions.slice(0, 30).map(s => {
    const d = WORKOUTS[s.day];
    const pct = getSessionPct(s.week, s.day);
    const note = (S.sessionNotes || {})[sessionNoteKey(s.week, s.day)] || '';
    const noteHtml = note ? `<div class="wo-history-session-note">"${note.length > 80 ? note.slice(0,80)+'…' : note}"</div>` : '';
    return `<div class="wo-history-session" data-week="${s.week}" data-day="${s.day}">
      <div class="wo-history-session-hdr">
        <div class="wo-history-session-day"><span class="wo-history-dot" style="background:${d.color}"></span>W${s.week+1} · ${d.name} — ${d.label}</div>
        <div class="wo-history-session-pct">${pct}%</div>
      </div>
      <div class="wo-history-session-sub">${d.exercises.length} exercises</div>
      ${noteHtml}
    </div>`;
  }).join('');

  listEl.querySelectorAll('.wo-history-session').forEach(el => {
    el.addEventListener('click', () => {
      const week = parseInt(el.dataset.week), day = parseInt(el.dataset.day);
      S.woWeek = week; S.woDay = day; save(); renderWorkout();
      toast(`Viewing W${week+1} · ${WORKOUTS[day].name}`);
    });
  });
}


// ═══════════════════════════════════════════════════
// PR DETECTION (Phase 18)
// ═══════════════════════════════════════════════════
function parseRepValue(str) {
  if (!str) return null;
  const s = str.toString().toLowerCase().trim();
  // Skip timed values (contain sec/min) — PRs here track reps, not time
  if (/\b(sec|min)\b/.test(s)) return null;
  // Handle ranges like "8-10" or "8–10" — take the higher number
  const rangeMatch = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return Math.max(parseInt(rangeMatch[1]), parseInt(rangeMatch[2]));
  const numMatch = s.match(/(\d+)/);
  return numMatch ? parseInt(numMatch[1]) : null;
}

function checkForPR(exName, repsStr) {
  const newVal = parseRepValue(repsStr);
  if (newVal === null) return;
  if (!S.prs) S.prs = [];
  const idx = S.prs.findIndex(p => p.ex.toLowerCase() === exName.toLowerCase());
  const existing = idx >= 0 ? S.prs[idx] : null;
  const existingVal = existing ? parseRepValue(existing.val) : null;

  if (existingVal === null || newVal > existingVal) {
    const entry = { ex: exName, val: `${newVal} reps`, date: todayStr(), ts: Date.now() };
    if (idx >= 0) S.prs[idx] = entry;
    else S.prs.push(entry);
    save();
    if (existingVal !== null) {
      toast(`🏆 New PR! ${exName}: ${newVal} reps (was ${existingVal})`, '#f39c12');
    } else {
      toast(`🏆 First PR logged! ${exName}: ${newVal} reps`, '#f39c12');
    }
    try { renderPRList(); } catch(e) {}
  }
}

// Parses a duration string ("45s" or "1:23") into total seconds. Returns null if unparseable.
function parseTimeValue(str) {
  if (!str) return null;
  const s = str.toString().trim().toLowerCase();
  const colonMatch = s.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  const secMatch = s.match(/^(\d+)s$/);
  if (secMatch) return parseInt(secMatch[1]);
  const numMatch = s.match(/^(\d+)$/);
  return numMatch ? parseInt(numMatch[1]) : null;
}

// Formats a total-seconds value back into the same "M:SS" / "Ns" style used by fmtElapsed,
// for display in the PR list (so "65" -> "1:05", "45" -> "45s").
function formatTimeValue(totalSecs) {
  return fmtElapsed(totalSecs);
}

// PR detection for timed exercises (Plank, Hollow Body Hold, etc.) — longer duration is the improvement.
function checkForTimedPR(exName, timeStr) {
  const newSecs = parseTimeValue(timeStr);
  if (newSecs === null) return;
  if (!S.prs) S.prs = [];
  const idx = S.prs.findIndex(p => p.ex.toLowerCase() === exName.toLowerCase());
  const existing = idx >= 0 ? S.prs[idx] : null;
  const existingSecs = existing ? parseTimeValue(existing.val) : null;

  if (existingSecs === null || newSecs > existingSecs) {
    const entry = { ex: exName, val: formatTimeValue(newSecs), date: todayStr(), ts: Date.now() };
    if (idx >= 0) S.prs[idx] = entry;
    else S.prs.push(entry);
    save();
    if (existingSecs !== null) {
      toast(`🏆 New PR! ${exName}: ${formatTimeValue(newSecs)} (was ${formatTimeValue(existingSecs)})`, '#f39c12');
    } else {
      toast(`🏆 First PR logged! ${exName}: ${formatTimeValue(newSecs)}`, '#f39c12');
    }
    try { renderPRList(); } catch(e) {}
  }
}

// ═══════════════════════════════════════════════════
// DAY EDIT (Phase 19)
// ═══════════════════════════════════════════════════
let _dayEditDay = null;
let _dayEditExercises = [];
let _dayEditType = 'heavy';

function openDayEdit() {
  const dayIdx = S.woDay;
  _dayEditDay = dayIdx;
  const d = getWorkoutDay(dayIdx);
  _dayEditExercises = d.exercises.map(ex => ({ ...ex }));
  _dayEditType = d.type;

  document.getElementById('day-edit-title').textContent = `EDIT ${d.name.toUpperCase()}`;
  document.getElementById('day-edit-label').value = d.label || '';
  renderDayTypeButtons();
  renderDayEditExList();
  document.getElementById('day-edit-modal').classList.add('open');
}

function closeDayEdit() {
  document.getElementById('day-edit-modal').classList.remove('open');
}

function renderDayTypeButtons() {
  const types = [
    { id:'heavy', label:'Heavy', color:'#e74c3c' },
    { id:'medium', label:'Medium', color:'#f39c12' },
    { id:'light', label:'Light', color:'#27ae60' },
    { id:'recovery', label:'Recovery', color:'#8e44ad' },
  ];
  document.getElementById('day-type-btns').innerHTML = types.map(t =>
    `<button class="day-type-btn${_dayEditType===t.id?' active':''}"
      onclick="_dayEditType='${t.id}';renderDayTypeButtons()"
      style="${_dayEditType===t.id?`border-color:${t.color};color:${t.color};background:${t.color}1a`:''}"
    >${t.label}</button>`
  ).join('');
}

function renderDayEditExList() {
  const el = document.getElementById('day-edit-ex-list');
  const countEl = document.getElementById('day-edit-ex-count');
  if (countEl) countEl.textContent = `(${_dayEditExercises.length})`;
  if (_dayEditExercises.length === 0) {
    el.innerHTML = '<div style="padding:12px 0;color:var(--muted);font-size:13px;font-style:italic">No exercises — add one below</div>';
    return;
  }
  el.innerHTML = _dayEditExercises.map((ex, i) => `
    <div class="day-edit-ex-row">
      <span class="day-edit-ex-name">${ex.name}</span>
      ${i > 0 ? `<button class="day-edit-ex-move" onclick="moveDayEditEx(${i},-1)">↑</button>` : '<span style="width:24px"></span>'}
      ${i < _dayEditExercises.length-1 ? `<button class="day-edit-ex-move" onclick="moveDayEditEx(${i},1)">↓</button>` : '<span style="width:24px"></span>'}
      <button class="day-edit-ex-remove" onclick="removeDayEditEx(${i})">✕</button>
    </div>`).join('');
}

function moveDayEditEx(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= _dayEditExercises.length) return;
  [_dayEditExercises[i], _dayEditExercises[j]] = [_dayEditExercises[j], _dayEditExercises[i]];
  renderDayEditExList();
}

function removeDayEditEx(i) {
  _dayEditExercises.splice(i, 1);
  renderDayEditExList();
}

function addDayEditExercise() {
  const inp = document.getElementById('day-edit-new-ex');
  const name = inp.value.trim();
  if (!name) return;
  // Generate a unique id for new exercises
  const id = 'cx' + Date.now().toString(36);
  _dayEditExercises.push({ id, name, sets: 3, target: '8–12' });
  inp.value = '';
  renderDayEditExList();
}

function saveDayEdit() {
  if (!_dayEditExercises.length) { toast('Add at least one exercise', '#e74c3c'); return; }
  const label = document.getElementById('day-edit-label').value.trim();
  const orig = WORKOUTS[_dayEditDay];
  const typeColors = { heavy:'#e74c3c', medium:'#f39c12', light:'#27ae60', recovery:'#8e44ad' };
  const color = typeColors[_dayEditType] || orig.color;

  if (!S.customWorkout) S.customWorkout = {};
  S.customWorkout[_dayEditDay] = {
    label: label || orig.label,
    type: _dayEditType,
    color,
    bg: color,
    note: orig.note,
    exercises: _dayEditExercises,
  };
  save();
  closeDayEdit();
  renderWorkout();
  toast(`✅ ${WORKOUTS[_dayEditDay].name} updated`, 'var(--teal)');
}

function resetDayEdit() {
  if (!confirm(`Reset ${WORKOUTS[_dayEditDay].name} to default?`)) return;
  if (S.customWorkout) delete S.customWorkout[_dayEditDay];
  save();
  closeDayEdit();
  renderWorkout();
  toast(`↩️ ${WORKOUTS[_dayEditDay].name} reset to default`);
}

// ═══════════════════════════════════════════════════
// MEAL RENDER
// ═══════════════════════════════════════════════════
function mlKey(w,d,slot){return`mw${w}-d${d}-${slot}`;}
function mlDayDone(di){return['breakfast','lunch','dinner'].filter(s=>S.mealLogs[mlKey(S.mlWeek,di,s)]).length;}
