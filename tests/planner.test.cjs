const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
process.env.TZ = 'Europe/London';
function setup(options = {}) {
  let now = options.now ? Date.parse(options.now) : Date.now();
  class AppDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const elements = new Map();
  function element() {
    return { children: [], dataset: {}, style: {}, value: '', listeners: {}, attributes: {},
      classList: { add() {}, remove() {}, contains() { return false; } },
      appendChild(el) { this.children.push(el); }, append(...els) { this.children.push(...els); },
      setAttribute(k,v) { this.attributes[k]=v; },
      addEventListener(k,fn) { this.listeners[k]=fn; }, focus() {}, reset() {},
      setCustomValidity(v) { this.validityMessage=v; },
      reportValidity() { return !elements.get('taskTitle').validityMessage; },
      querySelector() { return this.child ||= element(); }, querySelectorAll(selector) {
        const descendants = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
        return selector === 'button' ? descendants.filter(child => child.tagName === 'button') : descendants;
      }
    };
  }
  const ctx = vm.createContext({ AbortController, setTimeout, clearTimeout, fetch: options.fetch || fetch, Date: AppDate, console: { error() {} }, navigator: { onLine: true },
    confirm: () => true, setInterval() {}, window: { addEventListener() {} },
    document: { hidden: false, addEventListener() {}, createElement: tag => Object.assign(element(), {tagName:tag}),
      getElementById(id) { if (!elements.has(id)) elements.set(id,element()); return elements.get(id); } },
    supabase: { createClient: () => ({ from: () => ({ select: () => ({
      eq() {return this;}, order() {return this;}, range: async () => ({data: [], error: null})
    }) }) }) }
  });
  let source=fs.readFileSync('script.js','utf8');
  if (!options.bootstrap) source=source.slice(0,source.lastIndexOf('renderApp();\nrefreshLiveData();'));
  vm.runInContext(source,ctx);
  const run = code => vm.runInContext(code,ctx);
  if (!options.bootstrap) run('dataLoaded = true; renderApp = () => {};');
  return {run,elements, setNow: value => { now = Date.parse(value); }};
}
test('day arrows cross week and year boundaries', () => {
  const {run,elements}=setup();
  run('weekStart = new Date(2026,11,28); selectedDayIndex = 6;');
  elements.get('nextDay').listeners.click();
  assert.equal(run('getSelectedDateKey()'),'2027-01-04');
  elements.get('previousDay').listeners.click();
  assert.equal(run('getSelectedDateKey()'),'2027-01-03');
});
test('failed writes preserve completion and deletion state and show error', async () => {
  const {run,elements}=setup();
  run('manualTasks = [{id: "1", completed:false}]; updateManualTaskOnline = async () => {throw Error("offline")}; deleteManualTaskOnline = updateManualTaskOnline;');
  await run('toggleTask("1",false)');
  assert.equal(run('manualTasks[0].completed'),false);
  await run('deleteTask("1")');
  assert.equal(run('manualTasks.length'),1);
  assert.equal(elements.get('syncStatus').dataset.state,'error');
  assert.equal(elements.get('appMessage').hidden,false);
});
test('polling and repeated clicks cannot run during a pending write', async () => {
  const {run}=setup();
  run('var finish; var writes = 0; var reads = 0; manualTasks = [{id:"1", completed:false}]; updateManualTaskOnline = () => {writes++; return new Promise(resolve => finish=resolve)}; loadDataFromSupabase = async () => {reads++};');
  const pending=run('toggleTask("1",false)');
  await run('toggleTask("1",false)');
  await run('refreshLiveData()');
  assert.equal(run('writes'),1); assert.equal(run('reads'),0);
  assert.equal(run('manualTasks[0].completed'),false);
  run('finish()'); await pending;
  assert.equal(run('manualTasks[0].completed'),true);
});
test('fixed task saves retain captured date while user navigates', async () => {
  const {run}=setup();
  run('var finish; var savedDate; weekStart = new Date(2026,9,19); selectedDayIndex=0; saveFixedCompletion = (id,value,date) => {savedDate=date; return new Promise(resolve => finish=resolve)};');
  const pending=run('toggleTask("mon-payroll-1",true)');
  run('selectedDayIndex=1; finish()'); await pending;
  assert.equal(run('savedDate'),'2026-10-19');
  assert.equal(run('fixedTaskCompletion["2026-10-19|mon-payroll-1"]'),true);
});
test('form rejects whitespace and suppresses duplicate submissions', async () => {
  const {run,elements}=setup();
  const submit=elements.get('taskForm').listeners.submit;
  elements.get('taskTitle').value='   ';
  await submit({preventDefault(){}});
  assert.equal(run('manualTasks.length'),0);
  elements.get('taskTitle').value='  New task  ';
  elements.get('taskDay').value='Monday';
  run('var finish; var inserts = 0; addManualTaskOnline = task => {inserts++; return new Promise(resolve => finish=() => resolve({...task,id:"new"}))};');
  const pending=submit({preventDefault(){}});
  await submit({preventDefault(){}});
  assert.equal(run('inserts'),1);
  assert.equal(elements.get('taskForm').child.disabled,true);
  run('finish()'); await pending;
  assert.equal(run('manualTasks[0].title'),'New task');
});
test('untrusted title and category render as text, without inline handlers', () => {
  const {run,elements}=setup();
  run('selectedDayIndex=0; manualTasks=[{id:"x",title:"<img src=x onerror=alert(1)>",category:"<svg onload=alert(1)>",dateKey:getSelectedDateKey(),completed:false}]; renderTaskGroups();');
  const group=elements.get('taskGroups').children[0];
  assert.equal(group.child.textContent,'<svg onload=alert(1)>');
  const row=group.children[0];
  assert.equal(row.children[1].children[0].textContent,'<img src=x onerror=alert(1)>');
  assert.equal(row.children[0].attributes['aria-pressed'],'false');
  assert.equal(row.innerHTML,undefined);
});

const openingDates = [
  ['2026-10-19T09:00:00+01:00', '2026-10-19', 'MONDAY', 'October 2026', '2026-10-19'],
  ['2026-10-25T23:59:59+00:00', '2026-10-25', 'SUNDAY', 'October 2026', '2026-10-19'],
  ['2026-10-26T00:00:00+00:00', '2026-10-26', 'MONDAY', 'October 2026', '2026-10-26'],
  ['2026-11-01T00:00:00+00:00', '2026-11-01', 'SUNDAY', 'November 2026', '2026-10-26'],
  ['2027-01-01T00:00:00+00:00', '2027-01-01', 'FRIDAY', 'January 2027', '2026-12-28'],
  ['2028-02-29T12:00:00+00:00', '2028-02-29', 'TUESDAY', 'February 2028', '2028-02-28'],
  ['2026-03-29T00:59:59+00:00', '2026-03-29', 'SUNDAY', 'March 2026', '2026-03-23'],
  ['2026-03-29T02:00:00+01:00', '2026-03-29', 'SUNDAY', 'March 2026', '2026-03-23'],
  ['2026-10-25T01:30:00+01:00', '2026-10-25', 'SUNDAY', 'October 2026', '2026-10-19'],
  ['2026-10-25T01:30:00+00:00', '2026-10-25', 'SUNDAY', 'October 2026', '2026-10-19'],
  ['2026-07-31T23:30:00Z', '2026-08-01', 'SATURDAY', 'August 2026', '2026-07-27']
];
for (const [now, expectedDate, day, month, monday] of openingDates) {
  test('opening app selects current London date: ' + now, async () => {
    const {run,elements} = setup({now, bootstrap:true});
    // Check first paint, before the database response.
    assert.equal(run('getSelectedDateKey()'), expectedDate);
    assert.equal(run('getDateKey(weekStart)'), monday);
    assert.equal(elements.get('selectedDayName').textContent, day);
    assert.equal(String(elements.get('selectedDayNumber').textContent), String(Number(expectedDate.slice(-2))));
    assert.equal(elements.get('selectedMonth').textContent, month);
    assert.equal(elements.get('monthTitle').textContent, month);
    assert.equal(elements.get('taskDay').value.toUpperCase(), day);
    const days = elements.get('daysContainer').children;
    assert.equal(days.length,7);
    assert.equal(days.filter(d => d.attributes['aria-pressed'] === 'true').length,1);
    // Database completion must keep the same date and finish initial sync.
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(run('getSelectedDateKey()'),expectedDate);
    assert.equal(elements.get('syncStatus').dataset.state,'synced');
  });
}
test('reopening next day uses new date; Today updates an already open app', async () => {
  const app = setup({now:'2026-10-25T23:59:59Z', bootstrap:true});
  await new Promise(resolve => setImmediate(resolve));
  app.setNow('2026-10-26T00:00:01Z');
  app.elements.get('todayButton').listeners.click();
  assert.equal(app.run('getSelectedDateKey()'),'2026-10-26');
  assert.equal(app.elements.get('selectedDayName').textContent,'MONDAY');
  const reopened = setup({now:'2026-10-26T00:00:01Z', bootstrap:true});
  assert.equal(reopened.run('getSelectedDateKey()'),'2026-10-26');
  await new Promise(resolve => setImmediate(resolve));
});

test('failed initial connection reports unavailable database and unlocks request state', async () => {
  const {run,elements}=setup();
  run('renderApp=renderBusyState; dataLoaded=false; loadDataFromSupabase=async () => {throw new TypeError("Failed to fetch")};');
  await run('refreshLiveData()');
  assert.equal(run('dataBusy'),false);
  assert.equal(run('dataLoaded'),false);
  assert.match(elements.get('appMessage').textContent,/Cannot connect to the task database/);
  assert.equal(elements.get('syncStatus').dataset.state,'error');
  assert.equal(elements.get('taskForm').child.disabled,true);
  run('loadDataFromSupabase=async () => {dataLoaded=true};');
  await run('refreshLiveData()');
  assert.equal(elements.get('taskForm').child.disabled,false);
  assert.equal(elements.get('syncStatus').dataset.state,'synced');
});
test('fixed completion can be checked and unchecked after successful writes', async () => {
  const {run}=setup();
  run('var writes=[]; saveFixedCompletion=async (id,completed,date) => {writes.push({id,completed,date})};');
  await run('toggleTask("mon-payroll-1",true)');
  assert.equal(run('fixedTaskCompletion[getSelectedDateKey()+"|mon-payroll-1"]'),true);
  await run('toggleTask("mon-payroll-1",true)');
  assert.equal(run('fixedTaskCompletion[getSelectedDateKey()+"|mon-payroll-1"]'),false);
  assert.equal(run('writes.length'),2);
});

test('actual rendered checkbox invokes handler and becomes checked after save', async () => {
  const {run,elements}=setup();
  run('selectedDayIndex=0; var writes=0; saveFixedCompletion=async () => {writes++}; renderApp=() => {taskGroups.children=[]; renderTaskGroups(); renderBusyState()}; renderApp();');
  let row=elements.get('taskGroups').children[0].children[0];
  assert.equal(row.children[0].disabled,false);
  row.children[0].listeners.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(run('writes'),1);
  row=elements.get('taskGroups').children[0].children[0];
  assert.equal(row.children[0].attributes['aria-pressed'],'true');
  row.children[0].listeners.click();
  await new Promise(resolve => setImmediate(resolve));
  row=elements.get('taskGroups').children[0].children[0];
  assert.equal(row.children[0].attributes['aria-pressed'],'false');
});
test('database permission errors are visible and controls recover', async () => {
  const {run,elements}=setup();
  run('selectedDayIndex=0; saveFixedCompletion=async () => {throw {code:"42501",message:"new row violates row-level security policy"}}; renderApp=() => {taskGroups.children=[]; renderTaskGroups(); renderBusyState()}; renderApp();');
  elements.get('taskGroups').children[0].children[0].children[0].listeners.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(elements.get('appMessage').textContent,/row-level security/);
  const button=elements.get('taskGroups').children[0].children[0].children[0];
  assert.equal(button.disabled,false);
  assert.equal(button.attributes['aria-pressed'],'false');
});
test('manual completion survives a later successful reload', async () => {
  const {run}=setup();
  run('manualTasks=[{id:"manual",completed:false}]; var stored=false; updateManualTaskOnline=async (id,value) => {stored=value}; loadDataFromSupabase=async () => {manualTasks=[{id:"manual",completed:stored}]};');
  await run('toggleTask("manual",false)');
  await run('refreshLiveData()');
  assert.equal(run('manualTasks[0].completed'),true);
});
test('network wrapper propagates cancellation without hanging', async () => {
  const {run}=setup({fetch: async (input,options) => {
    if(options.signal.aborted) throw new DOMException('Aborted','AbortError');
    return new Promise((resolve,reject) => options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));
  }});
  run('var requestAbort=new AbortController();');
  const pending=run('fetchWithTimeout("https://example.invalid",{signal:requestAbort.signal})');
  run('requestAbort.abort()');
  await assert.rejects(pending,{name:'AbortError'});
});

test('real HTML defines every element required by app startup', () => {
  const html=fs.readFileSync('index.html','utf8');
  const script=fs.readFileSync('script.js','utf8');
  const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(match=>match[1]));
  for(const match of script.matchAll(/document\.getElementById\("([^"]+)"\)/g)) {
    assert.ok(ids.has(match[1]),'Missing HTML element: '+match[1]);
  }
});

test('loading paginates beyond the database row limit',async()=>{
  const {run}=setup();
  run('var pageCalls=[]; database.from=table=>{const query={select(){return query},eq(){return query},order(){return query},async range(start,end){pageCalls.push({table,start});return {data:table==="manual_tasks"?Array.from({length:Math.max(0,Math.min(1201-start,end-start+1))},(_,i)=>({id:String(start+i),title:"Task "+(start+i),date_key:"2026-10-19",day:"Monday",category:"Weekly Tasks",completed:false})):[],error:null}}};return query};');
  await run('loadDataFromSupabase()');
  assert.equal(run('manualTasks.length'),1201);
  assert.equal(run('manualTasks[1200].id'),'1200');
  assert.equal(run('pageCalls.filter(call=>call.table==="manual_tasks").length'),3);
});
