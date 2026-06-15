function renderNotes(){
  const query = (document.getElementById('note-search')?.value||'').trim().toLowerCase();
  const allTags=[...new Set(S.notes.flatMap(n=>n.tags||[]))].sort();
  const bar=document.getElementById('tag-filter-bar');bar.innerHTML='';
  const allBtn=document.createElement('button');
  allBtn.className='tag-filter-btn'+(S.noteFilter===null?' active':'');
  allBtn.textContent='All';
  allBtn.onclick=()=>{S.noteFilter=null;save();renderNotes();};
  bar.appendChild(allBtn);
  allTags.forEach(tag=>{
    const btn=document.createElement('button');
    btn.className='tag-filter-btn'+(S.noteFilter===tag?' active':'');
    btn.textContent=tag;
    btn.onclick=()=>{S.noteFilter=tag;save();renderNotes();};
    bar.appendChild(btn);
  });

  let notes=[...S.notes];
  if(S.noteFilter) notes=notes.filter(n=>(n.tags||[]).includes(S.noteFilter));
  if(query) notes=notes.filter(n=>{
    const title=(n.title||'').toLowerCase();
    const body=(n.body||'').replace(/<[^>]+>/g,' ').toLowerCase();
    const tags=(n.tags||[]).join(' ').toLowerCase();
    return title.includes(query)||body.includes(query)||tags.includes(query);
  });
  notes.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));

  document.getElementById('notes-count').textContent=`${notes.length} note${notes.length!==1?'s':''}`;
  const list=document.getElementById('notes-list');list.innerHTML='';

  if(notes.length===0){
    list.innerHTML=`<div class="empty-state"><div class="es-icon">${query?'🔍':'📝'}</div>${query?`No notes match "${query}"`:'No notes yet.<br>Tap + NEW NOTE to start.'}</div>`;
    return;
  }

  notes.forEach(note=>{
    const card=document.createElement('div');
    card.className='note-card'+(note.pinned?' pinned':'');
    const preview=note.body?note.body.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,120):'';
    const tags=(note.tags||[]).map(t=>`<span class="note-tag">${t}</span>`).join('');
    const date=note.updatedAt?new Date(note.updatedAt).toLocaleDateString('en',{month:'short',day:'numeric'}):'';
    card.innerHTML=`
      <div class="note-card-hdr">
        <div class="note-card-title">${note.title||'Untitled'}</div>
        ${note.pinned?'<span class="note-pin-icon">📌</span>':''}
      </div>
      ${preview?`<div class="note-card-preview">${preview}</div>`:''}
      <div class="note-card-footer">${tags}<span class="note-date">${date}</span></div>`;
    card.onclick=()=>openNoteEditor(note.id);
    wrapSwipeable(card, () => {
      S.notes = S.notes.filter(n => n.id !== note.id);
      save(); renderNotes();
      toast('Note deleted');
    });
    list.appendChild(card.parentElement);
  });
}

function openNoteEditor(id){
  if(id===null){
    // New note
    const note={id:Date.now().toString(),title:'',body:'',tags:[],pinned:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    S.notes.unshift(note);save();
    editingNoteId=note.id;
  } else {
    editingNoteId=id;
  }
  const note=S.notes.find(n=>n.id===editingNoteId);
  if(!note)return;
  document.getElementById('note-title-inp').value=note.title||'';
  document.getElementById('note-editor-body').innerHTML=note.body||'';
  document.getElementById('note-pin-btn').style.opacity=note.pinned?'1':'0.4';
  renderNoteTags(note.tags||[]);
  document.getElementById('note-tag-inp').value='';
  document.getElementById('note-editor-modal').classList.add('open');
  setTimeout(()=>document.getElementById('note-editor-body').focus(),100);
}

function closeNoteEditor(){
  saveNoteEdits();
  document.getElementById('note-editor-modal').classList.remove('open');
  editingNoteId=null;
  renderNotes();
}

function saveNoteEdits(){
  if(!editingNoteId)return;
  const note=S.notes.find(n=>n.id===editingNoteId);
  if(!note)return;
  note.title=document.getElementById('note-title-inp').value.trim()||'Untitled';
  note.body=document.getElementById('note-editor-body').innerHTML;
  note.updatedAt=new Date().toISOString();
  save();
}

function toggleNotePin(){
  const note=S.notes.find(n=>n.id===editingNoteId);
  if(!note)return;
  note.pinned=!note.pinned;
  document.getElementById('note-pin-btn').style.opacity=note.pinned?'1':'0.4';
  save();toast(note.pinned?'📌 Pinned':'Unpinned');
}

function deleteCurrentNote(){
  if(!editingNoteId)return;
  const note=S.notes.find(n=>n.id===editingNoteId);
  if(!note)return;
  if(!confirm(`Delete "${note.title||'this note'}"?`))return;
  S.notes=S.notes.filter(n=>n.id!==editingNoteId);
  save();
  document.getElementById('note-editor-modal').classList.remove('open');
  editingNoteId=null;
  renderNotes();
  toast('Note deleted');
}

function renderNoteTags(tags){
  const list=document.getElementById('note-tags-list');list.innerHTML='';
  tags.forEach((tag,i)=>{
    const pill=document.createElement('div');pill.className='note-tag-pill';
    pill.innerHTML=`${tag}<button class="note-tag-pill-del" data-i="${i}">×</button>`;
    pill.querySelector('.note-tag-pill-del').onclick=()=>{
      const note=S.notes.find(n=>n.id===editingNoteId);
      if(note){note.tags.splice(i,1);save();renderNoteTags(note.tags);}
    };
    list.appendChild(pill);
  });
}

function addNoteTag(){
  const inp=document.getElementById('note-tag-inp');
  const val=inp.value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'');
  if(!val)return;
  const note=S.notes.find(n=>n.id===editingNoteId);
  if(!note)return;
  if(!note.tags)note.tags=[];
  if(!note.tags.includes(val)){note.tags.push(val);save();renderNoteTags(note.tags);}
  inp.value='';
}

function fmtCmd(cmd,val){
  document.getElementById('note-editor-body').focus();
  document.execCommand(cmd,false,val||null);
}

// Note tag input enter key
document.getElementById('note-tag-inp').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addNoteTag();}});
// Auto-save note on title input
document.getElementById('note-title-inp').addEventListener('input',saveNoteEdits);
document.getElementById('note-editor-body').addEventListener('input',saveNoteEdits);

// ═══════════════════════════════════════════════════
// DATA PAGE
// ═══════════════════════════════════════════════════
