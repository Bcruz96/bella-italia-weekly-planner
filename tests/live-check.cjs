// Explicit live check. Dependencies: jsdom and @supabase/supabase-js.
// Run with NODE_PATH pointing at installed dependencies: node tests/live-check.cjs --live
if (!process.argv.includes('--live')) throw Error('Pass --live to create and clean up temporary test records.');
const {JSDOM}=require('jsdom');
const sdk=require('@supabase/supabase-js');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'outside-only'});
const win=dom.window;
win.fetch=fetch;
win.AbortController=AbortController;
win.supabase=sdk;
win.confirm=()=>true;
const vm=require('node:vm');
const evaluate=code=>vm.runInContext(code,dom.getInternalVMContext());
const waitFor=async predicate=>{
  const start=Date.now();
  while(!predicate()) {
    if(Date.now()-start>22000) throw Error('App did not become ready: '+win.document.getElementById('appMessage').textContent);
    await new Promise(resolve=>setTimeout(resolve,50));
  }
};
(async()=>{
  let manualId;
  let fixedRecord;
  try {
    evaluate(fs.readFileSync('script.js','utf8'));
    await waitFor(()=>evaluate('dataLoaded && !dataBusy'));
    console.log('PASS: real app startup and both table reads');
    // Isolate test data from the team's current checklist.
    evaluate('weekStart=getMondayOfWeek(new Date(2099,11,31)); selectedDayIndex=0; renderApp();');
    const date=evaluate('getSelectedDateKey()');
    const client=evaluate('database');
    const restaurant=evaluate('RESTAURANT_ID');
    const title='Temporary automated check '+crypto.randomUUID();
    win.document.getElementById('openTaskModal').click();
    win.document.getElementById('taskTitle').value=title;
    win.document.getElementById('taskDay').value='Monday';
    win.document.getElementById('taskCategory').value='Weekly Tasks';
    win.document.getElementById('taskForm').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
    await waitFor(()=>!evaluate('dataBusy'));
    const rowResult=await client.from('manual_tasks').select('*').eq('restaurant_id',restaurant).eq('title',title).single();
    assert.ifError(rowResult.error);
    manualId=rowResult.data.id;
    console.log('PASS: actual form inserts manual task');
    function manualButton() {
      const label=[...win.document.querySelectorAll('.task-title')].find(el=>el.textContent===title);
      assert.ok(label,'Manual task is rendered');
      return label.closest('.task-item').querySelector('.task-check');
    }
    manualButton().click(); await waitFor(()=>!evaluate('dataBusy'));
    assert.equal(manualButton().getAttribute('aria-pressed'),'true');
    await evaluate('refreshLiveData()');
    assert.equal(manualButton().getAttribute('aria-pressed'),'true');
    manualButton().click(); await waitFor(()=>!evaluate('dataBusy'));
    await evaluate('refreshLiveData()');
    assert.equal(manualButton().getAttribute('aria-pressed'),'false');
    console.log('PASS: real manual checkbox checks, persists, unchecks and persists');
    const taskId='mon-payroll-1';
    const existing=await client.from('fixed_task_completion').select('id').eq('restaurant_id',restaurant).eq('date_key',date).eq('task_id',taskId);
    assert.ifError(existing.error);
    assert.equal(existing.data.length,0,'Refusing to modify an existing fixed completion');
    fixedRecord={restaurant,date,taskId};
    const fixedButton=()=>win.document.querySelector('[aria-label="Complete task: Complete 8:30–9am. Payroll must be submitted by 9am."]');
    assert.ok(fixedButton()); fixedButton().click();
    await waitFor(()=>!evaluate('dataBusy'));
    await evaluate('refreshLiveData()');
    assert.equal(fixedButton().getAttribute('aria-pressed'),'true');
    fixedButton().click(); await waitFor(()=>!evaluate('dataBusy'));
    await evaluate('refreshLiveData()');
    assert.equal(fixedButton().getAttribute('aria-pressed'),'false');
    console.log('PASS: real fixed checkbox inserts, checks, unchecks and persists');
    await evaluate('deleteTask('+JSON.stringify(manualId)+')');
    const deleted=await client.from('manual_tasks').select('id').eq('id',manualId);
    assert.ifError(deleted.error); assert.equal(deleted.data.length,0);
    console.log('PASS: manual task deletion confirmed in database');
  } finally {
    const client=evaluate('database');
    if(manualId) {
      const result=await client.from('manual_tasks').delete().eq('id',manualId);
      assert.ifError(result.error);
    }
    if(fixedRecord) {
      const result=await client.from('fixed_task_completion').delete().eq('restaurant_id',fixedRecord.restaurant).eq('date_key',fixedRecord.date).eq('task_id',fixedRecord.taskId);
      assert.ifError(result.error);
      const check=await client.from('fixed_task_completion').select('id').eq('restaurant_id',fixedRecord.restaurant).eq('date_key',fixedRecord.date).eq('task_id',fixedRecord.taskId);
      assert.ifError(check.error);
      if(check.data.length) console.warn('Cleanup blocked by database permissions. Temporary fixed completion id:',check.data[0].id);
    }
    console.log('Cleanup attempted; see any permission warning above');
    win.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
