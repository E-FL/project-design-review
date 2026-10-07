import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),base=process.env.REVIEW_URL||'http://127.0.0.1:5217';
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(base))throw new Error('Loopback review URL required');
let token;try{token=(await fs.readFile(path.join(root,'.review-worker-token'),'utf8')).trim();}catch{await fetch(base+'/api/review-work');token=(await fs.readFile(path.join(root,'.review-worker-token'),'utf8')).trim();}
const request=async(body,route='/api/review-work')=>{const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'x-review-worker-token':token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;};
const [command,option,file]=process.argv.slice(2);
const pageFilter=(process.env.REVIEW_PAGES||(command==='inbox'&&option==='--pages'?file:'')||'').split(',').filter(Boolean);
if(!pageFilter.every(p=>/^[a-z0-9_-]{1,60}$/i.test(p)))throw new Error('Invalid page scope');
const inScope=item=>!pageFilter.length||pageFilter.includes(item.key.replace(/-r[0-9]+$/,''));
if(command==='inbox'){
  const {items}=await request();console.log(JSON.stringify(Object.values(items).filter(i=>inScope(i)&&i.status!=='rejected'&&(i.needsReply||['queued','working'].includes(i.status))).map(i=>({...i,messages:i.messages.slice(-8)})),null,2));
}else if(command==='update'&&option==='--file'&&file){const input=JSON.parse(await fs.readFile(path.resolve(file),'utf8'));if(pageFilter.length){const {items}=await request();if(!items[input.id]||!inScope(items[input.id]))throw new Error('This issue is outside this conversation page scope');}if(!input.workerId&&process.env.REVIEW_WORKER_ID)input.workerId=process.env.REVIEW_WORKER_ID;console.log(JSON.stringify(await request(input),null,2));}
else if(command==='captures'){const {jobs}=await request(null,'/api/review-capture-work');console.log(JSON.stringify(Object.values(jobs).filter(j=>(!pageFilter.length||pageFilter.includes(j.pageId))&&['queued','working'].includes(j.status)),null,2));}
else if(command==='capture-update'&&option==='--file'&&file){const input=JSON.parse(await fs.readFile(path.resolve(file),'utf8'));if(pageFilter.length){const {jobs}=await request(null,'/api/review-capture-work');if(!jobs[input.id]||!pageFilter.includes(jobs[input.id].pageId))throw new Error('This capture is outside this conversation page scope');}if(!input.workerId&&process.env.REVIEW_WORKER_ID)input.workerId=process.env.REVIEW_WORKER_ID;console.log(JSON.stringify(await request(input,'/api/review-capture-work'),null,2));}
else throw new Error('Use inbox, update --file, captures, or capture-update --file with a JSON action.');
