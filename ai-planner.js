/* AI import is isolated from the existing checklist startup. */
(() => {
  const byId = id => document.getElementById(id);
  const modal = byId('aiModal'), inputForm = byId('aiPlanForm'), saveForm = byId('aiSaveForm');
  const status = byId('aiStatus'), draftContainer = byId('aiDrafts');
  const storageKey = 'bella-ai-draft-v1';
  const accessStorageKey = 'bella-ai-access-v1';
  const chatStorageKey = 'bella-planner-chat-v1';
  let drafts = [], warnings = [], pendingRows = null, busy = false, referenceWeek = '';
  let history = [], needsClarification = false, trackedDay = TaskImport.londonToday();
  function plannerSnapshot(contextWeek = referenceWeek || getDateKey(weekStart)) {
    return PlannerContext.snapshot({manualTasks,fixedTasks,completion:fixedTaskCompletion,
      stockTask:stockCountingTask,weekStart:contextWeek,today:TaskImport.londonToday()});
  }
  function renderConversation() {
    const log=byId('aiConversation');log.replaceChildren();
    if(!history.length){const welcome=document.createElement('p');welcome.className='ai-chat-welcome';welcome.textContent='Ask me about your tasks, describe new work, or plan a repeating checklist. I will ask when something is unclear.';log.appendChild(welcome);}
    history.forEach(entry=>{const item=document.createElement('div');item.className='ai-chat-message '+entry.role;const who=document.createElement('strong');who.textContent=entry.role==='user'?'You':'Planner';const text=document.createElement('p');text.textContent=entry.content;item.append(who,text);log.appendChild(item);});
    log.scrollTop=log.scrollHeight;
  }
  function addConversation(user,assistant) {
    if(user)history.push({role:'user',content:user.slice(0,4000)});
    if(assistant)history.push({role:'assistant',content:assistant.slice(0,4000)});
    history=history.slice(-12);
    while(JSON.stringify(history).length>29000)history.shift();
    try{sessionStorage.setItem(chatStorageKey,JSON.stringify(history));}catch{}
    renderConversation();
  }
  function renderBriefing() {
    if(!dataLoaded)return;
    const snapshot=plannerSnapshot(getDateKey(weekStart)),insights=PlannerContext.insights(snapshot);
    byId('briefingText').textContent=`${insights.due.length} unfinished today · ${insights.overdue.length} overdue dated tasks · ${insights.conflicts.length} possible timing clashes`+(snapshot.truncated?' · Overview is limited to 200 tasks.':'');
    const list=byId('briefingPriorities');list.replaceChildren();
    [...insights.overdue,...insights.due].slice(0,3).forEach(task=>{
      const li=document.createElement('li'),button=document.createElement('button');
      button.type='button';button.textContent=(task.date<snapshot.today?'Overdue · ':'Today · ')+task.title;
      button.addEventListener('click',()=>{const date=new Date(task.date+'T12:00:00');weekStart=getMondayOfWeek(date);selectedDayIndex=(date.getDay()+6)%7;renderApp();});li.appendChild(button);list.appendChild(li);
    });
  }
  window.addEventListener('planner:updated',renderBriefing);
  setInterval(()=>{
    const today=TaskImport.londonToday();
    if(today!==trackedDay){
      if(getSelectedDateKey()===trackedDay){const date=new Date(today+'T12:00:00');weekStart=getMondayOfWeek(date);selectedDayIndex=(date.getDay()+6)%7;renderApp();}
      trackedDay=today;renderBriefing();
    }
  },60000);
  try {
    const saved=JSON.parse(sessionStorage.getItem(chatStorageKey)||'[]');
    if(Array.isArray(saved))history=saved.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=4000).slice(-12);
  }catch{}
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
    sessionStorage.setItem(storageKey, JSON.stringify({drafts, warnings, pendingRows, referenceWeek, needsClarification, text:byId('aiText').value}));
  }
  function lockControls() {
    const locked = busy || Boolean(pendingRows);
    inputForm.querySelectorAll('input, textarea, button').forEach(el => { el.disabled = locked; });
    draftContainer.querySelectorAll('input, textarea, select, button').forEach(el => { el.disabled = locked; });
    byId('aiDiscard').disabled = locked;
    byId('aiSave').disabled = busy || !drafts.length || needsClarification;
    byId('aiSave').textContent = busy ? 'Please wait…' : pendingRows ? 'Retry saving this batch' : 'Add reviewed tasks';
    byId('aiGenerate').textContent = busy ? 'Please wait…' : 'Send message';
    byId('aiNewChat').disabled = locked;
    document.querySelectorAll('[data-ai-prompt]').forEach(button=>{button.disabled=locked;});
    byId('closeAiPlanner').disabled = busy;
  }
  function updatePastDates() {
    const past = drafts.some(task => task.date && task.date < TaskImport.londonToday());
    byId('aiPastLabel').hidden = !past;
    return past;
  }
  function updateOccurrenceCount() {
    try{const count=TaskImport.uniqueTasks(drafts).length;byId('aiReviewTitle').textContent=`Review your tasks (${count} dated occurrence${count===1?'':'s'})`;}
    catch{byId('aiReviewTitle').textContent='Review your tasks';}
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
      needsClarification=false;lockControls();
      updatePastDates();
      updateOccurrenceCount();
      try {persist();} catch {message('Draft storage is unavailable. Keep this page open.', true);}
    });
    wrapper.append(caption, control); card.appendChild(wrapper);
  }
  function renderDrafts() {
    byId('aiReview').hidden = !drafts.length;
    draftContainer.replaceChildren(); byId('aiWarnings').replaceChildren();
    warnings.forEach(text => {const item=document.createElement('li'); item.textContent=text; byId('aiWarnings').appendChild(item);});
    if(dataLoaded){
      try {
        const proposed=TaskImport.uniqueTasks(drafts),existing=plannerSnapshot().tasks;
        const clashes=proposed.filter(task=>task.time&&existing.some(row=>!row.completed&&row.date===task.date&&row.title.startsWith(task.time)&&row.title!==TaskImport.titleFor(task)));
        if(clashes.length){const item=document.createElement('li');item.textContent=`${clashes.length} proposed task(s) share a start time with an unfinished checklist task. Please review; this is not a confirmed scheduling conflict.`;byId('aiWarnings').appendChild(item);}
      }catch{}
    }
    drafts.forEach((task,index) => {
      const card=document.createElement('fieldset'); card.className='ai-draft';
      const legend=document.createElement('legend'); legend.textContent='Task '+(index+1); card.appendChild(legend);
      field(card,task,'title','Task','text',240);
      field(card,task,'date','Date','date');
      field(card,task,'time','Time (optional)','time');
      field(card,task,'people','People (optional)','number');
      field(card,task,'category','Category','select');
      field(card,task,'description','Description','textarea',1200);
      const repeat=document.createElement('label');repeat.className='ai-field';
      const repeatLabel=document.createElement('span');repeatLabel.textContent='Repeat';
      const frequency=document.createElement('select');
      for(const [value,label] of [['none','Does not repeat'],['daily','Every day'],['weekly','Every week']]){const option=document.createElement('option');option.value=value;option.textContent=label;frequency.appendChild(option);}
      frequency.value=task.repeat?.frequency||'none';repeat.append(repeatLabel,frequency);card.appendChild(repeat);
      const end=document.createElement('label');end.className='ai-field';
      const endLabel=document.createElement('span');endLabel.textContent='Repeat until (inclusive)';
      const endDate=document.createElement('input');endDate.type='date';endDate.value=task.repeat?.endDate||'';endDate.min=task.date||'';
      end.hidden=frequency.value==='none';endDate.required=frequency.value!=='none';end.append(endLabel,endDate);card.appendChild(end);
      function updateRepeat(){task.repeat={frequency:frequency.value,endDate:frequency.value==='none'?null:endDate.value||null};end.hidden=frequency.value==='none';endDate.required=frequency.value!=='none';needsClarification=false;try{persist();}catch{}updateOccurrenceCount();lockControls();}
      frequency.addEventListener('change',updateRepeat);endDate.addEventListener('input',updateRepeat);
      const remove=document.createElement('button'); remove.type='button'; remove.className='ai-remove'; remove.textContent='Remove task';
      remove.addEventListener('click',()=>{drafts.splice(index,1); renderDrafts(); try{persist();}catch{message('Could not save draft locally.',true);}});
      card.appendChild(remove); draftContainer.appendChild(card);
    });
    updatePastDates(); updateOccurrenceCount(); lockControls();
  }
  function close() {if(busy) return; modal.classList.remove('show'); byId('openAiPlanner').focus();}
  byId('openAiPlanner').addEventListener('click', () => {
    if(!drafts.length) referenceWeek=getDateKey(weekStart);
    byId('aiWeekContext').textContent='Reference week starts '+referenceWeek.split('-').reverse().join('/')+'. Bare weekdays refer to this week. Dates use DD/MM/YY or DD/MM/YYYY.';
    modal.classList.add('show'); renderDrafts();renderConversation();
    (pendingRows ? byId('aiSave') : byId('aiText')).focus();
  });
  byId('closeAiPlanner').addEventListener('click',close);
  byId('aiNewChat').addEventListener('click',()=>{
    if(busy||pendingRows||!confirm('Start a new chat and discard this unsaved draft?'))return;
    history=[];drafts=[];warnings=[];needsClarification=false;byId('aiText').value='';
    try{sessionStorage.removeItem(chatStorageKey);sessionStorage.removeItem(storageKey);}catch{}
    referenceWeek=getDateKey(weekStart);renderConversation();renderDrafts();message('New conversation started. Your saved checklist is unchanged.');
  });
  document.querySelectorAll('[data-ai-prompt]').forEach(button=>button.addEventListener('click',()=>{byId('aiText').value=button.dataset.aiPrompt;byId('aiText').focus();}));
  byId('askPlanner').addEventListener('click',()=>{byId('openAiPlanner').click();byId('aiText').value='Review the selected week. What is unfinished, overdue or potentially conflicting?';byId('aiText').focus();});
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
    if(!dataLoaded){message('Wait for the latest checklist to load before chatting.',true);return;}
    const userMessage=byId('aiText').value;
    busy=true; lockControls(); message('Organising your message…');
    const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),30000);
    let rejectedCode = false;
    try {
      const response=await fetch('/api/plan-tasks',{method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json','x-ai-access-code':byId('aiCode').value},
        body:JSON.stringify({text:userMessage,weekStart:referenceWeek,history,currentDraft:drafts,context:plannerSnapshot()})});
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
        const reference=typeof result.requestId==='string'&&/^[\w.:-]{1,120}$/.test(result.requestId)?' Reference: '+result.requestId:'';
        throw Error((result.error || 'Could not organise tasks. Please try again.')+reference);
      }
      if(!Array.isArray(result.tasks) || result.tasks.length>30 || !Array.isArray(result.warnings) || result.warnings.some(w=>typeof w!=='string')) throw Error('Invalid plan. Please try again.');
      if(result.reply!==undefined&&(typeof result.reply!=='string'||result.reply.length>4000))throw Error('Invalid assistant reply. Please try again.');
      if(result.draftMode!=='keep')drafts=result.tasks.map(task=>TaskImport.normalize(task,true));
      warnings=result.warnings;needsClarification=result.needsClarification===true;
      addConversation(userMessage,result.reply|| (drafts.length?'I have prepared your draft. Review it before adding the tasks.':warnings.join(' ')||'Could you give me a date and description?'));
      byId('aiText').value='';
      persist(); renderDrafts();
      message((needsClarification ? 'Please answer the question in the conversation, or correct the draft details.' : result.draftMode==='keep' ? 'Reply ready. Your saved checklist and unsaved draft are unchanged.' : drafts.length ? 'Review every date and detail below. Nothing has been added yet.' : warnings.join(' ') || 'No tasks found. Add dates and descriptions, then try again.') + rememberNotice);
      if(drafts.length&&!needsClarification) byId('aiReviewTitle').scrollIntoView({block:'nearest',behavior:'smooth'});
    } catch(error){message(error.name==='AbortError' ? 'The request timed out. Nothing was added. Please try again.' : error.message,true);}
    finally{clearTimeout(timeout);busy=false;lockControls();if(rejectedCode)byId('aiCode').focus();}
  });
  byId('aiDiscard').addEventListener('click',()=>{
    if(busy || pendingRows || !confirm('Discard these unsaved tasks?')) return;
    drafts=[];warnings=[];sessionStorage.removeItem(storageKey);renderDrafts();message('Draft discarded.');
  });
  saveForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy || needsClarification) return;
    if(dataBusy || !dataLoaded){message('Wait for the checklist to finish syncing, then try again.',true);return;}
    if(!saveForm.reportValidity()) return;
    if(updatePastDates() && !byId('aiAllowPast').checked){message('Please check and acknowledge the dates in the past.',true);return;}
    let validatedTasks;
    if(!pendingRows){try{validatedTasks=TaskImport.uniqueTasks(drafts);}catch(error){message(error.message,true);return;}}
    busy=true;lockControls();message('Saving your reviewed tasks…');
    let added=0, skipped=0;
    const success=await runDataOperation(async()=>{
      if(!pendingRows) {
        // IDs and data are persisted BEFORE any insert, so retries cannot duplicate this batch.
        pendingRows=validatedTasks.map(task=>TaskImport.toRow(task,RESTAURANT_ID,crypto.randomUUID()));
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
      pendingRows=null;drafts=[];warnings=[];needsClarification=false;
      try{sessionStorage.removeItem(storageKey);}catch{}
      renderDrafts();message(`${added} tasks added. ${skipped} already existed. Your checklist is ready.`);
      addConversation(null,`${added} tasks were saved to the checklist. ${skipped} already existed and were skipped. The unsaved draft is now empty.`);
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
      needsClarification=saved.needsClarification===true;
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
  renderConversation();renderBriefing();
})();
