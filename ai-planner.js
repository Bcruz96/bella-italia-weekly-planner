/* AI import is isolated from the existing checklist startup. */
(() => {
  const byId = id => document.getElementById(id);
  const modal = byId('aiModal'), inputForm = byId('aiPlanForm'), saveForm = byId('aiSaveForm');
  const status = byId('aiStatus'), draftContainer = byId('aiDrafts');
  const storageKey = 'bella-ai-draft-v1';
  const accessStorageKey = 'bella-ai-access-v1';
  let drafts = [], warnings = [], pendingRows = null, busy = false, referenceWeek = '';
  function showRememberedCode(remembered) {
    byId('aiCodeEntry').hidden = remembered;
    byId('aiCodeSaved').hidden = !remembered;
  }
  function forgetCode() {
    try { localStorage.removeItem(accessStorageKey); } catch {}
    byId('aiCode').value = '';
    byId('aiRememberCode').checked = false;
    showRememberedCode(false);
  }
  try {
    const remembered = localStorage.getItem(accessStorageKey);
    if (remembered && remembered.length >= 12 && remembered.length <= 256) {
      byId('aiCode').value = remembered;
      byId('aiRememberCode').checked = true;
      showRememberedCode(true);
    }
  } catch {}
  byId('aiForgetCode').addEventListener('click', () => {
    if (busy) return;
    forgetCode();
    byId('aiCode').focus();
  });
  byId('aiRememberCode').addEventListener('change', () => {
    if (!byId('aiRememberCode').checked) {
      try { localStorage.removeItem(accessStorageKey); } catch {}
    }
  });
  function message(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
  function persist() {
    sessionStorage.setItem(storageKey, JSON.stringify({drafts, warnings, pendingRows, referenceWeek, text:byId('aiText').value}));
  }
  function lockControls() {
    const locked = busy || Boolean(pendingRows);
    inputForm.querySelectorAll('input, textarea, button').forEach(el => { el.disabled = locked; });
    draftContainer.querySelectorAll('input, textarea, select, button').forEach(el => { el.disabled = locked; });
    byId('aiDiscard').disabled = locked;
    byId('aiSave').disabled = busy || !drafts.length;
    byId('aiSave').textContent = busy ? 'Please wait…' : pendingRows ? 'Retry saving this batch' : 'Add reviewed tasks';
    byId('aiGenerate').textContent = busy ? 'Please wait…' : 'Organise tasks';
    byId('closeAiPlanner').disabled = busy;
  }
  function updatePastDates() {
    const past = drafts.some(task => task.date && task.date < TaskImport.londonToday());
    byId('aiPastLabel').hidden = !past;
    return past;
  }
  function field(card, task, key, label, type, max) {
    const wrapper = document.createElement('label'); wrapper.className = 'ai-field';
    const caption = document.createElement('span'); caption.textContent = label;
    const control = document.createElement(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input');
    if(type !== 'textarea' && type !== 'select') control.type = type;
    if(type === 'select') TaskImport.categories.forEach(category => { const option=document.createElement('option'); option.value=category; option.textContent=category; control.appendChild(option); });
    if(max) control.maxLength = max;
    if(key === 'people') {control.min = '1'; control.max = '10000'; control.step = '1';}
    if(key === 'title' || key === 'date') control.required = true;
    if(key === 'description') control.rows = 2;
    control.value = task[key] === null ? '' : task[key];
    control.addEventListener('input', () => {
      task[key] = key === 'people' ? control.value === '' ? null : Number(control.value)
        : (key === 'date' || key === 'time') && !control.value ? null : control.value;
      byId('aiAllowPast').checked = false;
      updatePastDates();
      try {persist();} catch {message('Draft storage is unavailable. Keep this page open.', true);}
    });
    wrapper.append(caption, control); card.appendChild(wrapper);
  }
  function renderDrafts() {
    byId('aiReview').hidden = !drafts.length;
    draftContainer.replaceChildren(); byId('aiWarnings').replaceChildren();
    warnings.forEach(text => {const item=document.createElement('li'); item.textContent=text; byId('aiWarnings').appendChild(item);});
    drafts.forEach((task,index) => {
      const card=document.createElement('fieldset'); card.className='ai-draft';
      const legend=document.createElement('legend'); legend.textContent='Task '+(index+1); card.appendChild(legend);
      field(card,task,'title','Task','text',240);
      field(card,task,'date','Date','date');
      field(card,task,'time','Time (optional)','time');
      field(card,task,'people','People (optional)','number');
      field(card,task,'category','Category','select');
      field(card,task,'description','Description','textarea',1200);
      const remove=document.createElement('button'); remove.type='button'; remove.className='ai-remove'; remove.textContent='Remove task';
      remove.addEventListener('click',()=>{drafts.splice(index,1); renderDrafts(); try{persist();}catch{message('Could not save draft locally.',true);}});
      card.appendChild(remove); draftContainer.appendChild(card);
    });
    updatePastDates(); lockControls();
  }
  function close() {if(busy) return; modal.classList.remove('show'); byId('openAiPlanner').focus();}
  byId('openAiPlanner').addEventListener('click', () => {
    if(!drafts.length) referenceWeek=getDateKey(weekStart);
    byId('aiWeekContext').textContent='Reference week starts '+referenceWeek.split('-').reverse().join('/')+'. Bare weekdays refer to this week. Dates use DD/MM/YY or DD/MM/YYYY.';
    modal.classList.add('show'); renderDrafts();
    (pendingRows ? byId('aiSave') : byId('aiText')).focus();
  });
  byId('closeAiPlanner').addEventListener('click',close);
  modal.addEventListener('click',event=>{if(event.target===modal) close();});
  modal.addEventListener('keydown',event=>{
    if(event.key==='Escape') close();
    if(event.key==='Tab') {
      const items=[...modal.querySelectorAll('button,input,select,textarea')].filter(el=>!el.disabled && !el.closest('[hidden]'));
      const first=items[0], last=items[items.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  inputForm.addEventListener('submit',async event=>{
    event.preventDefault(); if(busy || pendingRows || !inputForm.reportValidity()) return;
    if(drafts.length && !confirm('Replace the current unsaved draft?')) return;
    busy=true; lockControls(); message('Organising your message…');
    const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),30000);
    let rejectedCode = false;
    try {
      const response=await fetch('/api/plan-tasks',{method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json','x-ai-access-code':byId('aiCode').value},
        body:JSON.stringify({text:byId('aiText').value,weekStart:referenceWeek})});
      let result; try{result=await response.json();}catch{throw Error('AI is unavailable on this site. Please check the deployment setup.');}
      let rememberNotice = '';
      // A quota error still means the server accepted the team's access code.
      if (byId('aiRememberCode').checked && (response.ok || response.headers?.get('X-AI-Access-Verified') === 'true')) {
        try {
          localStorage.setItem(accessStorageKey, byId('aiCode').value);
          showRememberedCode(true);
        } catch { rememberNotice = ' Your browser could not remember the code; it is available for this visit only.'; }
      }
      if(!response.ok) {
        if(response.status === 401) { forgetCode(); rejectedCode = true; }
        throw Error(result.error || 'Could not organise tasks. Please try again.');
      }
      if(!Array.isArray(result.tasks) || result.tasks.length>30 || !Array.isArray(result.warnings) || result.warnings.some(w=>typeof w!=='string')) throw Error('Invalid plan. Please try again.');
      drafts=result.tasks.map(task=>TaskImport.normalize(task,true)); warnings=result.warnings;
      persist(); renderDrafts();
      message((drafts.length ? 'Review every date and detail below. Nothing has been added yet.' : warnings.join(' ') || 'No tasks found. Add dates and descriptions, then try again.') + rememberNotice);
      if(drafts.length) byId('aiReviewTitle').scrollIntoView({block:'nearest',behavior:'smooth'});
    } catch(error){message(error.name==='AbortError' ? 'The request timed out. Nothing was added. Please try again.' : error.message,true);}
    finally{clearTimeout(timeout);busy=false;lockControls();if(rejectedCode)byId('aiCode').focus();}
  });
  byId('aiDiscard').addEventListener('click',()=>{
    if(busy || pendingRows || !confirm('Discard these unsaved tasks?')) return;
    drafts=[];warnings=[];sessionStorage.removeItem(storageKey);renderDrafts();message('Draft discarded.');
  });
  saveForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy) return;
    if(dataBusy || !dataLoaded){message('Wait for the checklist to finish syncing, then try again.',true);return;}
    if(!saveForm.reportValidity()) return;
    if(updatePastDates() && !byId('aiAllowPast').checked){message('Please check and acknowledge the dates in the past.',true);return;}
    busy=true;lockControls();message('Saving your reviewed tasks…');
    let added=0, skipped=0;
    const success=await runDataOperation(async()=>{
      if(!pendingRows) {
        // IDs and data are persisted BEFORE any insert, so retries cannot duplicate this batch.
        const unique=TaskImport.uniqueTasks(drafts);
        pendingRows=unique.map(task=>TaskImport.toRow(task,RESTAURANT_ID,crypto.randomUUID()));
        try{persist();}catch(error){pendingRows=null;throw Error('Draft storage is unavailable. Enable session storage before adding tasks.');}
      }
      const records=[], existingIds=new Set();
      for(const row of pendingRows) {
        // Exact lookup also handles a response lost after a successful insert.
        const result=await database.from('manual_tasks').select('*').eq('restaurant_id',RESTAURANT_ID)
          .eq('date_key',row.date_key).eq('title',row.title).limit(1);
        if(result.error) throw result.error;
        if(result.data.length){records.push(result.data[0]);existingIds.add(result.data[0].id);skipped++;}
        else records.push(row);
      }
      // Only rows still carrying their new stable IDs need inserting.
      const toInsert=records.filter(row=>!existingIds.has(row.id));
      if(toInsert.length) {
        const result=await database.from('manual_tasks').insert(toInsert).select();
        if(result.error) throw result.error;
        if(result.data.length!==toInsert.length) throw Error('Could not confirm all saved tasks. Retry this batch.');
        added=result.data.length;
        for(let i=0;i<records.length;i++) {
          const saved=result.data.find(row=>row.id===records[i].id);if(saved) records[i]=saved;
        }
      }
      const known=new Map(manualTasks.map(task=>[String(task.id),task]));
      records.forEach(task=>known.set(String(task.id),{id:task.id,title:task.title,day:task.day,dateKey:task.date_key,category:task.category,completed:task.completed}));
      manualTasks=[...known.values()];
      const firstDate=pendingRows.map(row=>row.date_key).sort()[0];
      const date=new Date(firstDate+'T12:00:00');weekStart=getMondayOfWeek(date);selectedDayIndex=(date.getDay()+6)%7;
    },true);
    busy=false;
    if(success){
      pendingRows=null;drafts=[];warnings=[];
      try{sessionStorage.removeItem(storageKey);}catch{}
      renderDrafts();message(`${added} tasks added. ${skipped} already existed. Your checklist is ready.`);
    } else {
      message(pendingRows ? 'Could not confirm the batch. Keep this draft and use Retry saving. Your message and task IDs have been preserved.' : 'Nothing was added. Check the task details and that session storage is available, then try again.',true);
      lockControls();
    }
  });
  try {
    const saved=JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if(saved && Array.isArray(saved.drafts) && saved.drafts.length<=30) {
      drafts=saved.drafts.map(task=>TaskImport.normalize(task,true)); warnings=Array.isArray(saved.warnings)?saved.warnings:[];
      referenceWeek=TaskImport.isDate(saved.referenceWeek)?saved.referenceWeek:getDateKey(weekStart);
      byId('aiText').value=typeof saved.text==='string'?saved.text:'';
      if(Array.isArray(saved.pendingRows) && saved.pendingRows.length && saved.pendingRows.length<=30) {
        pendingRows=saved.pendingRows.map(row=>{
          if(row.restaurant_id!==RESTAURANT_ID || !TaskImport.isDate(row.date_key) || typeof row.title!=='string' || !/^[0-9a-f-]{36}$/i.test(row.id) || !TaskImport.categories.includes(row.category)) throw Error('Invalid saved batch');
          return {id:row.id,restaurant_id:RESTAURANT_ID,title:row.title,date_key:row.date_key,day:row.day,category:row.category,completed:false};
        });
        message('An unfinished batch was restored. Retry saving it to check what was already added.');
      }
    }
  } catch{drafts=[];pendingRows=null;message('Could not restore the previous draft. Please start again.',true);}
})();
