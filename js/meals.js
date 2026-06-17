function renderMeals(){
  const meals = getActiveMeals();
  const weekDone=meals.reduce((_,__,i)=>_+mlDayDone(i),0);
  document.getElementById('ml-prog').style.width=Math.round((weekDone/21)*100)+'%';
  document.getElementById('ml-wk').textContent=S.mlWeek+1;
  const done=mlDayDone(S.mlDay);
  document.getElementById('ml-pct-lbl').textContent=`${done}/3`;
  // Rotation badge
  const badge=document.getElementById('meal-rotation-badge');
  if(badge){badge.textContent=`WEEK ${S.mealRotation||'A'}`;badge.classList.toggle('week-b',S.mealRotation==='B');}
  const sel=document.getElementById('ml-day-sel');sel.innerHTML='';
  meals.forEach((d,i)=>{
    const pd=mlDayDone(i),pct=Math.round((pd/3)*100),active=i===S.mlDay;
    const btn=document.createElement('button');
    btn.className='day-btn'+(active?' active':'');
    btn.style.cssText='--dc:#1abc9c;--dbg:#1abc9c1a';
    btn.innerHTML=`<div class="de">${d.emoji}</div><div class="dn">${d.name}</div><div class="dt">${pd}/3</div>${pd>0?`<div class="mb-track"><div class="mb-fill" style="width:${pct}%;background:#1abc9c"></div></div>`:'<div style="height:8px"></div>'}`;
    btn.onclick=()=>{S.mlDay=i;save();renderMeals();};
    sel.appendChild(btn);
  });
  document.getElementById('meal-day-header').innerHTML=`
    <div class="dhc" style="background:#1abc9c1a;border-color:#1abc9c44;cursor:default">
      <div style="display:flex;align-items:center;gap:12px;width:100%">
        <div class="dhe">🥗</div>
        <div><div class="dht" style="color:#1abc9c">${meals[S.mlDay].name}</div><div class="dhtitle">MEAL PLAN</div><div class="dhn">Tap a meal to mark it eaten · ✏️ to edit</div></div>
        <div class="dpct"><div class="dpct-n" style="color:#1abc9c">${done}/3</div><div class="dpct-l">EATEN</div></div>
      </div>
    </div>`;
  const mc=document.getElementById('meals-content');mc.innerHTML='';
  [{key:'breakfast',label:'☀️ Breakfast'},{key:'lunch',label:'🌤 Lunch'},{key:'dinner',label:'🌙 Dinner'}].forEach(slot=>{
    const meal=getMeal(S.mlDay,slot.key),k=mlKey(S.mlWeek,S.mlDay,slot.key),eaten=!!S.mealLogs[k];
    const isCustom=!!(S.mealCustom[S.mlDay+'-'+slot.key+'-'+(S.mealRotation||'A')]||S.mealCustom[S.mlDay+'-'+slot.key]);
    const customBadge=isCustom?`<span class="meal-custom-badge">edited</span>`:'';
    const sec=document.createElement('div');sec.className='meal-sec';
    const tags=(meal.tags||[]).map(t=>`<span class="mtag ${t}">${t}</span>`).join('');
    sec.innerHTML=`<div class="meal-sec-title">${slot.label}</div><div class="meal-card${eaten?' eaten':''}"><div class="meal-top"><div class="meal-chk"></div><div class="meal-info"><div class="meal-name">${meal.name}${customBadge}</div><div class="meal-desc">${meal.desc}</div><div class="meal-tags">${tags}</div></div><button class="meal-edit-btn" data-day="${S.mlDay}" data-slot="${slot.key}">✏️</button></div></div>`;
    sec.querySelector('.meal-card').addEventListener('click',e=>{
      if(e.target.classList.contains('meal-edit-btn')||e.target.closest('.meal-edit-btn'))return;
      S.mealLogs[k]=!S.mealLogs[k]||undefined;if(!S.mealLogs[k])delete S.mealLogs[k];save();renderMeals();
    });
    sec.querySelector('.meal-edit-btn').addEventListener('click',e=>{e.stopPropagation();openMealEdit(S.mlDay,slot.key,slot.label);});
    mc.appendChild(sec);
  });
}

// ═══════════════════════════════════════════════════
// MEAL EDIT
// ═══════════════════════════════════════════════════
let editCtx=null;
function openMealEdit(di,slot,label){
  editCtx={di,slot};
  const meal=getMeal(di,slot);
  document.getElementById('meal-modal-title').textContent='EDIT — '+label.replace(/[☀️🌤🌙]/g,'').trim();
  document.getElementById('edit-name').value=meal.name;
  document.getElementById('edit-desc').value=meal.desc;
  ['protein','carb','cheap','quick'].forEach(t=>{document.getElementById('tag-'+t).classList.toggle('on',(meal.tags||[]).includes(t));});
  document.getElementById('meal-modal').classList.add('open');
}
function closeMealEdit(){document.getElementById('meal-modal').classList.remove('open');}
function toggleTag(t){document.getElementById('tag-'+t).classList.toggle('on');}
function saveMealEdit(){
  if(!editCtx)return;
  const name=document.getElementById('edit-name').value.trim();
  const desc=document.getElementById('edit-desc').value.trim();
  if(!name){toast('Please enter a meal name','#e74c3c');return;}
  const tags=['protein','carb','cheap','quick'].filter(t=>document.getElementById('tag-'+t).classList.contains('on'));
  S.mealCustom[editCtx.di+'-'+editCtx.slot]={name,desc,tags};
  save();closeMealEdit();renderMeals();toast('✓ Meal updated');
}
function resetMealToDefault(){
  if(!editCtx)return;
  delete S.mealCustom[editCtx.di+'-'+editCtx.slot];
  save();closeMealEdit();renderMeals();toast('Meal reset to default');
}

// ═══════════════════════════════════════════════════
// SHOPPING
// ═══════════════════════════════════════════════════
function openShop(){renderShop();document.getElementById('shop-modal').classList.add('open');}
function closeShop(){document.getElementById('shop-modal').classList.remove('open');}
function renderShop(){
  const total=SHOPPING.reduce((a,c)=>a+c.items.length,0);
  const checked=Object.values(S.shopChecks).filter(Boolean).length;
  document.getElementById('shop-sub').textContent=`${checked}/${total} items collected`;
  const body=document.getElementById('shop-body');body.innerHTML='';
  SHOPPING.forEach(cat=>{
    const sec=document.createElement('div');sec.className='shop-cat';
    sec.innerHTML=`<div class="shop-cat-title">${cat.category}</div>`;
    cat.items.forEach(item=>{
      const isC=!!S.shopChecks[item.name];
      const row=document.createElement('div');row.className='shop-item'+(isC?' checked':'');
      row.innerHTML=`<div class="shop-chk"></div><span class="shop-item-name">${item.name}</span><span class="shop-item-used">${item.used}</span>`;
      row.addEventListener('click',()=>{S.shopChecks[item.name]=!S.shopChecks[item.name];if(!S.shopChecks[item.name])delete S.shopChecks[item.name];save();renderShop();});
      sec.appendChild(row);
    });
    body.appendChild(sec);
  });
}
function clearShop(){S.shopChecks={};save();renderShop();}
function checkAllShop(){SHOPPING.forEach(c=>c.items.forEach(i=>{S.shopChecks[i.name]=true;}));save();renderShop();}
function exportShop(){
  const lines=[`🛒 SHOPPING LIST — Week ${S.mlWeek+1}\n`];
  SHOPPING.forEach(cat=>{lines.push(`\n${cat.category}`);lines.push('─'.repeat(28));cat.items.forEach(i=>lines.push(`${S.shopChecks[i.name]?'✓':'○'}  ${i.name}`));});
  const text=lines.join('\n');
  if(navigator.share)navigator.share({title:'CaliTrack Shopping List',text}).catch(()=>dlText(text,'shopping-list.txt'));
  else dlText(text,'shopping-list.txt');
}

// ═══════════════════════════════════════════════════
// SCHEDULE
// ═══════════════════════════════════════════════════
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
