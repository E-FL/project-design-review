import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Called only within the protected, serialized completion action after scope/version checks.
export async function publishRevision(root,input,item){
  const bad=message=>({code:400,body:{error:message}});
  if(!input||input.pageId!==item.key.replace(/-r[0-9]+$/,'')||!/^r[1-9][0-9]*$/.test(input.revision)||!Array.isArray(input.parts)||input.parts.length>100||!input.parts.every(p=>typeof p==='string'&&p.length<=200)||!Array.isArray(input.views)||!input.views.length||input.views.length>64||typeof input.referenced!=='boolean')return bad('Invalid completed revision');
  const local=(name,extensions)=>typeof name==='string'&&name.length<=250&&/^[a-z0-9_./-]+$/i.test(name)&&!name.includes('..')&&extensions.includes(path.extname(name));
  if(!local(input.contentFile,['.html'])||!input.views.every(v=>v&&/^[a-z0-9_-]{1,40}$/i.test(v.id)&&typeof v.label==='string'&&v.label.length<=80&&typeof v.note==='string'&&v.note.length<=2000&&local(v.current,['.png','.jpg','.jpeg','.webp'])&&local(v.proposed,['.png','.jpg','.jpeg','.webp'])&&typeof v.wide==='boolean'))return bad('Invalid revision files or views');
  if(new Set(input.views.map(v=>v.id)).size!==input.views.length)return bad('Duplicate revision view');
  if(!input.views.every(v=>(v.viewport===undefined||['mobile','desktop'].includes(v.viewport))&&(v.platform===undefined||typeof v.platform==='string'&&/^[a-z][a-z0-9-]{1,29}$/.test(v.platform))&&(v.language===undefined||/^[a-z]{2,3}$/.test(v.language))&&(v.theme===undefined||['light','dark'].includes(v.theme))&&(v.kind===undefined||['capture','reference'].includes(v.kind))&&(v.provider===undefined||typeof v.provider==='string'&&v.provider.length<=100)&&(v.variant===undefined||typeof v.variant==='string'&&v.variant.length<=100)))return bad('Invalid capture metadata');
  const hashes={};
  const base=await fs.realpath(root);
  for(const name of new Set([input.contentFile,...input.views.flatMap(v=>[v.current,v.proposed])])){
    let file;try{file=await fs.realpath(path.resolve(root,name));}catch{return bad('Capture or revision content is missing');}
    if(!file.startsWith(base+path.sep))return bad('Revision assets must be inside the review folder');
    hashes[name]=createHash('sha256').update(await fs.readFile(file)).digest('hex');
  }
  const entry={revision:input.revision,contentFile:input.contentFile,parts:input.parts,referenced:input.referenced,views:input.views.map(v=>({id:v.id,label:v.label,current:v.current,proposed:v.proposed,note:v.note,wide:v.wide,...Object.fromEntries(['viewport','platform','language','theme','variant','kind','provider'].filter(k=>v[k]!==undefined).map(k=>[k,v[k]]))})),issueId:item.id,hashes};
  const file=path.join(root,'review-revisions.json');let registry;
  try{registry=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;registry={schemaVersion:1,pages:{}};}
  const entries=registry.pages[input.pageId]||[],existing=entries.find(e=>e.revision===entry.revision);
  if(existing){if(JSON.stringify(existing)===JSON.stringify(entry))return {code:200};return {code:409,body:{error:'A preserved revision cannot be overwritten. Create a new revision.'}};}
  if(entries.some(e=>Number(e.revision.slice(1))>=Number(entry.revision.slice(1))))return {code:409,body:{error:'Publish a revision newer than the existing history'}};
  registry.pages[input.pageId]=[...entries,entry];
  await fs.writeFile(file+'.tmp',JSON.stringify(registry,null,2));await fs.rename(file+'.tmp',file);
  return {code:200};
}
