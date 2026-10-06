import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createReviewServer} from './review-server.mjs';
import {buildReviewPreview} from './review-preview.mjs';

test('source-bound flags persist, invalid anchors fail, and saved versions cannot overwrite each other',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'review-workspace-test-'));
 const server=createReviewServer(root);
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const post=body=>fetch(origin+'/api/review-notes',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const pin={id:'p123',side:'proposed',image:'r3.png',view:'mobile · android · en · dark',text:'Literal <script>note</script>',target:'Primary action',x:.4,y:.2,source:{sourceId:'revision:r3',label:'Revision r3',kind:'revision',revision:'r3',image:'r3.png',view:'mobile · android · en · dark',hash:'a'.repeat(64)}};
  const data={preference:'mixed',reviewStatus:'pending',notes:'General page note',parts:{},pins:[pin]},input={key:'P01-r3',expectedVersion:0,data};
  let response=await post(input);assert.equal(response.status,200);assert.equal((await response.json()).version,1);
  const saved=await (await fetch(origin+'/api/review-notes')).json();assert.deepEqual(saved.records['P01-r3'].data.pins[0],pin);
  assert.equal((await post({...input,data:{...data,notes:'Competing tab'}})).status,409);
  assert.equal((await post({...input,expectedVersion:1,data:{...data,pins:[{...pin,source:{...pin.source,image:'another.png'}}]}})).status,400);
  assert.equal((await post({...input,expectedVersion:1,data:{...data,pins:[{...pin,target:'x'.repeat(121)}]}})).status,400);
  const legacyPin={id:'p124',side:'current',image:'old.png',view:'Screen',text:'Legacy note',x:null,y:null};
  assert.equal((await post({key:'P01-r1',expectedVersion:0,data:{...data,pins:[legacyPin]}})).status,200);
  const final=await (await fetch(origin+'/api/review-notes')).json();assert.equal(final.records['P01-r3'].data.notes,'General page note');
  await fs.writeFile(path.join(root,'prepared.html'),'<html><body>Prepared fictional page</body></html>');
  await fs.writeFile(path.join(root,'preview-config.json'),JSON.stringify({'P01-r3':{entry:'prepared.html',files:['prepared.html'],baseline:data,title:'Fixture',views:[{label:'Desktop',width:1440,query:''}]}}));
  const ready=await buildReviewPreview(root,'P01-r3',1);assert.equal(ready.body.state,'ready');
  const snapshot=await fs.readFile(path.join(root,ready.body.url.slice(1)),'utf8');
  assert.equal((await post({...input,expectedVersion:1,data:{...data,pins:[{...pin,target:'Different element'}]}})).status,200);
  const uncovered=await buildReviewPreview(root,'P01-r3',2);assert.equal(uncovered.body.state,'needs-design-pass');
  assert.equal(await fs.readFile(path.join(root,ready.body.url.slice(1)),'utf8'),snapshot);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  const target=path.resolve(root);assert.ok(target.startsWith(path.resolve(os.tmpdir())+path.sep+'review-workspace-test-'));await fs.rm(target,{recursive:true,force:true});
 }
});
