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
      querySelector() { return this.child ||= element(); }, querySelectorAll() { return []; }
    };
  }
  const ctx = vm.createContext({ Date: AppDate, console: { error() {} }, navigator: { onLine: true },
    confirm: () => true, setInterval() {}, window: { addEventListener() {} },
    document: { hidden: false, addEventListener() {}, createElement: element,
      getElementById(id) { if (!elements.has(id)) elements.set(id,element()); return elements.get(id); } },
    supabase: { createClient: () => ({ from: () => ({ select: () => ({
      eq: async () => ({data: [], error: null})
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
