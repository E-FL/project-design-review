import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {publishRevision} from './review-revisions.mjs';

const states=new Set(['discussing','queued','working','ready','rejected','failed']);
const text=(v,max)=>typeof v==='string'&&v.length<=max;
const now=()=>new Date().toISOString();
export async function readIssues(root){try{return JSON.parse(await fs.readFile(path.join(root,'feedback','issues.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return {items:{}};throw e;}}
export async function updateIssue(root,input,worker=false){
  const store=await readIssues(root),items=Object.values(store.items);
  const invalid=message=>({code:400,body:{error:message}});
  if(!input||!text(input.action,30))return invalid('Invalid issue action');
  let item,approvedReviewData;
  if(input.action==='create'||input.action==='approved-page'){
    if(worker||!text(input.key,90)||!/^[a-z0-9][a-z0-9_-]{0,89}$/i.test(input.key)||!text(input.title,200)||!input.title.trim()||!text(input.context,20000)||!text(input.part,200)||!['visual','logic','page'].includes(input.kind)||!text(input.message,6000))return invalid('Invalid issue context');
    if(items.length>=500)return invalid('Issue limit reached');
    if(input.anchor!==undefined&&(!input.anchor||!['current','proposed'].includes(input.anchor.side)||!text(input.anchor.image,250)||!((input.anchor.x===null&&input.anchor.y===null)||(Number.isFinite(input.anchor.x)&&input.anchor.x>=0&&input.anchor.x<=1&&Number.isFinite(input.anchor.y)&&input.anchor.y>=0&&input.anchor.y<=1))))return invalid('Invalid screenshot anchor');
    if(input.action==='approved-page'){
      let notes={records:{}};try{notes=JSON.parse(await fs.readFile(path.join(root,'feedback','notes.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
      const record=notes.records[input.key];
      if(!record||record.data.reviewStatus!=='approved'||record.data.approvedAt!==input.approvedAt)return {code:409,body:{error:'This page has no matching saved approval'}};
      const existing=items.find(i=>i.pageApproval===input.approvedAt&&i.key===input.key);if(existing)return {code:200,body:{item:existing}};
      // Direct as-is approval has no requested implementation work.
      if(record.data.approvalBasis==='as-is')return {code:200,body:{item:null}};approvedReviewData=structuredClone(record.data);
    }
    item={id:'i'+randomUUID().replaceAll('-','').slice(0,18),key:input.key,title:input.title,part:input.part,kind:input.kind,context:input.context,anchor:input.anchor||null,version:1,status:'discussing',createdAt:now(),updatedAt:now(),needsReply:!!input.message.trim(),messages:[]};
    if(input.message.trim())item.messages.push({id:randomUUID(),role:'user',text:input.message.trim(),at:now()});
    if(input.action==='approved-page'){item.status='queued';item.needsReply=false;item.approvedAt=now();item.pageApproval=input.approvedAt;item.approvedScope={context:item.context,messages:structuredClone(item.messages),reviewData:approvedReviewData};}
    store.items[item.id]=item;
  }else{
    if(!text(input.id,30)||!Number.isInteger(input.expectedVersion))return invalid('Invalid issue version');
    item=store.items[input.id];if(!item)return {code:404,body:{error:'Issue not found'}};
    if(item.version!==input.expectedVersion)return {code:409,body:{error:'This issue changed. Refresh before trying again.'}};
    const transitionError=()=>({code:409,body:{error:'This item is no longer in the expected work state'}});
    if(!worker){
      if(input.action==='message'){
        if(!text(input.text,6000)||!input.text.trim()||item.messages.length>=150)return invalid('Write a message first');
        item.messages.push({id:randomUUID(),role:'user',text:input.text.trim(),at:now()});item.needsReply=true;
        if(['ready','rejected','failed'].includes(item.status))item.status='discussing';
      }else if(input.action==='approve'){
        if(['queued','working'].includes(item.status))return transitionError();
        item.status='queued';item.approvedAt=now();item.needsReply=false;item.approvedScope={context:item.context,messages:structuredClone(item.messages)};item.work={stage:'Waiting to start'};
      }else if(input.action==='reject'){
        item.status='rejected';item.needsReply=false;item.rejectedAt=now();item.work={...item.work,stage:'Rejected — discussion kept'};
      }else if(input.action==='reopen'){
        if(item.status!=='rejected')return transitionError();item.status='discussing';item.needsReply=true;
      }else return {code:403,body:{error:'This action requires the review worker'}};
    }else{
      if(item.work?.owner&&['progress','complete','fail'].includes(input.action)&&input.workerId!==item.work.owner)return {code:409,body:{error:'This work belongs to another conversation. Use its owning worker.'}};
      if(input.action==='claim'){
        if(item.status!=='queued')return transitionError();
        if(input.workerId!==undefined&&(!text(input.workerId,160)||!input.workerId.trim()))return invalid('Invalid worker identity');
        const page=item.key.replace(/-r[0-9]+$/,'');
        if(items.some(other=>other.id!==item.id&&other.status==='working'&&other.key.replace(/-r[0-9]+$/,'')===page))return {code:409,body:{error:'Another conversation is already working on this page. Keep this item queued.'}};
        item.status='working';item.work={stage:'Reviewing the approved request',startedAt:now(),...(input.workerId?{owner:input.workerId}:{})};
      }else if(input.action==='progress'){
        if(item.status!=='working')return transitionError();if(!text(input.text,300))return invalid('Invalid work stage');item.work.stage=input.text;
      }else if(input.action==='reply'){
        if(item.status==='rejected')return transitionError();if(!text(input.text,12000)||!input.text.trim()||item.messages.length>=150)return invalid('Invalid response');
        item.messages.push({id:randomUUID(),role:'assistant',text:input.text.trim(),at:now()});item.needsReply=false;
      }else if(input.action==='complete'||input.action==='fail'){
        if(item.status!=='working')return transitionError();if(!text(input.text,6000))return invalid('Invalid work result');
        if(input.action==='complete'){
          if(!text(input.previewUrl,250)||!/^\/(?!\/)[a-z0-9_./-]+\.html(?:\?[a-z0-9_=&%-]*)?$/i.test(input.previewUrl)||input.previewUrl.includes('..'))return invalid('A local visual result is required');
          const file=path.resolve(root,input.previewUrl.split('?')[0].slice(1));if(!file.startsWith(path.resolve(root)+path.sep))return invalid('Invalid result path');await fs.access(file);
          if(input.revision){const published=await publishRevision(root,input.revision,item);if(published.code!==200)return published;}
          item.status='ready';item.work={...item.work,stage:'Ready to preview',finishedAt:now(),summary:input.text,previewUrl:input.previewUrl,...(input.revision?{revision:input.revision.revision}:{})};
        }else{item.status='failed';item.work={...item.work,stage:'Needs attention',summary:input.text,finishedAt:now()};}
      }else return invalid('Invalid worker action');
    }
    item.version++;item.updatedAt=now();
  }
  if(!states.has(item.status))throw new Error('Invalid issue state');
  const file=path.join(root,'feedback','issues.json');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(store,null,2));await fs.rename(file+'.tmp',file);
  return {code:200,body:{item}};
}
