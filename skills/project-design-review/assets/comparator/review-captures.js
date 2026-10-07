/* Exact missing-view requests. A queue is not a claimed worker. */
window.reviewCaptures=(()=>{
 let jobs={},captures=[],inFlight=null,lastSignature='';
 const cards=new Set(),views=['viewport','platform','language','theme','variant'];
 const same=(a,b)=>views.every(k=>k==='platform'&&a.viewport==='desktop'||a[k]===b[k]);
 const labels=()=>({produce:'Produce this capture',retry:'Retry capture',saving:'Saving capture request…',queued:'Queued',working:'Producing capture…',ready:'Capture available',waiting:'Waiting for a connected worker. You can keep reviewing.',progress:'A worker is preparing this exact view. You can keep reviewing.',available:'Available',partial:'One side',missing:'Missing',...window.reviewConfig?.captureLabels});
 async function api(body){const response=await fetch('/api/review-captures',{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'}),signal:AbortSignal.timeout(10000)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not save or check the capture request.');return result;}
 function find(spec){return Object.values(jobs).findLast(j=>j.sourceCurrent!==false&&j.pageId===spec.pageId&&j.source.id===spec.sourceId&&same(j.axes,spec.axes));}
 function update(card){
  if(!card.node.isConnected){cards.delete(card);return;}
  const wording=labels(),job=find(card.spec);card.job=job;
  const active=job&&['queued','working'].includes(job.status);card.button.disabled=card.pending||!!active;
  card.button.textContent=card.pending?wording.saving:job?.status==='queued'?wording.queued:job?.status==='working'?wording.working:job?.status==='failed'?wording.retry:wording.produce;
  card.node.setAttribute('aria-busy',String(job?.status==='working'));
  const status=card.error|| (job?.status==='queued'?wording.waiting:job?.status==='working'?(job.stage||wording.progress):job?.status==='failed'?job.error:job?.status==='ready'?'The recorded capture is unavailable. Produce it again to restore it.':'');
  if(card.status.textContent!==status)card.status.textContent=status;
 }
 async function load(){
  if(inFlight)return inFlight;
  inFlight=(async()=>{const result=await api(),previous=new Set(captures.map(c=>c.requestId));jobs=result.jobs||{};captures=result.captures||[];for(const card of cards)update(card);document.dispatchEvent(new CustomEvent('review-captures-status',{detail:{jobs}}));const signature=JSON.stringify(captures);if(signature!==lastSignature){const ready=captures.filter(c=>!previous.has(c.requestId));lastSignature=signature;document.dispatchEvent(new CustomEvent('review-captures-change',{detail:{ready}}));}return result;})();
  try{return await inFlight;}finally{inFlight=null;}
 }
 function mount(node,spec){
  const key=JSON.stringify(spec);let card=[...cards].find(c=>c.node===node&&c.key===key);if(card){update(card);return;}
  for(const old of cards)if(old.node===node)cards.delete(old);
  node.replaceChildren();const button=document.createElement('button'),status=document.createElement('p');button.type='button';button.dataset.produceCapture='';status.className='capture-task-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');node.className='capture-task';node.append(button,status);
  card={node,spec,key,button,status,pending:false,error:''};cards.add(card);
  button.onclick=async()=>{
   if(card.pending)return;card.pending=true;card.error='';update(card);
   try{
    if(!await window.reviewFeedback.flush())throw new Error('Save your feedback before requesting this capture.');
    const job=find(spec),result=await api(job?.status==='failed'?{action:'retry',id:job.id,expectedVersion:job.version}:{action:'request',spec});
    if(result.job)jobs[result.job.id]=result.job;await load();
    if(result.available)document.dispatchEvent(new CustomEvent('review-captures-change'));
   }catch(error){card.error=error.message;}finally{card.pending=false;update(card);}
  };update(card);
 }
 setInterval(()=>{if(document.visibilityState==='visible'&&!window.reviewJobs)load().catch(()=>{});},5000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load().catch(()=>{});});
 return {mount,load,list:pageId=>captures.filter(c=>c.pageId===pageId),labels};
})();
