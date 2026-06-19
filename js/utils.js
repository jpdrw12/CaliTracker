function toast(msg,color='#1abc9c'){
  const t=document.getElementById('toast');
  t.textContent=msg;t.style.background=color;
  t.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(t._h);t._h=setTimeout(()=>{t.style.transform='translateX(-50%) translateY(-200px)';},2500);
}

// ═══════════════════════════════════════════════════
// TAB
// ═══════════════════════════════════════════════════
function switchTab(tab){
  S.activeTab=tab;
  ['today','workout','meals','schedule','body','notes','data'].forEach(t=>{
    document.getElementById('page-'+t).classList.toggle('active',t===tab);
    document.getElementById('tab-'+t).classList.toggle('active',t===tab);
  });
  document.getElementById('shop-btn').classList.toggle('visible',tab==='meals');
  document.getElementById('today-fab').classList.toggle('visible',tab==='today');
  if(tab==='schedule')renderSchedule();
  if(tab==='meals')renderMeals();
  if(tab==='notes')renderNotes();
  if(tab==='data')renderDataPage();
  if(tab==='today')renderToday();
  if(tab==='workout')renderWorkout();
  if(tab==='body')renderBodyPage();
  save();
}

// ═══════════════════════════════════════════════════
// MEAL HELPERS
// ═══════════════════════════════════════════════════
function getActiveMeals() {
  return S.mealRotation === 'B' ? DEFAULT_MEALS_B : DEFAULT_MEALS;
}
function getMeal(di,slot){
  const key = di+'-'+slot+'-'+(S.mealRotation||'A');
  return S.mealCustom[key] || S.mealCustom[di+'-'+slot] || getActiveMeals()[di][slot];
}
function toggleMealRotation(){
  const next = S.mealRotation === 'B' ? 'A' : 'B';
  if(!confirm(`Switch to Week ${next} meal plan? This shows a different set of 7 meals.`)) return;
  S.mealRotation = next;
  save(); renderMeals();
  toast(`Switched to Week ${S.mealRotation} meal plan`);
}

// ═══════════════════════════════════════════════════
// WORKOUT RENDER
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// PHASE 5: ISO WEEK
// ═══════════════════════════════════════════════════
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getCurrentISOWeekIndex() {
  // Returns 0-based week index from start of current year
  return getISOWeek(new Date()) - 1;
}

// ═══════════════════════════════════════════════════
// PHASE 5: CUSTOM EXERCISE SETS/REPS
// ═══════════════════════════════════════════════════
let exEditCtx = null;
const activeTimers = {};
function isTimedExercise(target){return/\d+\s*(sec|min)\b/i.test(target);}
function isDualSided(target){return isTimedExercise(target)&&/\beach\b/i.test(target);}
function fmtElapsed(s){const m=Math.floor(s/60),sc=s%60;return m>0?`${m}:${String(sc).padStart(2,'0')}`:s+'s';}

function getExCustomKey(dayIdx, exId) {
  return `ex-${dayIdx}-${exId}`;
}

// Returns the workout day definition, falling back to WORKOUTS[dayIdx] if not customised
function getWorkoutDay(dayIdx) {
  const custom = (S.customWorkout || {})[dayIdx];
  if (custom) return { ...WORKOUTS[dayIdx], ...custom };
  return WORKOUTS[dayIdx];
}

function getExData(dayIdx, ex) {
  const custom = (S.exCustom || {})[getExCustomKey(dayIdx, ex.id)];
  if (custom) return { sets: custom.sets, target: custom.target, isCustom: true };
  return { sets: ex.sets, target: ex.target, isCustom: false };
}

function openExEdit(dayIdx, ex) {
  exEditCtx = { dayIdx, ex };
  const data = getExData(dayIdx, ex);
  document.getElementById('ex-edit-modal-title').textContent = ex.name.toUpperCase();
  document.getElementById('ex-edit-sets').value   = data.sets;
  document.getElementById('ex-edit-target').value = data.target;
  document.getElementById('ex-edit-modal').classList.add('open');
}

function closeExEdit() { document.getElementById('ex-edit-modal').classList.remove('open'); }

function saveExEdit() {
  if (!exEditCtx) return;
  const sets   = parseInt(document.getElementById('ex-edit-sets').value);
  const target = document.getElementById('ex-edit-target').value.trim();
  if (!sets || sets < 1 || !target) { toast('Please fill in both fields', '#e74c3c'); return; }
  if (!S.exCustom) S.exCustom = {};
  S.exCustom[getExCustomKey(exEditCtx.dayIdx, exEditCtx.ex.id)] = { sets, target };
  save(); closeExEdit(); renderWorkout(); toast('✓ Exercise updated');
}

function resetExEdit() {
  if (!exEditCtx) return;
  if (!confirm('Reset to default sets and reps?')) return;
  if (S.exCustom) delete S.exCustom[getExCustomKey(exEditCtx.dayIdx, exEditCtx.ex.id)];
  save(); closeExEdit(); renderWorkout(); toast('Exercise reset to default');
}

// ═══════════════════════════════════════════════════
// PHASE 5: SESSION NOTES
// ═══════════════════════════════════════════════════
function sessionNoteKey(weekOffset, dayIdx) {
  return `snote-w${weekOffset}-d${dayIdx}`;
}

function loadSessionNote() {
  const key  = sessionNoteKey(S.woWeek, S.woDay);
  const val  = (S.sessionNotes || {})[key] || '';
  const inp  = document.getElementById('session-notes-inp');
  if (inp) inp.value = val;
}

function initSessionNotes() {
  const toggle = document.getElementById('session-notes-toggle');
  const body   = document.getElementById('session-notes-body');
  const arrow  = document.getElementById('session-notes-arrow');
  const inp    = document.getElementById('session-notes-inp');
  if (!toggle || !body || !arrow || !inp) return;

  toggle.addEventListener('click', () => {
    const open = body.classList.toggle('open');
    arrow.classList.toggle('open', open);
    if (open) inp.focus();
  });

  inp.addEventListener('input', () => {
    const key = sessionNoteKey(S.woWeek, S.woDay);
    if (!S.sessionNotes) S.sessionNotes = {};
    S.sessionNotes[key] = inp.value;
    save();
  });

  loadSessionNote();
}

function nowISO(){return new Date().toISOString();}
function wKey(w,d,id,s){return`w${w}-d${d}-${id}-s${s}`;}
function woDayPct(di){
  const d=getWorkoutDay(di);
  const total=d.exercises.reduce((a,e)=>a+e.sets,0);
  const done=d.exercises.reduce((a,e)=>{for(let s=1;s<=e.sets;s++)if(S.logs[wKey(S.woWeek,di,e.id,s)]?.done)a++;return a;},0);
  return total>0?Math.round((done/total)*100):0;
}
function woWeekPct(){return Math.round(WORKOUTS.reduce((a,_,i)=>a+woDayPct(i),0)/7);}
