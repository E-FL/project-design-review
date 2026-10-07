import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {createReviewServer} from './review-server.mjs';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV6kAAAAASUVORK5CYII=','base64');
const axes={viewport:'mobile',platform:'pwa',language:'he',theme:'light',variant:'Default'};
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'review-capture-test-'));
 const config={project:{id:'fixture',title:'Fictional',products:[{id:'provider',title:'Provider',viewports:['mobile','desktop'],platforms:['pwa'],languages:['en','he'],themes:['light','dark']}]},reviewLanguage:'en',pages:[{id:'P01',productId:'provider',title:'Fictional page',revision:'r3',views:[{id:'en',...axes,language:'en',current:'current.png',proposed:'r3.png'}],externalSources:[]}]};
 const registry={schemaVersion:1,pages:{P01:[{revision:'r3',views:config.pages[0].views,hashes:{'r3.png':createHash('sha256').update(png).digest('hex')}}]}};
 await fs.writeFile(path.join(root,'review-data.js'),'window.reviewConfig='+JSON.stringify(config)+';');
 await fs.writeFile(path.join(root,'review-revisions.json'),JSON.stringify(registry));
 await fs.writeFile(path.join(root,'current.png'),png);await fs.writeFile(path.join(root,'r3.png'),png);
 await fs.mkdir(path.join(root,'feedback'));await fs.writeFile(path.join(root,'feedback','notes.json'),'{"preserve":"feedback"}');
 const server=createReviewServer(root);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const post=(body,worker=false,token='')=>fetch(origin+(worker?'/api/review-capture-work':'/api/review-captures'),{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{'x-review-worker-token':token}:{})},body:JSON.stringify(body)});
 await fetch(origin+'/api/review-capture-work');const token=(await fs.readFile(path.join(root,'.review-worker-token'),'utf8')).trim();
 const spec={pageId:'P01',reviewRevision:'r3',sourceId:'current',axes};
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));const target=path.resolve(root);assert.ok(target.startsWith(path.resolve(os.tmpdir())+path.sep+'review-capture-test-'));await fs.rm(target,{recursive:true,force:true});});
 const artifact=async(job,bytes=png)=>{const image='generated-captures/'+job.id+'/verified.png';await fs.mkdir(path.dirname(path.join(root,image)),{recursive:true});await fs.writeFile(path.join(root,image),bytes);return image;};
 return {root,config,registry,origin,post,spec,token,artifact,get:async()=> (await fetch(origin+'/api/review-captures')).json()};
}

test('one click queues an exact missing view; duplicate clicks share a job and existing captures do not queue',async t=>{
 const f=await fixture(t),responses=await Promise.all([f.post({action:'request',spec:f.spec}),f.post({action:'request',spec:f.spec})]);
 const [first,duplicate]=await Promise.all(responses.map(r=>r.json()));assert.equal(first.job.id,duplicate.job.id);
 assert.equal(first.job.status,'queued');assert.equal(first.job.version,1);assert.equal(first.job.axes.language,'he');assert.equal(first.job.source.id,'current');
 assert.equal(Object.keys((await f.get()).jobs).length,1);
 const available=await (await f.post({action:'request',spec:{...f.spec,axes:{...axes,language:'en'}}})).json();assert.equal(available.available,true);assert.equal(available.job,undefined);
 for(const spec of [{...f.spec,sourceId:'external:unknown'},{...f.spec,axes:{...axes,platform:'ios'}},{...f.spec,pageId:'UNKNOWN'}])assert.equal((await f.post({action:'request',spec})).status,400);
});

test('authenticated owned work publishes a verified supplemental capture without changing history, approval or notes',async t=>{
 const f=await fixture(t),before=await fs.readFile(path.join(f.root,'review-revisions.json'));
 let {job}=await (await f.post({action:'request',spec:f.spec})).json();
 assert.equal((await f.post({action:'claim',id:job.id,expectedVersion:1,workerId:'worker-a'},true)).status,403);
 assert.equal((await f.post({action:'claim',id:job.id,expectedVersion:1,workerId:'worker-a'})).status,403);
 ({job}=await (await f.post({action:'claim',id:job.id,expectedVersion:1,workerId:'worker-a'},true,f.token)).json());assert.equal(job.status,'working');
 assert.equal((await f.post({action:'progress',id:job.id,expectedVersion:2,workerId:'worker-b',text:'Wrong owner'},true,f.token)).status,409);
 ({job}=await (await f.post({action:'progress',id:job.id,expectedVersion:2,workerId:'worker-a',text:'Rendering the verified Hebrew fixture'},true,f.token)).json());
 const image=await f.artifact(job),complete={action:'complete',id:job.id,expectedVersion:3,workerId:'worker-a',image,provenance:'Verified synthetic Hebrew fixture; design-only evidence.',evidence:'fixture'};
 ({job}=await (await f.post(complete,true,f.token)).json());assert.equal(job.status,'ready');assert.equal(job.capture.axes.language,'he');assert.equal(job.capture.width,1);
 assert.equal((await f.post(complete,true,f.token)).status,409);
 const data=await f.get();assert.equal(data.captures.length,1);assert.equal(data.captures[0].sourceId,'current');
 assert.equal(await fs.readFile(path.join(f.root,'feedback','notes.json'),'utf8'),'{"preserve":"feedback"}');
 assert.deepEqual(await fs.readFile(path.join(f.root,'review-revisions.json')),before);assert.equal(f.config.pages[0].revision,'r3');
});

test('failures can retry; cancellation and changed source snapshots prevent late or mismatched completion',async t=>{
 const f=await fixture(t);let {job}=await (await f.post({action:'request',spec:f.spec})).json();
 ({job}=await (await f.post({action:'claim',id:job.id,expectedVersion:1,workerId:'worker-a'},true,f.token)).json());
 ({job}=await (await f.post({action:'fail',id:job.id,expectedVersion:2,workerId:'worker-a',text:'The requested route is unavailable.'},true,f.token)).json());assert.equal(job.status,'failed');
 ({job}=await (await f.post({action:'retry',id:job.id,expectedVersion:3})).json());assert.equal(job.status,'queued');
 ({job}=await (await f.post({action:'cancel',id:job.id,expectedVersion:4})).json());assert.equal(job.status,'cancelled');
 assert.equal((await f.post({action:'claim',id:job.id,expectedVersion:5,workerId:'worker-a'},true,f.token)).status,409);
 ({job}=await (await f.post({action:'request',spec:f.spec})).json());
 f.config.pages[0].views[0].currentNote='A new baseline source context';await fs.writeFile(path.join(f.root,'review-data.js'),'window.reviewConfig='+JSON.stringify(f.config)+';');
 assert.equal((await f.post({action:'claim',id:job.id,expectedVersion:1,workerId:'worker-a'},true,f.token)).status,409);
 assert.equal((await f.get()).jobs[job.id].sourceCurrent,false);
 const next=await (await f.post({action:'request',spec:f.spec})).json();assert.notEqual(next.job.id,job.id);
});

test('missing hashed revision assets require exact restoration and cannot be replaced with another image',async t=>{
 const f=await fixture(t);await fs.unlink(path.join(f.root,'r3.png'));
 let {job}=await (await f.post({action:'request',spec:{...f.spec,sourceId:'revision:r3',axes:{...axes,language:'en'}}})).json();assert.equal(job.expectedHash,createHash('sha256').update(png).digest('hex'));
 ({job}=await (await f.post({action:'claim',id:job.id,expectedVersion:1,workerId:'worker-a'},true,f.token)).json());
 const different=Buffer.from(png);different[different.length-1]^=1;const image=await f.artifact(job,different),completion={action:'complete',id:job.id,expectedVersion:2,workerId:'worker-a',image,provenance:'Restored exact source fixture.',evidence:'fixture'};
 assert.equal((await f.post(completion,true,f.token)).status,409);
 assert.equal((await f.post({...completion,image:'../wrong.png'},true,f.token)).status,400);
 await f.artifact(job,png);const result=await (await f.post(completion,true,f.token)).json();assert.equal(result.job.status,'ready');
 assert.equal(result.job.capture.hash,job.expectedHash);
});

test('measured capture progress and failure history survive reload and retry without stale attempt timing',async t=>{
 const f=await fixture(t);let {job}=await (await f.post({action:'request',spec:f.spec})).json();
 ({job}=await (await f.post({action:'claim',id:job.id,expectedVersion:1,workerId:'worker-a'},true,f.token)).json());
 const progress={completed:2,total:4,unit:'screens inspected'};
 ({job}=await (await f.post({action:'progress',id:job.id,expectedVersion:2,workerId:'worker-a',text:'Inspecting the rendered screens',progress},true,f.token)).json());
 assert.deepEqual(job.progress,progress);assert.equal(job.events.at(-1).stage,'Inspecting the rendered screens');assert.deepEqual((await f.get()).jobs[job.id].events.at(-1).progress,progress);
 assert.equal((await f.post({action:'progress',id:job.id,expectedVersion:3,workerId:'worker-a',text:'Invalid precision',progress:{...progress,completed:5}},true,f.token)).status,400);
 assert.equal((await f.get()).jobs[job.id].version,3);
 ({job}=await (await f.post({action:'fail',id:job.id,expectedVersion:3,workerId:'worker-a',text:'Localized route is not prepared.'},true,f.token)).json());
 ({job}=await (await f.post({action:'retry',id:job.id,expectedVersion:4})).json());
 assert.equal(job.status,'queued');assert.ok(job.queuedAt);assert.equal(job.progress,undefined);assert.equal(job.startedAt,undefined);assert.equal(job.finishedAt,undefined);assert.equal(job.events.find(e=>e.status==='failed').stage,'Localized route is not prepared.');
});

test('design work exposes owned measured progress, rejects invalid units and retains activity history',async t=>{
 const f=await fixture(t),request=async(body,worker=false)=>fetch(f.origin+(worker?'/api/review-work':'/api/review-issues'),{method:'POST',headers:{Origin:f.origin,'Content-Type':'application/json',...(worker?{'x-review-worker-token':f.token}:{})},body:JSON.stringify(body)});
 let {item}=await (await request({action:'create',key:'P01-r3',title:'Fictional studio',part:'Page',kind:'page',context:'Bounded fixture prototype',message:'Review the main action.'})).json();
 ({item}=await (await request({action:'approve',id:item.id,expectedVersion:1})).json());
 ({item}=await (await request({action:'claim',id:item.id,expectedVersion:2,workerId:'design-worker'},true)).json());
 const progress={completed:1,total:3,unit:'views verified'},input={action:'progress',id:item.id,expectedVersion:3,workerId:'design-worker',text:'Verifying the prepared views',progress};
 assert.equal((await request({...input,workerId:'another-worker'},true)).status,409);
 ({item}=await (await request(input,true)).json());assert.deepEqual(item.work.progress,progress);assert.ok(item.work.updatedAt);assert.deepEqual(item.events.at(-1).progress,progress);
 assert.equal((await request({...input,expectedVersion:4,progress:{completed:1,total:0,unit:'views'}},true)).status,400);
 assert.equal((await request({...input,expectedVersion:4,progress:{completed:.1,total:3,unit:'views'}},true)).status,400);
 ({item}=await (await request({action:'fail',id:item.id,expectedVersion:4,workerId:'design-worker',text:'The fixture preview dependency is missing.'},true)).json());assert.equal(item.status,'failed');assert.equal(item.events.at(-1).stage,'The fixture preview dependency is missing.');
});
