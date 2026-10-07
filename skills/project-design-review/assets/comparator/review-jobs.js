/* Project-wide job visibility. A saved request is not an active producer. */
window.reviewJobs=(()=>{
 const nodes=new Map(),openHistory=new Set(),pending=new Set(),activeStates=new Set(['queued','working','failed','discussing']);
 let panel,list,summary,connection,refreshStatus,filter,search,inFlight,issues={},captures={},lastChecked='',lastError='',actionError='';
 const word=(key,fallback)=>window.reviewConfig?.jobLabels?.[key]||fallback;
 const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
 const age=at=>{const seconds=Math.max(0,Math.floor((Date.now()-Date.parse(at))/1000));if(!Number.isFinite(seconds))return word('unknownTime','Unknown time');return seconds<60?seconds+'s':seconds<3600?Math.floor(seconds/60)+'m':Math.floor(seconds/3600)+'h';};
 const date=at=>{try{return new Date(at).toLocaleString(document.documentElement.lang||'en');}catch{return at||'';}};
 function jobs(){
  const captureJobs=Object.values(captures).map(j=>({...j,type:'capture',title:j.pageTitle||j.pageId,reviewRevision:j.reviewRevision,stage:j.error||j.stage,worker:j.owner,lastWorkerUpdate:j.updatedAt,requestAt:j.queuedAt||j.events?.findLast(e=>e.status==='queued')?.at||j.requestedAt}));
  const issueJobs=Object.values(issues).filter(i=>i.status!=='discussing'||i.needsReply).map(i=>({...i,type:'issue',pageId:i.key.replace(/-r[0-9]+$/,''),reviewRevision:i.key.match(/r[0-9]+$/)?.[0],title:i.title,stage:i.work?.summary||i.work?.stage,worker:i.work?.owner,progress:i.work?.progress,lastWorkerUpdate:i.work?.updatedAt||i.work?.startedAt,requestAt:i.approvedAt||i.createdAt,startedAt:i.work?.startedAt,finishedAt:i.work?.finishedAt,resultRevision:i.work?.revision}));
  return [...captureJobs,...issueJobs].sort((a,b)=>Date.parse(b.requestAt||b.updatedAt)-Date.parse(a.requestAt||a.updatedAt));
 }
 const statusLabel=j=>j.sourceCurrent===false?word('sourceChanged','Source changed'):({queued:word('queued','Waiting for worker'),working:word('working','Working'),failed:word('failed','Needs attention'),ready:word('ready','Ready'),cancelled:word('cancelled','Cancelled'),rejected:word('rejected','Rejected'),discussing:word('reply','Awaiting reply')})[j.status]||j.status;
 const measured=p=>p&&Number.isSafeInteger(p.completed)&&Number.isSafeInteger(p.total)&&p.total>0&&p.completed>=0&&p.completed<=p.total&&typeof p.unit==='string';
 function action(button,label,fn){button.textContent=label;button.onclick=fn;}
 async function captureAction(job,kind){
  if(pending.has(job.id))return;pending.add(job.id);actionError='';render();
  try{
   if(!await window.reviewFeedback.flush())throw new Error(word('saveFirst','Save your feedback before changing this job.'));
   const response=await fetch('/api/review-captures',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:kind,id:job.id,expectedVersion:job.version}),signal:AbortSignal.timeout(10000)}),result=await response.json();
   if(!response.ok)throw new Error(result.error);await refresh();
  }catch(error){actionError=error.message;refresh().catch(()=>{});}finally{pending.delete(job.id);render();}
 }
 function fillCard(card,job){
  const focused=card.contains(document.activeElement)?document.activeElement?.dataset.jobAction:null;
  const historyWasOpen=card.querySelector('details')?.open||openHistory.has(job.id);
  card.replaceChildren();card.dataset.state=job.status;card.tabIndex=-1;
  const heading=element('div','job-card-heading'),title=element('h3','',job.pageId+' · '+job.title),state=element('span','job-state',statusLabel(job));
  heading.append(title,state);card.append(heading);
  const kind=job.type==='capture'?word('capture','Capture'):job.part==='Review details'?word('details','Review details'):word('design','Design / discussion');
  const view=job.type==='capture'?[job.source.label||job.source.id,...Object.entries(job.axes).filter(([key])=>key!=='platform'||job.axes.viewport==='mobile').map(([,value])=>value)].join(' · '):job.reviewRevision+' · '+job.part;
  card.append(element('p','job-context',kind+' · '+view));
  let stage=job.stage||word('waiting','No worker has claimed this job. A connected producer is required.');
  if(job.status==='queued')stage=word('waiting','No worker has claimed this job. A connected producer is required.');
  if(job.status==='discussing')stage=word('awaitReply','Waiting for a connected agent to reply; prototype work has not been authorized here.');
  if(job.sourceCurrent===false)stage=word('changed','The frozen source changed. Open the page and request its current source; this job cannot publish different evidence.');
  const stageNode=element('p','job-stage',stage);if(job.status==='working'){const spinner=element('span','job-spinner');spinner.setAttribute('aria-hidden','true');stageNode.prepend(spinner);}card.append(stageNode);
  if(measured(job.progress)){
   const meter=element('progress','job-progress');meter.max=job.progress.total;meter.value=job.progress.completed;meter.setAttribute('aria-label',job.progress.unit);
   card.append(meter,element('p','job-progress-label',job.progress.completed+' / '+job.progress.total+' '+job.progress.unit+' · '+Math.floor(job.progress.completed/job.progress.total*100)+'%'));
  }else if(job.status==='working')card.append(element('p','job-progress-label',word('noPercent','Stage reported; total work is not measured.')));
  const timing=element('p','job-timing');
  timing.textContent=job.status==='working'?word('elapsed','Elapsed')+' '+age(job.startedAt)+' · '+word('lastUpdate','Last update')+' '+age(job.lastWorkerUpdate)+' '+word('ago','ago'):job.status==='queued'?word('waitingFor','Waiting')+' '+age(job.requestAt):word('updated','Updated')+' '+date(job.updatedAt);
  timing.title=date(job.updatedAt);card.append(timing);
  if(job.worker)card.append(element('p','job-owner',word('worker','Worker')+': '+job.worker));
  if(job.status==='working'&&Date.now()-Date.parse(job.lastWorkerUpdate)>90000)card.append(element('p','job-stale',word('stale','No worker update for over 90 seconds. Work may be stalled; this does not prove the worker is connected.')));
  const actions=element('div','job-actions'),open=element('button');open.type='button';open.dataset.jobAction='open';
  action(open,job.type==='issue'?word('openDiscussion','Open discussion'):job.status==='ready'?word('openResult','Open result'):word('openPage','Open page'),async()=>{
   const opened=await window.reviewWorkspace.openJob(job);
   if(opened&&job.type==='issue')window.reviewIssues.open(job.part,job.anchor,'',job.id);
  });actions.append(open);
  if(job.type==='capture'&&job.status==='failed'&&job.sourceCurrent!==false){const retry=element('button');retry.type='button';retry.dataset.jobAction='retry';action(retry,word('retry','Retry'),()=>captureAction(job,'retry'));actions.append(retry);}
  if(job.type==='capture'&&['queued','working'].includes(job.status)){const cancel=element('button');cancel.type='button';cancel.dataset.jobAction='cancel';action(cancel,word('cancel','Cancel'),()=>captureAction(job,'cancel'));actions.append(cancel);}
  for(const button of actions.querySelectorAll('button'))button.disabled=pending.has(job.id);card.append(actions);
  if(job.events?.length){
   const details=element('details','job-history'),label=element('summary','',word('history','Activity history')),events=element('ol');label.dataset.jobAction='history';
   for(const event of job.events){const item=element('li');item.append(element('time','',date(event.at)),element('span','',event.stage||event.status));events.append(item);}
   details.append(label,events);details.open=historyWasOpen;details.ontoggle=()=>{if(details.open)openHistory.add(job.id);else openHistory.delete(job.id);};card.append(details);
  }
  if(focused){const button=card.querySelector('[data-job-action="'+focused+'"]');(button||card).focus({preventScroll:true});}
 }
 function render(){
  if(!panel)return;const all=jobs(),waiting=all.filter(j=>j.status==='queued').length,running=all.filter(j=>j.status==='working').length,failed=all.filter(j=>j.status==='failed'||j.sourceCurrent===false).length,active=all.filter(j=>activeStates.has(j.status)).length;
  const counts=waiting+' '+word('waitingCount','waiting')+' · '+running+' '+word('workingCount','working')+' · '+failed+' '+word('attentionCount','need attention');
  if(summary.textContent!==counts)summary.textContent=counts;
  for(const badge of document.querySelectorAll('[data-job-count]'))badge.textContent=active?String(active):'0';
  document.querySelector('#show-jobs')?.setAttribute('data-running',String(running>0));
  connection.textContent=running?word('activity','Working status reflects the last worker report. Check each job’s latest update; a claim alone does not prove a live connection.'):waiting?word('unclaimed','Jobs are saved, but no job is currently claimed by a worker. Queuing alone does not start an AI producer.'):word('idle','No work is currently reported as running.');
  refreshStatus.textContent=actionError?word('actionFailed','The job action could not be saved')+': '+actionError:lastError?word('refreshFailed','Refresh failed; displaying the last saved status')+': '+lastError:word('checked','Last checked')+' '+(lastChecked?date(lastChecked):word('checking','checking…'));
  const query=search.value.toLowerCase(),shown=all.filter(j=>(filter.value==='all'||filter.value==='active'&&activeStates.has(j.status)||filter.value===j.status)&&[j.pageId,j.title,j.source?.label,j.worker,JSON.stringify(j.axes||{})].join(' ').toLowerCase().includes(query));
  const visibleIds=new Set(shown.map(j=>j.id));for(const [id,card]of nodes)if(!visibleIds.has(id)){if(card.contains(document.activeElement))filter.focus({preventScroll:true});card.remove();nodes.delete(id);}
  list.querySelector('.jobs-empty')?.remove();
  if(!shown.length)list.append(element('p','jobs-empty',word('empty','No jobs match this filter.')));
  for(const job of shown){let card=nodes.get(job.id);if(!card){card=element('article','job-card');card.dataset.jobId=job.id;card.setAttribute('aria-label',job.pageId+' · '+(job.type==='capture'?'Capture':'Design request'));nodes.set(job.id,card);}
   const signature=JSON.stringify(job)+pending.has(job.id);if(card.dataset.signature!==signature){card.dataset.signature=signature;fillCard(card,job);}else{const timing=card.querySelector('.job-timing');if(job.status==='working')timing.textContent=word('elapsed','Elapsed')+' '+age(job.startedAt)+' · '+word('lastUpdate','Last update')+' '+age(job.lastWorkerUpdate)+' '+word('ago','ago');else if(job.status==='queued')timing.textContent=word('waitingFor','Waiting')+' '+age(job.requestAt);}
   const isStale=job.status==='working'&&Date.now()-Date.parse(job.lastWorkerUpdate)>90000,stale=card.querySelector('.job-stale');
   if(isStale&&!stale)card.append(element('p','job-stale',word('stale','No worker update for over 90 seconds. Work may be stalled; this does not prove the worker is connected.')));else if(!isStale&&stale)stale.remove();
   if(card.parentElement!==list)list.append(card);
  }
 }
 async function refresh(){
  if(inFlight)return inFlight;
  inFlight=(async()=>{
   const results=await Promise.allSettled([window.reviewCaptures.load(),fetch('/api/review-issues',{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'Cannot read design jobs.');return data;})]);
   const errors=[];if(results[0].status==='fulfilled')captures=results[0].value.jobs||{};else errors.push(results[0].reason.message);
   if(results[1].status==='fulfilled'){issues=results[1].value.items||{};document.dispatchEvent(new CustomEvent('review-issues-change',{detail:{items:issues}}));}else errors.push(results[1].reason.message);
   if(!errors.length)lastChecked=new Date().toISOString();lastError=errors.join(' · ');render();
  })();try{return await inFlight;}finally{inFlight=null;}
 }
 function initialize(){
  panel=document.getElementById('review-jobs');if(!panel)return;
  const heading=element('h2','',word('heading','Project jobs')),intro=element('p','jobs-intro',word('intro','Follow captures, design requests and review details across every page.')),
   refreshButton=element('button','jobs-refresh',word('refresh','Refresh now'));refreshButton.type='button';refreshButton.onclick=()=>refresh();
  summary=element('p','jobs-summary');summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');
  connection=element('p','jobs-connection');refreshStatus=element('p','jobs-refresh-status');refreshStatus.setAttribute('role','status');
  const filterLabel=element('label','jobs-filter',word('filter','Show jobs'));filter=element('select');
  for(const [value,label]of [['active','Active'],['queued','Waiting'],['working','Working'],['failed','Needs attention'],['ready','Completed'],['all','All jobs']])filter.append(new Option(word(value+'Filter',label),value));filter.onchange=render;filterLabel.append(filter);
  const searchLabel=element('label','jobs-filter',word('search','Filter jobs'));search=element('input');search.type='search';search.placeholder=word('searchHint','Page, source, language or worker');search.oninput=render;searchLabel.append(search);
  list=element('div','jobs-list');panel.append(heading,intro,summary,connection,refreshButton,refreshStatus,filterLabel,searchLabel,list);
  document.addEventListener('review-captures-status',event=>{captures=event.detail.jobs||{};render();});
  document.addEventListener('review-issues-change',event=>{if(event.detail.items)issues=event.detail.items;else if(event.detail.item)issues[event.detail.item.id]=event.detail.item;render();});
  document.getElementById('show-jobs').onclick=()=>{window.reviewWorkspace.drawerTab('jobs');refresh();};
  refresh();setInterval(()=>{if(!document.hidden)refresh();},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 }
 return {initialize,refresh};
})();
