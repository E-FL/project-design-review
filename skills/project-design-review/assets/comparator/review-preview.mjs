import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Ignore empty marks and approval bookkeeping; compare actual design requests.
export function designFeedback(data={}) {
  const parts=Object.fromEntries(Object.entries(data.parts||{}).filter(([,v])=>v.notes?.trim()||v.preference&&v.preference!=='unreviewed').sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,{preference:v.preference||'unreviewed',notes:(v.notes||'').trim()}]));
  return {preference:data.preference||'unreviewed',notes:(data.notes||'').trim(),parts,pins:(data.pins||[]).filter(p=>p.text?.trim()).map(p=>({side:p.side,image:p.image,x:p.x,y:p.y,text:p.text.trim(),...(p.target?{target:p.target}:{}),...(p.source?{source:p.source}:{})}))};
}
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,20);
const localFile=name=>typeof name==='string'&&/^[a-z0-9][a-z0-9_.-]{0,150}$/i.test(name);
export async function buildReviewPreview(root,key,version) {
  let config={};
  try{config=JSON.parse(await fs.readFile(path.join(root,'preview-config.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  let records={};
  try{records=JSON.parse(await fs.readFile(path.join(root,'feedback','notes.json'),'utf8')).records;}catch(e){if(e.code!=='ENOENT')throw e;}
  const record=records[key];
  if((record?.version||0)!==version)return {code:409,body:{error:'The saved feedback changed. Reload this page before building a preview.'}};
  const spec=config[key],feedback=designFeedback(record?.data);
  const covered=!!spec&&JSON.stringify(feedback)===JSON.stringify(designFeedback(spec.baseline));
  if(!covered){
    const request={key,feedbackVersion:version,requestedAt:new Date().toISOString(),status:'needs-design-pass',feedback:record?.data||null,reason:spec?'New feedback is not yet applied to the visual source.':'This page has no prepared visual source.'};
    const dir=path.join(root,'preview-requests');await fs.mkdir(dir,{recursive:true});
    const file=key+'-'+hash(JSON.stringify(feedback))+'.json';
    await fs.writeFile(path.join(dir,file),JSON.stringify(request,null,2));
    return {code:200,body:{state:'needs-design-pass',message:spec?'Your latest requests are saved, but they have not been applied visually yet. The previous draft is not a preview of these new changes. A design pass is needed before you can inspect them.':'No interactive visual source has been prepared for this review revision. Your preview request is saved for its design pass.',request:'/preview-requests/'+file}};
  }
  if(!localFile(spec.entry)||!Array.isArray(spec.files)||!spec.files.every(localFile)||!spec.files.includes(spec.entry))throw new Error('Invalid preview source');
  const files=await Promise.all(spec.files.map(async name=>({name,body:await fs.readFile(path.join(root,name))})));
  const digest=createHash('sha256');digest.update(key);digest.update(JSON.stringify(feedback));files.forEach(f=>{digest.update(f.name);digest.update(f.body);});
  const id=key+'-'+digest.digest('hex').slice(0,20),dir=path.join(root,'previews',id);
  await fs.mkdir(dir,{recursive:true});
  const existing=await fs.readFile(path.join(dir,'manifest.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(!existing){
    for(const file of files)await fs.writeFile(path.join(dir,file.name),file.body);
    // Prevent links in a prototype from navigating to product or review pages.
    const entry=path.join(dir,spec.entry);let html=await fs.readFile(entry,'utf8');
    html=html.replace('</body>','<script src="preview-navigation.js"></script></body>');
    await fs.writeFile(entry,html);
    await fs.writeFile(path.join(dir,'preview-navigation.js'),"document.addEventListener('click',e=>{const a=e.target.closest('a');if(a)e.preventDefault();});");
    await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({key,id,title:spec.title,createdAt:new Date().toISOString(),feedbackVersion:version,feedback:record?.data||null,sourceFiles:spec.files},null,2));
  }
  return {code:200,body:{state:'ready',id,title:spec.title,url:'/previews/'+id+'/'+spec.entry,views:spec.views,manifest:'/previews/'+id+'/manifest.json',message:'Interactive visual preview built from the prepared changes. This snapshot is preserved; no live job or account action is connected.'}};
}
