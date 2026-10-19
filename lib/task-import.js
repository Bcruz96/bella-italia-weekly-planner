(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TaskImport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const categories = ['Payroll Checks', 'Orders', 'Cleaning', 'Kitchen', 'Front of House', 'Weekly Tasks'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function isDate(value) {
    if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function londonToday(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now);
    const part = name => parts.find(item => item.type === name).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  function normalize(task, allowMissingDate = false) {
    if (!task || typeof task.title !== 'string' || !task.title.trim() || task.title.trim().length > 240) throw Error('Each task needs a title of up to 240 characters.');
    if (!(allowMissingDate && task.date === null) && !isDate(task.date)) throw Error('Choose a valid date for every task.');
    if (task.time !== null && (typeof task.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.time))) throw Error('Use a valid time (HH:MM).');
    if (task.people !== null && (!Number.isInteger(task.people) || task.people < 1 || task.people > 10000)) throw Error('People must be a whole number between 1 and 10,000.');
    if (typeof task.description !== 'string' || task.description.length > 1200) throw Error('Description must be up to 1,200 characters.');
    if (!categories.includes(task.category)) throw Error('Choose a supported category.');
    const valid={title:task.title.trim(),date:task.date,time:task.time,people:task.people,description:task.description.trim(),category:task.category};
    if(task.repeat!==undefined){
      if(!task.repeat||!['none','daily','weekly'].includes(task.repeat.frequency))throw Error('Choose a supported repeat frequency.');
      const {frequency,endDate}=task.repeat;
      if(frequency!=='none'&&((endDate!==null&&!isDate(endDate))||(!allowMissingDate&&(!isDate(endDate)||!isDate(task.date)))||(isDate(endDate)&&isDate(task.date)&&endDate<task.date)))throw Error('Choose a valid start and end date for repeating tasks.');
      valid.repeat={frequency,endDate:frequency==='none'?null:endDate};
    }
    return valid;
  }
  function titleFor(task) {
    return [task.time, task.title, task.people === null ? null : `${task.people} people`, task.description || null].filter(Boolean).join(' — ');
  }
  function identity(date, title) {
    return `${date}|${title.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()}`;
  }
  function toRow(task, restaurant, id) {
    const valid = normalize(task);
    return {id, restaurant_id:restaurant, title:titleFor(valid), date_key:valid.date,
      day:days[new Date(valid.date + 'T12:00:00Z').getUTCDay()], category:valid.category, completed:false};
  }
  function uniqueTasks(tasks) {
    if (!Array.isArray(tasks) || !tasks.length || tasks.length > 30) throw Error('Review between 1 and 30 tasks at a time.');
    const seen = new Set();
    const expanded=[];
    for(const raw of tasks){
      const task=normalize(raw),repeat=task.repeat;
      if(!repeat||repeat.frequency==='none'){expanded.push(task);continue;}
      let date=task.date;
      while(date<=repeat.endDate){
        expanded.push({...task,date,repeat:{frequency:'none',endDate:null}});
        if(expanded.length>30)throw Error('A batch can contain at most 30 occurrences. Shorten the repeat period.');
        const next=new Date(date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+(repeat.frequency==='weekly'?7:1));date=next.toISOString().slice(0,10);
      }
    }
    if(expanded.length>30)throw Error('A batch can contain at most 30 occurrences.');
    return expanded.filter(task => {
      const key = identity(task.date, titleFor(task));
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  // Narrow grammar for explicit group notes; mixed/free-form text is left to AI.
  function parseGroupNotes(text) {
    const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    if(!lines.length || lines.length>30) return null;
    const pattern=/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\s+(?:-\s*)?(?:(group|grpo|grp)\s+(?:sales?|booking)\s+)?(\d+)\s*(?:px|pax|people)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s+(?:[-\u2013\u2014]\s*)?(.+)$/i;
    const matches=lines.map(line=>line.match(pattern));
    if(matches.some(match=>!match) || lines.some(line=>(line.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) || []).length!==1)) return null;
    const result=matches.map(match=>{
      const [,day,month,rawYear,group,count,hour,minute,menu]=match;
      const year=rawYear.length===2 ? '20'+rawYear : rawYear;
      const date=year+'-'+month.padStart(2,'0')+'-'+day.padStart(2,'0');
      if(!isDate(date)) throw Error('Invalid group date. Use a real date in DD/MM/YY or DD/MM/YYYY format.');
      return normalize({title:group ? 'Group sales' : 'Booking',date,time:hour.padStart(2,'0')+':'+(minute || '00'),
        people:Number(count),description:'Menu: '+menu.trim(),category:'Front of House'});
    });
    return {tasks:result,warnings:[]};
  }
  return {categories, isDate, londonToday, normalize, titleFor, identity, toRow, uniqueTasks, parseGroupNotes};
});
