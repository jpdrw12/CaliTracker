function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay()||7));
  const yearStart = new Date(d.getFullYear(),0,1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

let _isoWeekCheckedThisSession = false;
function checkISOWeekAdvance() {
  // Guard: only ever run once per page load, even if called multiple times.
  if (_isoWeekCheckedThisSession) return;
  _isoWeekCheckedThisSession = true;

  const currentISO = getISOWeek(new Date());
  const savedISO = S.woISOWeek;

  if (savedISO === null || savedISO === undefined) {
    S.woISOWeek = currentISO;
    save();
    return;
  }
  const elapsed = currentISO - savedISO;
  if (elapsed !== 0) {
    S.woWeek = Math.max(0, S.woWeek + elapsed);
    S.woISOWeek = currentISO;
    save();
    if (elapsed > 0) toast(`📅 Week ${S.woWeek + 1} — new workout week started!`, 'var(--teal)');
  }
}

function todayStr(){const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;}
function getCalDate(){
  if(!S.calMonth){const n=new Date();S.calMonth={y:n.getFullYear(),m:n.getMonth()};}
  return S.calMonth;
}

function tasksDueOnDate(dateStr){
  // returns tasks that are due/recurring on a given date
  const d=new Date(dateStr+'T00:00:00');
  const dow=d.getDay(); // 0=Sun
  return S.tasks.filter(t=>{
    if(t.cat==='once'){return t.dueDate===dateStr;}
    if(t.cat==='daily'){return true;}
    if(t.cat==='weekly'){
      if(!t.dueDate)return false;
      const base=new Date(t.dueDate+'T00:00:00');
      return base.getDay()===dow;
    }
    if(t.cat==='monthly'){
      if(!t.dueDate)return false;
      const base=new Date(t.dueDate+'T00:00:00');
      return base.getDate()===d.getDate();
    }
    return false;
  });
}

function isTaskDone(task,dateStr){
  return !!(S.taskDone||{})[task.id+'-'+dateStr];
}

function renderSchedule(){
  // Default selected date to today if not set
  if(!S.calSelDate) S.calSelDate = todayStr();
  // Default calendar month to current month if not set
  if(!S.calMonth){
    const n=new Date();
    S.calMonth={y:n.getFullYear(),m:n.getMonth()};
  }
  const{y,m}=S.calMonth;
  document.getElementById('cal-month-title').textContent=`${MONTHS[m]} ${y}`;
  const selDate=S.calSelDate||todayStr();
  const today=todayStr();

  // Build calendar
  const firstDay=new Date(y,m,1);
  let startDow=firstDay.getDay();
  startDow=startDow===0?6:startDow-1; // Monday=0
  const daysInMonth=new Date(y,m+1,0).getDate();
  const daysInPrev=new Date(y,m,0).getDate();

  const grid=document.getElementById('cal-days');grid.innerHTML='';
  let totalCells=Math.ceil((startDow+daysInMonth)/7)*7;

  for(let i=0;i<totalCells;i++){
    let day,mo=m,ye=y,otherMonth=false;
    if(i<startDow){day=daysInPrev-(startDow-1-i);mo=m-1;if(mo<0){mo=11;ye=y-1;}otherMonth=true;}
    else if(i>=startDow+daysInMonth){day=i-startDow-daysInMonth+1;mo=m+1;if(mo>11){mo=0;ye=y+1;}otherMonth=true;}
    else{day=i-startDow+1;}

    const ds=`${ye}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday=ds===today,isSel=ds===selDate;
    const tasks=tasksDueOnDate(ds);
    const cnt=tasks.length;

    const cell=document.createElement('div');
    cell.className='cal-day'+(otherMonth?' other-month':'')+(isToday?' today':'')+(isSel?' selected':'');
    cell.innerHTML=`<div class="cal-day-num">${day}</div>${cnt>0?`<div class="cal-badge">${cnt}</div>`:''}`;
    cell.onclick=()=>{S.calSelDate=ds;save();renderSchedule();};
    grid.appendChild(cell);
  }

  // Tasks list for selected date
  const allTasks=tasksDueOnDate(selDate);
  // Apply search filter
  const query=(document.getElementById('task-search')?.value||'').trim().toLowerCase();
  const tasks=query?allTasks.filter(t=>t.title.toLowerCase().includes(query)):allTasks;
  const isToday=selDate===today;
  const selD=new Date(selDate+'T00:00:00');
  document.getElementById('tasks-hdr-title').textContent=
    isToday?`TODAY'S TASKS`:`${selD.toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'}).toUpperCase()} TASKS`;

  const list=document.getElementById('tasks-list');list.innerHTML='';

  if(tasks.length===0){
    const msg=query?`No tasks match "${query}"`:'No tasks for this day.<br>Tap + ADD TASK to create one.';
    list.innerHTML=`<div class="empty-state"><div class="es-icon">${query?'🔍':'📭'}</div>${msg}</div>`;
    return;
  }

  // Sort: undone first, then done
  const sorted=[...tasks].sort((a,b)=>{
    const ad=isTaskDone(a,selDate)?1:0,bd=isTaskDone(b,selDate)?1:0;
    if(ad!==bd) return ad-bd;
    // Sort by time if both have it
    if(a.time&&b.time) return a.time.localeCompare(b.time);
    if(a.time) return -1;
    if(b.time) return 1;
    return 0;
  });

  sorted.forEach(task=>{
    const done=isTaskDone(task,selDate);
    const card=document.createElement('div');
    card.className='task-card'+(done?' done-card':'');
    const catColors={daily:'cat-daily',weekly:'cat-weekly',monthly:'cat-monthly',once:'cat-once'};
    // Completion streak for recurring tasks
    let streakHTML='';
    if(task.recurring&&task.cat!=='once'){
      const streak=getTaskStreak(task);
      if(streak>1)streakHTML=`<span class="task-streak-badge">🔥 ${streak}</span>`;
    }
    card.innerHTML=`
      <div class="task-chk${done?' done':''}" data-id="${task.id}" data-date="${selDate}"></div>
      <div class="task-body">
        <div class="task-title">${task.title}</div>
        <div class="task-meta">
          <span class="task-cat ${catColors[task.cat]}">${task.cat}</span>
          ${task.time?`<span class="task-time-badge">🕐 ${task.time}</span>`:''}
          ${task.recurring&&task.cat!=='once'?'<span class="task-date">🔄</span>':''}
          ${streakHTML}
        </div>
      </div>
      <button class="task-edit-btn" data-id="${task.id}">✏️</button>
      <button class="task-del-btn" data-id="${task.id}">×</button>`;
    card.querySelector('.task-chk').onclick=()=>{
      if(!S.taskDone)S.taskDone={};
      const k=task.id+'-'+selDate;
      S.taskDone[k]=!S.taskDone[k];
      if(navigator.vibrate)navigator.vibrate(8);
      save();renderSchedule();updateSchedBadge();
    };
    card.querySelector('.task-edit-btn').onclick=e=>{
      e.stopPropagation();
      openTaskEdit(task);
    };
    card.querySelector('.task-del-btn').onclick=()=>{
      if(!confirm(`Delete "${task.title}"?`))return;
      S.tasks=S.tasks.filter(t=>t.id!==task.id);
      save();renderSchedule();updateSchedBadge();
    };
    wrapSwipeable(card, () => {
      S.tasks = S.tasks.filter(t => t.id !== task.id);
      save(); renderSchedule(); updateSchedBadge();
      toast('Task deleted');
    });
    list.appendChild(card.parentElement);
  });

  updateSchedBadge();
}

function updateSchedBadge(){
  const td=todayStr();
  const tasks=tasksDueOnDate(td);
  const undone=tasks.filter(t=>!isTaskDone(t,td)).length;
  const badge=document.getElementById('sched-badge');
  badge.textContent=undone||'';
  badge.classList.toggle('show',undone>0);
}

// ═══════════════════════════════════════════════════
// PHASE 6: SCHEDULE IMPROVEMENTS
// ═══════════════════════════════════════════════════
function jumpSchedToToday(){
  const n=new Date();
  S.calMonth={y:n.getFullYear(),m:n.getMonth()};
  S.calSelDate=todayStr();
  save();renderSchedule();
}

function getTaskStreak(task){
  if(!task.recurring) return 0;
  let streak=0;
  const today=new Date();
  for(let i=0;i<365;i++){
    const d=new Date(today);
    d.setDate(today.getDate()-i);
    const ds=d.toISOString().slice(0,10);
    const due=tasksDueOnDate(ds).find(t=>t.id===task.id);
    if(due&&isTaskDone(task,ds)){streak++;}
    else if(i>0){break;}
  }
  return streak;
}

// TASK EDIT
let taskEditId=null,taskEditCat='daily',taskEditRecur=true;

function openTaskEdit(task){
  taskEditId=task.id;
  taskEditCat=task.cat;
  taskEditRecur=task.recurring!==false;
  document.getElementById('task-edit-title').value=task.title;
  document.getElementById('task-edit-time').value=task.time||'';
  ['daily','weekly','monthly','once'].forEach(c=>{
    document.getElementById('edit-cat-'+c).classList.toggle('sel',c===task.cat);
  });
  document.getElementById('task-edit-recur-toggle').classList.toggle('on',taskEditRecur);
  document.getElementById('task-edit-recur-row').style.display=task.cat==='once'?'none':'flex';
  document.getElementById('task-edit-modal').classList.add('open');
}

function closeTaskEdit(){document.getElementById('task-edit-modal').classList.remove('open');}

function selectEditCat(c){
  taskEditCat=c;
  ['daily','weekly','monthly','once'].forEach(cc=>{
    document.getElementById('edit-cat-'+cc).classList.toggle('sel',cc===c);
  });
  document.getElementById('task-edit-recur-row').style.display=c==='once'?'none':'flex';
}

function toggleEditRecur(){
  taskEditRecur=!taskEditRecur;
  document.getElementById('task-edit-recur-toggle').classList.toggle('on',taskEditRecur);
}

function saveTaskEdit(){
  const title=document.getElementById('task-edit-title').value.trim();
  if(!title){toast('Please enter a title','#e74c3c');return;}
  const time=document.getElementById('task-edit-time').value||null;
  const idx=S.tasks.findIndex(t=>t.id===taskEditId);
  if(idx===-1)return;
  S.tasks[idx]={...S.tasks[idx],title,cat:taskEditCat,time,
    recurring:taskEditCat==='once'?false:taskEditRecur,updatedAt:nowISO()};
  save();closeTaskEdit();renderSchedule();toast('✓ Task updated');
}

function deleteTaskFromEdit(){
  if(!confirm('Delete this task?'))return;
  S.tasks=S.tasks.filter(t=>t.id!==taskEditId);
  save();closeTaskEdit();renderSchedule();updateSchedBadge();toast('Task deleted');
}

// ═══════════════════════════════════════════════════
// ADD TASK MODAL
let taskCat='daily',taskRecur=true;
function openAddTask(){
  taskCat='daily';taskRecur=true;
  document.getElementById('task-title-inp').value='';
  ['daily','weekly','monthly','once'].forEach(c=>{
    document.getElementById('cat-'+c).classList.toggle('sel',c===taskCat);
  });
  document.getElementById('recur-toggle').classList.toggle('on',taskRecur);
  document.getElementById('recur-toggle-row').style.display=taskCat==='once'?'none':'flex';
  document.getElementById('task-modal').classList.add('open');
}
function closeTaskModal(){document.getElementById('task-modal').classList.remove('open');}
function selectCat(c){
  taskCat=c;
  ['daily','weekly','monthly','once'].forEach(cc=>{
    document.getElementById('cat-'+cc).classList.toggle('sel',cc===c);
  });
  document.getElementById('recur-toggle-row').style.display=c==='once'?'none':'flex';
}
function toggleRecur(){taskRecur=!taskRecur;document.getElementById('recur-toggle').classList.toggle('on',taskRecur);}
function saveTask(){
  const title=document.getElementById('task-title-inp').value.trim();
  if(!title){toast('Please enter a task title','#e74c3c');return;}
  const time=document.getElementById('task-time-inp').value||null;
  const task={
    id:Date.now().toString(),title,cat:taskCat,
    time,
    recurring:taskCat==='once'?false:taskRecur,
    dueDate:S.calSelDate||todayStr(),
    createdAt:nowISO(),updatedAt:nowISO()
  };
  S.tasks.push(task);save();closeTaskModal();renderSchedule();toast('✓ Task added');
}

// ═══════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════
let editingNoteId=null;
