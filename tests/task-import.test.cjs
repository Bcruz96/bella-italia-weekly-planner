const {test}=require('node:test');
const assert=require('node:assert/strict');
const tasks=require('../lib/task-import.js');
const valid=()=>({title:'Prepare tables',date:'2026-10-23',time:'19:00',people:25,description:'Tell the kitchen',category:'Front of House'});
test('import validates actual calendar dates, time and people',()=>{
  assert.equal(tasks.isDate('2028-02-29'),true);
  for(const date of ['2026-02-29','2026-04-31','2026-13-01','23/10/2026']) assert.equal(tasks.isDate(date),false);
  for(const patch of [{time:'25:00'},{people:0},{people:1.5},{category:'Unknown'},{title:'  '},{date:null}]) assert.throws(()=>tasks.normalize({...valid(),...patch}));
  assert.equal(tasks.normalize({...valid(),date:null},true).date,null);
});
test('London dates are independent of the device timezone',()=>{
  assert.equal(tasks.londonToday(new Date('2026-07-31T23:30:00Z')),'2026-08-01');
  assert.equal(tasks.londonToday(new Date('2026-10-25T23:30:00Z')),'2026-10-25');
});
test('one import removes repeated tasks and preserves all supplied details',()=>{
  const list=tasks.uniqueTasks([valid(),{...valid(),title:'  Prepare tables  '}]);
  assert.equal(list.length,1);
  const row=tasks.toRow(list[0],'restaurant','stable-id');
  assert.equal(row.id,'stable-id'); assert.equal(row.day,'Friday'); assert.equal(row.completed,false);
  assert.equal(row.title,'19:00 — Prepare tables — 25 people — Tell the kitchen');
  assert.throws(()=>tasks.uniqueTasks([]));
});
const handler=require('../api/plan-tasks.js');
async function call(body, overrides={}) {
  const response={headers:{},setHeader(key,value){this.headers[key]=value;},status(code){this.code=code;return this;},json(value){this.body=value;return this;}};
  await handler({method:'POST',headers:{host:'localhost','x-ai-access-code':'test-code-at-least-12'},body,...overrides},response);
  return response;
}
test('AI endpoint validates access, requests and model output without database writes',async t=>{
  const previous={key:process.env.OPENAI_API_KEY,code:process.env.AI_ACCESS_CODE,fetch:global.fetch};
  t.after(()=>{global.fetch=previous.fetch;for(const [name,value] of [['OPENAI_API_KEY',previous.key],['AI_ACCESS_CODE',previous.code]]) {if(value===undefined)delete process.env[name];else process.env[name]=value;}});
  delete process.env.OPENAI_API_KEY;
  assert.equal((await call({})).code,503);
  process.env.OPENAI_API_KEY='test-not-real';process.env.AI_ACCESS_CODE='test-code-at-least-12';
  let calls=0, sent;
  global.fetch=async (url,options)=>{calls++;sent=JSON.parse(options.body);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({tasks:[valid()],warnings:[]})}]}]})};};
  const body={text:'23/10/2026 25 people prepare tables',weekStart:'2026-10-19'};
  assert.equal((await call(body,{headers:{}})).code,401);
  assert.equal((await call(body,{headers:{host:'localhost',origin:'https://other.example','x-ai-access-code':process.env.AI_ACCESS_CODE}})).code,403);
  assert.equal((await call({...body,text:'x'.repeat(6001)})).code,400);
  assert.equal(calls,0);
  const result=await call(body);
  assert.equal(result.code,200);assert.equal(result.body.tasks[0].people,25);
  assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);
  assert.match(sent.instructions,/UK English \(en-GB\)/);
  assert.match(sent.instructions,/British spelling/);
  global.fetch=async()=>({ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({tasks:[{...valid(),date:'2026-02-30'}],warnings:[]})}]}]})});
  assert.equal((await call(body)).code,502);
  global.fetch=async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})});
  assert.equal((await call(body)).code,502);
  global.fetch=async()=>({ok:false,status:429});
  assert.equal((await call(body)).code,429);
});

test('the exact group shorthand is interpreted without a model',()=>{
  const result=tasks.parseGroupNotes('25/10/26 grpo sales 25 px at 19:30 Fish Chips - Brownie');
  assert.deepEqual(result,{tasks:[{title:'Group sales',date:'2026-10-25',time:'19:30',people:25,description:'Menu: Fish Chips - Brownie',category:'Front of House'}],warnings:[]});
  assert.equal(tasks.toRow(result.tasks[0],'restaurant','id').day,'Sunday');
  const multiple=tasks.parseGroupNotes('25/10/26 grp sales 25 pax at 19:30 Fish Chips - Brownie\n26/10/2026 group booking 12 people 9:05 Pizza');
  assert.equal(multiple.tasks.length,2);assert.equal(multiple.tasks[1].time,'09:05');
});
test('shorthand rejects impossible dates and values and does not guess free-form text',()=>{
  for(const text of ['31/02/26 grpo sales 25 px at 19:30 Fish Chips', '25/10/26 grpo sales 25 px at 25:30 Fish Chips', '25/10/26 grpo sales 0 px at 19:30 Fish Chips']) assert.throws(()=>tasks.parseGroupNotes(text));
  for(const text of ['Friday group sales Fish Chips', '25/10/26 grpo sales 25 px at 19:30 Fish Chips\nSaturday clean kitchen', '25/10/26 grpo sales 25 px at 19:30 Fish Chips; 26/10/26 group sales 12 px at 18:00 Pizza']) assert.equal(tasks.parseGroupNotes(text),null);
});
test('authorised shorthand endpoint works without a model call and refuses invalid notes',async t=>{
  const previous={key:process.env.OPENAI_API_KEY,code:process.env.AI_ACCESS_CODE,fetch:global.fetch};
  t.after(()=>{global.fetch=previous.fetch;for(const [name,value] of [['OPENAI_API_KEY',previous.key],['AI_ACCESS_CODE',previous.code]]) {if(value===undefined)delete process.env[name];else process.env[name]=value;}});
  delete process.env.OPENAI_API_KEY;process.env.AI_ACCESS_CODE='test-code-at-least-12';
  global.fetch=async()=>{throw Error('Shorthand must not call OpenAI');};
  const body={text:'25/10/26 grpo sales 25 px at 19:30 Fish Chips - Brownie',weekStart:'2026-10-19'};
  const result=await call(body);assert.equal(result.code,200);assert.equal(result.body.tasks[0].date,'2026-10-25');assert.equal(result.body.tasks[0].people,25);
  assert.equal((await call(body,{headers:{}})).code,401);
  assert.equal((await call({...body,text:body.text.replace('25/10','31/02')})).code,400);
  assert.equal((await call({...body,text:'Tomorrow check stock'})).code,503);
});
