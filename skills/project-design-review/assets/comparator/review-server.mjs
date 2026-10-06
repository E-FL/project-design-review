import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildReviewPreview} from './review-preview.mjs';
import {readIssues,updateIssue} from './review-issues.mjs';
import {randomBytes,timingSafeEqual} from 'node:crypto';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8'};
const preferences=new Set(['unreviewed','current','proposed','mixed','rework']);
function validData(d){
  const text=(s,max)=>typeof s==='string'&&s.length<=max;
  const source=s=>s&&typeof s==='object'&&!Array.isArray(s)&&text(s.sourceId,200)&&text(s.label,200)&&['current','revision','external'].includes(s.kind)&&text(s.image,250)&&text(s.view,80)&&(s.revision===undefined||/^r[1-9][0-9]*$/.test(s.revision))&&(s.provider===undefined||text(s.provider,100))&&(s.hash===undefined||/^[a-f0-9]{64}$/.test(s.hash));
  return d&&(d.reviewStatus===undefined||['unreviewed','pending','approved','rejected'].includes(d.reviewStatus))&&(d.approvalBasis===undefined||['as-is','requirements-concluded'].includes(d.approvalBasis))&&(d.approvedAt===undefined||text(d.approvedAt,40))&&(d.rejectedAt===undefined||text(d.rejectedAt,40))&&preferences.has(d.preference)&&text(d.notes,20000)&&d.parts&&typeof d.parts==='object'&&!Array.isArray(d.parts)&&Object.entries(d.parts).length<=100&&Object.entries(d.parts).every(([k,v])=>text(k,200)&&v&&(!v.preference||preferences.has(v.preference))&&(v.notes===undefined||text(v.notes,4000)))&&Array.isArray(d.pins)&&d.pins.length<=100&&d.pins.every(p=>p&&/^p[a-z0-9]{1,40}$/i.test(p.id)&&['current','proposed'].includes(p.side)&&text(p.image,250)&&text(p.view,80)&&text(p.text,4000)&&(p.target===undefined||text(p.target,120))&&(p.source===undefined||source(p.source)&&p.source.image===p.image)&&((p.x===null&&p.y===null)||(Number.isFinite(p.x)&&p.x>=0&&p.x<=1&&Number.isFinite(p.y)&&p.y>=0&&p.y<=1)));
}
export function createReviewServer(root){
  root=path.resolve(root);let writes=Promise.resolve();
  const notesFile=path.join(root,'feedback','notes.json');
  const tokenFile=path.join(root,'.review-worker-token');
  const workerToken=async()=>{try{return (await fs.readFile(tokenFile,'utf8')).trim();}catch(e){if(e.code!=='ENOENT')throw e;const token=randomBytes(32).toString('hex');try{await fs.writeFile(tokenFile,token,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}return (await fs.readFile(tokenFile,'utf8')).trim();}};
  const load=async()=>{try{return JSON.parse(await fs.readFile(notesFile,'utf8'));}catch(e){if(e.code==='ENOENT')return {records:{}};throw e;}};
  const server=http.createServer(async(req,res)=>{
    const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
    try{
      const port=server.address().port;
      const hosts=[`127.0.0.1:${port}`,`localhost:${port}`];
      if(!hosts.includes(req.headers.host))return send(403,{error:'Local review host required'});
      const url=new URL(req.url,'http://'+req.headers.host);
      if(url.pathname==='/api/review-issues'||url.pathname==='/api/review-work'){
        const worker=url.pathname==='/api/review-work';
        if(worker){const token=await workerToken(),supplied=req.headers['x-review-worker-token']||'';if(typeof supplied!=='string'||supplied.length!==token.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(token)))return send(403,{error:'Review worker required'});}
        if(req.method==='GET'){await writes;return send(200,await readIssues(root));}
        if(req.method!=='POST')return send(405,{error:'Method not allowed'});
        if((!worker&&req.headers.origin!=='http://'+req.headers.host)||!req.headers['content-type']?.startsWith('application/json'))return send(403,{error:'Authorized JSON request required'});
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>40000)return send(413,{error:'Issue request too large'});chunks.push(chunk);}
        let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{error:'Invalid JSON'});}
        const operation=writes.then(()=>updateIssue(root,input,worker));writes=operation.then(()=>{},()=>{});const result=await operation;return send(result.code,result.body);
      }
      if(url.pathname==='/api/review-preview'){
        if(req.method!=='POST')return send(405,{error:'Method not allowed'});
        if(req.headers.origin!=='http://'+req.headers.host||!req.headers['content-type']?.startsWith('application/json'))return send(403,{error:'Same-origin JSON required'});
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096)return send(413,{error:'Preview request too large'});chunks.push(chunk);}
        let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{error:'Invalid JSON'});}
        if(!input||!/^[a-z0-9][a-z0-9_-]{0,89}$/i.test(input.key)||!Number.isInteger(input.expectedVersion)||input.expectedVersion<0)return send(400,{error:'Invalid preview request'});
        const operation=writes.then(()=>buildReviewPreview(root,input.key,input.expectedVersion));writes=operation.then(()=>{},()=>{});
        const result=await operation;return send(result.code,result.body);
      }
      if(url.pathname==='/api/review-notes'){
        if(req.method==='GET'){await writes;return send(200,await load());}
        if(req.method!=='POST')return send(405,{error:'Method not allowed'});
        if(req.headers.origin!=='http://'+req.headers.host||!req.headers['content-type']?.startsWith('application/json'))return send(403,{error:'Same-origin JSON required'});
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>131072)return send(413,{error:'Feedback too large'});chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');
        let input;try{input=JSON.parse(body);}catch{return send(400,{error:'Invalid JSON'});}
        if(!input||!/^[a-z0-9][a-z0-9_-]{0,89}$/i.test(input.key)||!Number.isInteger(input.expectedVersion)||input.expectedVersion<0||!validData(input.data))return send(400,{error:'Invalid feedback'});
        const operation=writes.then(async()=>{
          const saved=await load(),current=saved.records[input.key];
          if((current?.version||0)!==input.expectedVersion)return {code:409,body:{error:'A newer revision of these notes exists'}};
          if(!current&&Object.keys(saved.records).length>=500)return {code:413,body:{error:'Review record limit reached'}};
          const record={version:input.expectedVersion+1,savedAt:new Date().toISOString(),data:input.data};saved.records[input.key]=record;
          await fs.mkdir(path.dirname(notesFile),{recursive:true});
          await fs.writeFile(notesFile+'.tmp',JSON.stringify(saved,null,2));await fs.rename(notesFile+'.tmp',notesFile);
          return {code:200,body:{version:record.version,savedAt:record.savedAt}};
        });writes=operation.then(()=>{},()=>{});const result=await operation;return send(result.code,result.body);
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return send(405,{error:'Method not allowed'});
      const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
      const file=path.resolve(root,relative);
      if(!file.startsWith(root+path.sep)||!types[path.extname(file)])return send(404,{error:'Not found'});
      const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
    }catch(e){console.error('Local review request failed',JSON.stringify({name:e.name,code:e.code,syscall:e.syscall,frames:String(e.stack||'').split('\n').slice(1,5)}));send(e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'Not found':'Could not read or save this local review',...(e.code?{code:e.code}:{})});}
  });return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.REVIEW_PORT||5217);
  createReviewServer(path.dirname(fileURLToPath(import.meta.url))).listen(port,'127.0.0.1',()=>console.log(`Local design review: http://127.0.0.1:${port}/ · feedback saved under feedback/notes.json · no app API`));
}
