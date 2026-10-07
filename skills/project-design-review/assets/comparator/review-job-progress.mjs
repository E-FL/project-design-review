// Measured work units only. Elapsed time must never manufacture a percentage.
export function validWorkProgress(value){
 return value&&Number.isSafeInteger(value.completed)&&Number.isSafeInteger(value.total)&&value.total>0&&value.total<=1000000000&&value.completed>=0&&value.completed<=value.total&&typeof value.unit==='string'&&value.unit.trim().length>0&&value.unit.length<=80;
}
export function recordWorkEvent(item,status,stage,progress){
 const event={at:new Date().toISOString(),status,stage};
 if(item.owner||item.work?.owner)event.worker=item.owner||item.work.owner;
 if(validWorkProgress(progress))event.progress={completed:progress.completed,total:progress.total,unit:progress.unit};
 item.events=[...(item.events||[]),event].slice(-40);
}
