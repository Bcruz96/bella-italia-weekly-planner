const {test}=require('node:test');
const assert=require('node:assert/strict');
const context=require('../lib/planner-context.js');
const tasks=require('../lib/task-import.js');
const template={title:'Check payroll',date:'2026-10-19',time:'09:00',people:null,description:'',category:'Payroll Checks'};
test('weekly repeats expand across clock changes and month boundaries with a fixed limit',()=>{
  const rows=tasks.uniqueTasks([{...template,repeat:{frequency:'weekly',endDate:'2026-11-02'}}]);
  assert.deepEqual(rows.map(row=>row.date),['2026-10-19','2026-10-26','2026-11-02']);
  assert.throws(()=>tasks.uniqueTasks([{...template,repeat:{frequency:'daily',endDate:'2026-12-31'}}]),/30/);
  assert.throws(()=>tasks.uniqueTasks([{...template,repeat:{frequency:'weekly',endDate:null}}]));
  assert.throws(()=>tasks.uniqueTasks([{...template,repeat:{frequency:'weekly',endDate:'2026-10-18'}}]));
});
test('snapshot includes recurring fixed tasks, scoped manual tasks and actual completions',()=>{
  const snapshot=context.snapshot({manualTasks:[{id:'late',title:'Late order',dateKey:'2026-10-18',completed:false,category:'Orders'},{id:'old',title:'Archived',dateKey:'2020-01-01',completed:false}],fixedTasks:[{id:'fixed',title:'Payroll',day:'Monday',category:'Payroll Checks'}],completion:{'2026-10-19|fixed':true},weekStart:'2026-10-19',today:'2026-10-19'});
  assert.equal(snapshot.tasks.some(row=>row.id==='old'),false);
  assert.equal(snapshot.tasks.find(row=>row.id==='fixed').completed,true);
  assert.equal(context.insights(snapshot).overdue.length,1);
  assert.equal(context.insights(snapshot).due.length,0);
});
test('insights report same start times as possible clashes and never call fixed omissions overdue',()=>{
  const insights=context.insights({today:'2026-10-19',tasks:[
    {title:'19:30 — Group one',date:'2026-10-20',source:'manual',completed:false},
    {title:'19:30 — Group two',date:'2026-10-20',source:'manual',completed:false},
    {title:'Old fixed',date:'2026-10-18',source:'fixed',completed:false},
    {title:'Completed',date:'2026-10-17',source:'manual',completed:true}]});
  assert.equal(insights.conflicts.length,1);assert.equal(insights.overdue.length,0);
});

test('large snapshots explicitly report truncation',()=>{
  const snapshot=context.snapshot({manualTasks:Array.from({length:205},(_,i)=>({id:String(i),title:'Task '+i,dateKey:'2026-10-19',completed:false,category:'Orders'})),fixedTasks:[],completion:{},weekStart:'2026-10-19',today:'2026-10-19'});
  assert.equal(snapshot.tasks.length,200);assert.equal(snapshot.truncated,true);
});
