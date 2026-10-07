import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {validWorkProgress,recordWorkEvent} from './review-job-progress.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const imagePath=value=>typeof value==='string'&&/^[a-z0-9_./-]+\.(png|jpe?g|webp)$/i.test(value)&&!value.includes('..');
const stamp=()=>new Date().toISOString();
export const sameCaptureView=(a,b)=>['viewport','language','theme','variant'].every(k=>a[k]===b[k])&&(a.viewport==='desktop'||a.platform===b.platform);
const normalized=v=>({viewport:v.viewport||'mobile',platform:v.platform||'pwa',language:v.language||'en',theme:v.theme||'light',variant:v.variant||'Default'});
async function readStore(root){try{return JSON.parse(await fs.readFile(path.join(root,'feedback','captures.json'),'utf8'));}catch(error){if(error.code==='ENOENT')return {jobs:{},captures:{}};throw error;}}
async function catalog(root){
 const data=await fs.readFile(path.join(root,'review-data.js'),'utf8'),match=/^\s*window\.reviewConfig\s*=\s*([\s\S]*?)\s*;?\s*$/.exec(data);
 if(!match)throw new Error('Capture requests require a data-only review inventory.');
 const config=JSON.parse(match[1].replace(/;\s*$/,''));
 let registry={pages:{}};try{registry=JSON.parse(await fs.readFile(path.join(root,'review-revisions.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 return {config,registry};
}
function sourceFor({config,registry},pageId,sourceId){
 const page=config.pages.find(p=>p.id===pageId);if(!page)return null;
 const records=registry.pages?.[pageId]||[],sources=[{id:'current',kind:'current',label:'Current',views:(page.views||[]).filter(v=>v.kind!=='reference').map(v=>({...normalized(v),image:v.current,note:v.currentNote||v.note||page.provenance||''}))}];
 for(const record of records.length?records:[{revision:page.revision,views:page.views||[],hashes:{}}]){
  sources.push({id:'revision:'+record.revision,kind:'revision',label:'Revision '+record.revision,revision:record.revision,hashes:record.hashes||{},views:(record.views||[]).filter(v=>v.kind!=='reference').map(v=>({...normalized(v),image:v.proposed,note:v.note||''}))});
  for(const [index,v]of (record.views||[]).entries())if(v.kind==='reference')sources.push({id:'external:'+record.revision+':'+(v.id||index),kind:'external',label:v.label||'External design',provider:v.provider,revision:record.revision,hashes:record.hashes||{},views:[{...normalized(v),image:v.proposed}]});
 }
 for(const external of page.externalSources||[])sources.push({...external,id:'external:'+external.id,kind:'external',views:(external.views||[]).map(v=>({...normalized(v),image:v.image||v.proposed}))});
 const source=sources.find(s=>s.id===sourceId);if(!source)return null;
 return {page,source,fingerprint:hash(JSON.stringify(source)),revisions:records.map(r=>r.revision).concat(page.revision)};
}
async function existingFile(root,relative){
 if(!imagePath(relative))return false;
 try{const real=await fs.realpath(path.resolve(root,relative));return real.startsWith(path.resolve(root)+path.sep)&&(await fs.stat(real)).isFile();}catch(error){if(['ENOENT','ENOTDIR'].includes(error.code))return false;throw error;}
}
function validateSpec(cat,spec){
 if(!spec||typeof spec!=='object'||!text(spec.pageId,60)||!text(spec.sourceId,200)||!/^r[1-9][0-9]*$/.test(spec.reviewRevision))return null;
 const selected=sourceFor(cat,spec.pageId,spec.sourceId),axes=spec.axes;if(!selected||!selected.revisions.includes(spec.reviewRevision)||!axes||!['mobile','desktop'].includes(axes.viewport)||!['android','ios','pwa'].includes(axes.platform)||!['light','dark'].includes(axes.theme)||!text(axes.variant,80)||! /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(axes.language))return null;
 const product=cat.config.project.products.find(p=>p.id===selected.page.productId),products=cat.config.project.products;
 for(const [key,list]of [['viewport','viewports'],['platform','platforms'],['theme','themes'],['language','languages']]){
  const allowed=selected.page[list]||product?.[list]||[...new Set(products.flatMap(p=>p[list]||[]))];if(!allowed.includes(axes[key]))return null;
 }
 return {...selected,axes:normalized(axes)};
}
function targetKey(projectId,pageId,sourceId,fingerprint,axes){return hash(JSON.stringify([projectId,pageId,sourceId,fingerprint,axes.viewport,axes.viewport==='desktop'?'*':axes.platform,axes.language,axes.theme,axes.variant]));}
export async function readCaptureJobs(root){
 const store=await readStore(root),cat=await catalog(root),jobs={};
 for(const job of Object.values(store.jobs)){const selected=sourceFor(cat,job.pageId,job.source.id);jobs[job.id]={...job,sourceCurrent:selected?.fingerprint===job.source.fingerprint};}
 const captures=[];
 for(const capture of Object.values(store.captures)){const selected=sourceFor(cat,capture.pageId,capture.sourceId);if(selected?.fingerprint===capture.sourceFingerprint&&await existingFile(root,capture.image))captures.push(capture);}
 return {jobs,captures};
}
export async function updateCaptureJob(root,input,worker=false){
 const bad=error=>({code:400,body:{error}}),conflict=error=>({code:409,body:{error}});
 if(!input||!text(input.action,30))return bad('Invalid capture action.');
 const store=await readStore(root),cat=await catalog(root);let job;
 if(input.action==='request'){
  if(worker)return bad('Request captures from the review.');
  const selected=validateSpec(cat,input.spec);if(!selected)return bad('This page, source or view is outside the review inventory.');
  const {page,source,fingerprint,axes}=selected,projectId=cat.config.project.id,key=targetKey(projectId,page.id,source.id,fingerprint,axes);
  const supplemental=Object.values(store.captures).findLast(c=>c.targetKey===key&&c.sourceFingerprint===fingerprint);
  const declared=source.views.find(v=>sameCaptureView(v,axes));
  if(supplemental&&await existingFile(root,supplemental.image))return {code:200,body:{available:true,capture:supplemental}};
  if(declared&&await existingFile(root,declared.image))return {code:200,body:{available:true}};
  const previous=Object.values(store.jobs).findLast(j=>j.targetKey===key&&['queued','working','failed'].includes(j.status));
  if(previous)return {code:200,body:{job:previous}};
  if(Object.keys(store.jobs).length>=500)return bad('Capture request limit reached.');
  job={id:'c'+randomUUID().replaceAll('-','').slice(0,20),targetKey:key,projectId,pageId:page.id,productId:page.productId,pageTitle:page.title,reviewRevision:input.spec.reviewRevision,reviewLanguage:cat.config.reviewLanguage||'en',axes,
   source:{id:source.id,kind:source.kind,label:source.label||source.id,fingerprint,...(source.revision?{revision:source.revision}:{}),...(source.provider?{provider:source.provider}:{}),...(source.sourceUrl?{url:source.sourceUrl}:{})},
   ...(declared?.image?{originalImage:declared.image}:{}),...(source.hashes?.[declared?.image]||supplemental?.hash?{expectedHash:source.hashes?.[declared?.image]||supplemental.hash}:{}),
   status:'queued',version:1,requestedAt:stamp(),queuedAt:stamp(),updatedAt:stamp(),authorization:'produce-this-exact-capture',stage:'Waiting for a connected capture worker'};
  recordWorkEvent(job,job.status,job.stage);store.jobs[job.id]=job;
 }else{
  if(!text(input.id,30)||!Number.isInteger(input.expectedVersion))return bad('Supply a capture request id and expectedVersion.');
  job=store.jobs[input.id];if(!job)return {code:404,body:{error:'Capture request not found.'}};
  if(job.version!==input.expectedVersion)return conflict('Capture request changed; reload its latest version.');
  if(!worker){
   if(input.action==='retry'&&job.status==='failed'){const selected=sourceFor(cat,job.pageId,job.source.id);if(selected?.fingerprint!==job.source.fingerprint)return conflict('The source changed. Request a capture for its current evidence.');job.status='queued';job.queuedAt=stamp();job.stage='Waiting for a connected capture worker';delete job.owner;delete job.error;delete job.progress;delete job.startedAt;delete job.finishedAt;}
   else if(input.action==='cancel'&&['queued','working'].includes(job.status)){job.status='cancelled';job.stage='Cancelled';}
   else return {code:403,body:{error:'This action requires the capture worker.'}};
  }else{
   if(!text(input.workerId,160))return bad('A capture worker identity is required.');
   if(input.action==='claim'){
    if(job.status!=='queued')return conflict('This capture is no longer queued.');
    if(sourceFor(cat,job.pageId,job.source.id)?.fingerprint!==job.source.fingerprint)return conflict('The requested source changed; do not capture different evidence.');
    job.status='working';job.owner=input.workerId;job.stage='Preparing the requested capture';job.startedAt=stamp();delete job.progress;
   }else{
    if(job.status!=='working'||job.owner!==input.workerId)return conflict('This capture is not working under this worker.');
    if(input.action==='progress'){if(!text(input.text,300))return bad('Describe the actual capture stage.');if(input.progress!==undefined&&!validWorkProgress(input.progress))return bad('Supply measured completed/total work units and their unit label.');job.stage=input.text;if(input.progress!==undefined)job.progress={completed:input.progress.completed,total:input.progress.total,unit:input.progress.unit};}
    else if(input.action==='fail'){if(!text(input.text,2000))return bad('Describe the capture failure.');job.status='failed';job.error=input.text;job.stage='Capture needs attention';job.finishedAt=stamp();}
    else if(input.action==='complete'){
     if(sourceFor(cat,job.pageId,job.source.id)?.fingerprint!==job.source.fingerprint)return conflict('The source changed before capture publication.');
     if(!text(input.provenance,2000)||!['live','fixture','mock','imported','rendered'].includes(input.evidence))return bad('Record verified capture provenance and evidence type.');
     if(typeof input.image!=='string'||!new RegExp('^generated-captures/'+job.id+'/[a-z0-9_-]+\\.png$').test(input.image)||!await existingFile(root,input.image))return bad('Provide a new verified PNG under generated-captures/<request id>/.');
     if(Object.values(store.captures).some(c=>c.image===input.image))return conflict('This capture file is already preserved. Use a new file.');
     const data=await fs.readFile(path.resolve(root,input.image));
     if(data.length<33||!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||data.toString('ascii',12,16)!=='IHDR')return bad('The produced file is not a PNG capture.');
     const width=data.readUInt32BE(16),height=data.readUInt32BE(20),digest=hash(data);
     if(!width||!height||width>32768||height>32768)return bad('Invalid capture dimensions.');
     if(job.expectedHash&&job.expectedHash!==digest)return conflict('Restore the exact preserved capture bytes; a different image cannot replace them.');
     const declared=sourceFor(cat,job.pageId,job.source.id).source.views.find(v=>sameCaptureView(v,job.axes));
     if(declared&&await existingFile(root,declared.image))return conflict('This source view is already available. Preserve it.');
     const capture={requestId:job.id,targetKey:job.targetKey,pageId:job.pageId,sourceId:job.source.id,sourceFingerprint:job.source.fingerprint,axes:job.axes,image:input.image,hash:digest,width,height,provenance:input.provenance,evidence:input.evidence,producedAt:stamp()};
     store.captures[job.id]=capture;job.status='ready';job.stage='Capture available';job.finishedAt=stamp();job.capture=capture;
    }else return bad('Invalid capture worker action.');
   }
  }
  job.version++;job.updatedAt=stamp();recordWorkEvent(job,job.status,input.action==='fail'?job.error:job.stage,job.progress);
 }
 const file=path.join(root,'feedback','captures.json');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(store,null,2));await fs.rename(file+'.tmp',file);
 return {code:200,body:{job}};
}
