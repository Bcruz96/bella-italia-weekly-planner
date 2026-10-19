const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const base=()=>({title:'Prepare tables',date:'2027-10-23',time:'19:00',people:25,description:'Tell kitchen',category:'Front of House'});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(t, options={}) {
  const html=fs.readFileSync('index.html','utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
  const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'outside-only'}), w=dom.window;
  t.after(()=>w.close());
  let simulatedNow=options.now?Date.parse(options.now):Date.now();
  class AppDate extends Date{constructor(...args){super(...(args.length?args:[simulatedNow]));}static now(){return simulatedNow;}}
  w.Date=AppDate;
  const timers=new Map();w.setInterval=(callback,ms)=>{timers.set(ms,callback);return ms;};
  const store={manual_tasks:options.existing || [],fixed_task_completion:[]};
  let inserts=0, loseResponse=Boolean(options.loseResponse);
  const client={from(table){
    let filters=[],rows=null;
    const q={order(){return q;},range(){return q;},select(){return q;},eq(key,value){filters.push([key,value]);return q;},limit(){return q;},
      insert(value){rows=value;return q;},then(resolve,reject){return Promise.resolve().then(()=>{
        if(rows){
          inserts++;
          if(rows.some(row=>store[table].some(saved=>saved.id===row.id))) return {data:null,error:{message:'duplicate id'}};
          store[table].push(...rows);
          if(loseResponse){loseResponse=false;throw Error('Lost response after commit');}
          return {data:rows,error:null};
        }
        return {data:store[table].filter(row=>filters.every(([key,value])=>row[key]===value)),error:null};
      }).then(resolve,reject);}};return q;
  }};
  w.supabase={createClient:()=>client};w.AbortController=AbortController;w.confirm=()=>true;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.console.error=()=>{};
  w.fetch=async()=>({ok:true,json:async()=>({tasks:options.tasks || [base()],warnings:options.warnings || []})});
  if(options.draft)w.sessionStorage.setItem('bella-ai-draft-v1',options.draft);
  if(options.remembered)w.localStorage.setItem('bella-ai-access-v1',options.remembered);
  const run=code=>vm.runInContext(code,dom.getInternalVMContext());
  for(const file of ['script.js','lib/task-import.js','lib/planner-context.js','ai-planner.js'])run(fs.readFileSync(file,'utf8'));
  await settle();
  const get=id=>w.document.getElementById(id);
  get('openAiPlanner').click();if(!options.remembered)get('aiCode').value='team-code';get('aiText').value='My weekly tasks';
  async function generate(){if(!get('aiText').value)get('aiText').value='My weekly tasks';get('aiPlanForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();}
  async function save(){get('aiSaveForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();}
  return {w,get,run,store,generate,save,inserts:()=>inserts,setNow:value=>{simulatedNow=Date.parse(value);},tickMinute:()=>timers.get(60000)()};
}
test('real HTML opens an editable AI preview and saves all details on the right date',async t=>{
  const app=await setup(t); await app.generate();
  assert.equal(app.get('aiReview').hidden,false);
  assert.equal(app.store.manual_tasks.length,0);
  const title=app.get('aiDrafts').querySelector('input[type=text]');
  title.value='Set up group tables';title.dispatchEvent(new app.w.Event('input'));
  await app.save();
  assert.equal(app.store.manual_tasks.length,1);
  const row=app.store.manual_tasks[0];
  assert.equal(row.date_key,'2027-10-23');assert.equal(row.day,'Saturday');
  assert.equal(row.title,'19:00 — Set up group tables — 25 people — Tell kitchen');
  assert.equal(app.run('getSelectedDateKey()'),'2027-10-23');
  assert.equal(app.w.sessionStorage.getItem('bella-ai-draft-v1'),null);
});
test('missing dates block save; ambiguous task can be corrected in preview',async t=>{
  const app=await setup(t,{tasks:[{...base(),date:null}],warnings:['Which date?']});await app.generate();
  await app.save();assert.equal(app.inserts(),0);
  const date=app.get('aiDrafts').querySelector('input[type=date]');date.value='2027-10-24';date.dispatchEvent(new app.w.Event('input'));
  await app.save();assert.equal(app.store.manual_tasks[0].date_key,'2027-10-24');
});
test('past dates require acknowledgement',async t=>{
  const app=await setup(t,{tasks:[{...base(),date:'2020-01-01'}]});await app.generate();
  await app.save();assert.equal(app.inserts(),0);
  app.get('aiAllowPast').checked=true;await app.save();assert.equal(app.inserts(),1);
});
test('lost insert response can retry after reopening without inserting duplicates',async t=>{
  const app=await setup(t,{loseResponse:true});await app.generate();await app.save();
  assert.equal(app.inserts(),1);assert.equal(app.store.manual_tasks.length,1);
  assert.equal(app.get('aiGenerate').disabled,true);
  const persisted=app.w.sessionStorage.getItem('bella-ai-draft-v1');assert.ok(JSON.parse(persisted).pendingRows[0].id);
  const restored=await setup(t,{draft:persisted,existing:app.store.manual_tasks});
  await restored.save();assert.equal(restored.inserts(),0);assert.equal(restored.store.manual_tasks.length,1);
  assert.equal(restored.w.sessionStorage.getItem('bella-ai-draft-v1'),null);
});
test('batch and existing duplicates are skipped and malicious titles stay text',async t=>{
  const task={...base(),title:'<img src=x onerror=alert(1)>'};
  const app=await setup(t,{tasks:[task,task]});await app.generate();await app.save();
  assert.equal(app.store.manual_tasks.length,1);
  assert.equal(app.w.document.querySelector('.task-title img'),null);
  await app.generate();await app.save();assert.equal(app.store.manual_tasks.length,1);assert.equal(app.inserts(),1);
});

test('double save clicks result in a single batch insert',async t=>{
  const app=await setup(t);await app.generate();
  await Promise.all([app.save(),app.save()]);
  assert.equal(app.inserts(),1);assert.equal(app.store.manual_tasks.length,1);
});
test('storage failure blocks inserts rather than risking duplicate retries',async t=>{
  const app=await setup(t);await app.generate();
  app.w.Storage.prototype.setItem=function(){throw Error('Quota exceeded');};
  await app.save();assert.equal(app.inserts(),0);
  assert.match(app.get('aiStatus').textContent,/Nothing was added/);
  assert.equal(app.get('aiGenerate').disabled,false);
});
test('unconfigured AI service leaves checklist and draft untouched',async t=>{
  const app=await setup(t);
  app.w.fetch=async()=>({ok:false,json:async()=>({error:'AI is not configured yet.'})});
  await app.generate();assert.match(app.get('aiStatus').textContent,/not configured/);
  assert.equal(app.store.manual_tasks.length,0);
  assert.equal(app.get('aiGenerate').disabled,false);
});

test('remembering the team code is opt-in and restores it after reopening',async t=>{
  const app=await setup(t);await app.generate();
  assert.equal(app.w.localStorage.getItem('bella-ai-access-v1'),null);
  app.get('aiCode').value='test-team-code-123';app.get('aiRememberCode').checked=true;
  await app.generate();
  assert.equal(app.w.localStorage.getItem('bella-ai-access-v1'),'test-team-code-123');
  assert.equal(app.get('aiCodeEntry').hidden,true);
  const restored=await setup(t,{remembered:app.w.localStorage.getItem('bella-ai-access-v1')});
  assert.equal(restored.get('aiCode').value,'test-team-code-123');
  assert.equal(restored.get('aiCodeSaved').hidden,false);
  let sentCode;
  restored.w.fetch=async(url,options)=>{sentCode=options.headers['x-ai-access-code'];return {ok:true,json:async()=>({tasks:[base()],warnings:[]})};};
  await restored.generate();assert.equal(sentCode,'test-team-code-123');
});
test('Forget code removes it from this device and reveals the input',async t=>{
  const app=await setup(t,{remembered:'test-team-code-123'});
  app.get('aiForgetCode').click();
  assert.equal(app.w.localStorage.getItem('bella-ai-access-v1'),null);
  assert.equal(app.get('aiCode').value,'');
  assert.equal(app.get('aiCodeEntry').hidden,false);
  assert.equal(app.get('aiRememberCode').checked,false);
  assert.equal(app.w.document.activeElement,app.get('aiCode'));
});
test('an invalid remembered code is cleared and a replacement can be entered',async t=>{
  const app=await setup(t,{remembered:'old-team-code-123'});
  app.w.fetch=async()=>({ok:false,status:401,json:async()=>({error:'Enter the correct team access code.'})});
  await app.generate();
  assert.equal(app.w.localStorage.getItem('bella-ai-access-v1'),null);
  assert.equal(app.get('aiCodeEntry').hidden,false);
  assert.equal(app.get('aiCode').value,'');
  assert.equal(app.get('aiCode').disabled,false);
  assert.equal(app.w.document.activeElement,app.get('aiCode'));
  assert.equal(app.store.manual_tasks.length,0);
});
test('blocked persistent storage does not prevent planning tasks',async t=>{
  const app=await setup(t);
  app.get('aiRememberCode').checked=true;
  const original=app.w.Storage.prototype.setItem;
  app.w.Storage.prototype.setItem=function(key,value){if(key==='bella-ai-access-v1')throw Error('Blocked');return original.call(this,key,value);};
  await app.generate();
  assert.equal(app.get('aiReview').hidden,false);
  assert.match(app.get('aiStatus').textContent,/could not remember/);
  assert.equal(app.get('aiCodeEntry').hidden,false);
});

test('verified access code is remembered even when OpenAI has no credit',async t=>{
  const app=await setup(t);app.get('aiCode').value='test-team-code-123';app.get('aiRememberCode').checked=true;
  app.w.fetch=async()=>({ok:false,status:429,headers:{get:()=> 'true'},json:async()=>({error:'OpenAI API credit or quota is unavailable.'})});
  await app.generate();assert.equal(app.w.localStorage.getItem('bella-ai-access-v1'),'test-team-code-123');
  assert.equal(app.get('aiCodeSaved').hidden,false);assert.equal(app.store.manual_tasks.length,0);
  assert.match(app.get('aiStatus').textContent,/quota/);
});

test('follow-up messages send draft, conversation and planner context',async t=>{
  const app=await setup(t);await app.generate();
  let sent;
  app.w.fetch=async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({tasks:[{...base(),time:'20:00'}],warnings:[],reply:'I changed the draft to 20:00.',draftMode:'replace',needsClarification:false})};};
  app.get('aiText').value='Make it 20:00';await app.generate();
  assert.equal(sent.currentDraft[0].time,'19:00');assert.equal(sent.history.length,2);
  assert.ok(sent.context.tasks.some(task=>task.category==='Payroll Checks'));
  assert.equal(app.get('aiDrafts').querySelector('input[type=time]').value,'20:00');
  assert.match(app.get('aiConversation').textContent,/changed the draft/);
  assert.equal(app.store.manual_tasks.length,0);
});
test('answering a question keeps the unsaved draft and does not insert tasks',async t=>{
  const app=await setup(t);await app.generate();
  app.w.fetch=async()=>({ok:true,json:async()=>({tasks:[],warnings:[],reply:'Your payroll checks are on Monday.',draftMode:'keep',needsClarification:false})});
  app.get('aiText').value='When is payroll?';await app.generate();
  assert.equal(app.get('aiDrafts').querySelector('input[type=text]').value,'Prepare tables');
  assert.match(app.get('aiConversation').textContent,/payroll checks/);assert.equal(app.inserts(),0);
});
test('clarification blocks saving until answered in the conversation',async t=>{
  const app=await setup(t);
  app.w.fetch=async()=>({ok:true,json:async()=>({tasks:[{...base(),date:null}],warnings:[],reply:'Which date is the group arriving?',draftMode:'replace',needsClarification:true})});
  await app.generate();assert.equal(app.get('aiSave').disabled,true);await app.save();assert.equal(app.inserts(),0);
  app.w.fetch=async()=>({ok:true,json:async()=>({tasks:[base()],warnings:[],reply:'I have set the date.',draftMode:'replace',needsClarification:false})});
  app.get('aiText').value='23 October 2027';await app.generate();await app.save();assert.equal(app.inserts(),1);
});
test('reviewed weekly tasks save bounded occurrences on separate dates',async t=>{
  const app=await setup(t,{tasks:[{...base(),repeat:{frequency:'weekly',endDate:'2027-11-06'}}]});
  await app.generate();await app.save();
  assert.deepEqual(app.store.manual_tasks.map(row=>row.date_key),['2027-10-23','2027-10-30','2027-11-06']);
  assert.match(app.get('aiConversation').textContent,/3 tasks were saved/);
});
test('new chat clears conversation and draft while keeping saved checklist',async t=>{
  const app=await setup(t);await app.generate();await app.save();
  app.get('aiNewChat').click();assert.equal(app.get('aiReview').hidden,true);
  assert.equal(app.w.sessionStorage.getItem('bella-planner-chat-v1'),null);
  assert.equal(app.store.manual_tasks.length,1);
});

test('the live day follows midnight only while viewing today',async t=>{
  const app=await setup(t,{now:'2026-10-19T22:59:00Z'});
  assert.equal(app.run('getSelectedDateKey()'),'2026-10-19');
  app.setNow('2026-10-20T00:01:00Z');app.tickMinute();
  assert.equal(app.run('getSelectedDateKey()'),'2026-10-20');
  app.get('nextLabel').click();const browsing=app.run('getSelectedDateKey()');
  app.setNow('2026-10-21T00:01:00Z');app.tickMinute();
  assert.equal(app.run('getSelectedDateKey()'),browsing);
  assert.match(app.get('briefingText').textContent,/unfinished today/);
});
