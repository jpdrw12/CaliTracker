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

  const d=WORKOUTS[S.woDay],p=woDayPct(S.woDay);
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
  WORKOUTS[S.woDay].exercises.forEach(ex=>{
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
        const restSecs=REST_TIMES[WORKOUTS[S.woDay].type]||90;
        if(restSecs>0)startRestTimer(restSecs);
      }
    }));
    card.querySelectorAll('.set-inp').forEach(inp=>inp.addEventListener('input',()=>{
      const k=inp.dataset.k;if(!S.logs[k])S.logs[k]={};S.logs[k].reps=inp.value;save();
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
          if(S.logs[k].doneL&&S.logs[k].doneR){S.logs[k].done=true;save();renderWorkout();checkDayCompletion();if(navigator.vibrate)navigator.vibrate(8);const restSecs=REST_TIMES[WORKOUTS[S.woDay].type]||90;if(restSecs>0)startRestTimer(restSecs);}
          else{save();const tv=document.getElementById('tv'+side+'-'+k);if(tv)tv.textContent=fmtElapsed(elapsed);btn.classList.remove('running');btn.classList.add('done-timer');btn.disabled=true;}
        } else {
          S.logs[k].reps=fmtElapsed(elapsed);
          S.logs[k].done=true;
          save();renderWorkout();checkDayCompletion();
          if(navigator.vibrate)navigator.vibrate(8);
          const restSecs=REST_TIMES[WORKOUTS[S.woDay].type]||90;
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
  if(pageEl&&scrollY)requestAnimationFrame(()=>{pageEl.scrollTop=scrollY;});
}


// ═══════════════════════════════════════════════════
// MEAL RENDER
// ═══════════════════════════════════════════════════
function mlKey(w,d,slot){return`mw${w}-d${d}-${slot}`;}
function mlDayDone(di){return['breakfast','lunch','dinner'].filter(s=>S.mealLogs[mlKey(S.mlWeek,di,s)]).length;}
