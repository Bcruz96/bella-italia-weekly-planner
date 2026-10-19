(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PlannerContext=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const key=date=>date.toISOString().slice(0,10);
  function shift(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return key(d);}
  function snapshot({manualTasks,fixedTasks,completion,stockTask,weekStart,today}){
    const dates=new Set();
    for(let i=0;i<7;i++){dates.add(shift(weekStart,i));dates.add(shift(today,i));}
    const oldest=shift(today,-30),rows=[];
    manualTasks.forEach(task=>{
      if((task.dateKey>=oldest&&task.dateKey<=shift(today,30))||dates.has(task.dateKey))rows.push({id:String(task.id),title:task.title,date:task.dateKey,category:task.category,completed:Boolean(task.completed),source:'manual'});
    });
    for(const date of dates){
      const d=new Date(date+'T12:00:00Z'),day=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getUTCDay()];
      const applicable=fixedTasks.filter(task=>task.day===day);
      if(d.getUTCDay()===0&&new Date(shift(date,7)+'T12:00:00Z').getUTCMonth()!==d.getUTCMonth())applicable.push(stockTask);
      applicable.filter(Boolean).forEach(task=>rows.push({id:task.id,title:task.title,date,category:task.category,completed:Boolean(completion[date+'|'+task.id]),source:'fixed'}));
    }
    rows.sort((a,b)=>Number(a.completed)-Number(b.completed)||a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
    return {today,weekStart,tasks:rows.slice(0,200),truncated:rows.length>200,scope:'Selected week, next 7 days, and dated manual tasks from the last 30 to next 30 days. Historical fixed-task omissions are not overdue records.'};
  }
  function insights(context){
    const pending=context.tasks.filter(task=>!task.completed),today=context.today;
    const priority=task=>task.category==='Payroll Checks'?0:task.category==='Orders'?1:2;
    const due=pending.filter(task=>task.date===today).sort((a,b)=>priority(a)-priority(b));
    const overdue=pending.filter(task=>task.source==='manual'&&task.date<today);
    const upcoming=pending.filter(task=>task.date>today&&task.date<=shift(today,7));
    const slots=new Map(),conflicts=[];
    pending.forEach(task=>{const time=task.title.match(/^([01]\d|2[0-3]):[0-5]\d/);if(!time)return;const k=task.date+' '+time[0];const prev=slots.get(k);if(prev)conflicts.push({date:task.date,time:time[0],titles:[prev.title,task.title]});else slots.set(k,task);});
    return {due,overdue,upcoming,conflicts};
  }
  return {shift,snapshot,insights};
});
