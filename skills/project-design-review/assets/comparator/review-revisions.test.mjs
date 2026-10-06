import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {updateIssue} from './review-issues.mjs';
test('completion publishes preserved history; scope, rejection, missing captures and version conflicts cannot advance it',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'review-revisions-test-'));
  try{
    await fs.mkdir(path.join(root,'feedback'));
    const make=(id,status='working',key='P01-r1')=>({id,key,status,version:3,messages:[],work:{stage:'Checking visual evidence'}});
    let store={items:{i1:make('i1'),i2:make('i2'),i3:make('i3','rejected')}};
    await fs.writeFile(path.join(root,'feedback/issues.json'),JSON.stringify(store));
    const registry={schemaVersion:1,pages:{P01:[{revision:'r1',contentFile:'old.html',parts:[],referenced:false,views:[]}]}};
    await fs.writeFile(path.join(root,'review-revisions.json'),JSON.stringify(registry));
    for(const name of ['new.html','current.png','new.png'])await fs.writeFile(path.join(root,name),'fixture');
    const revision={pageId:'P01',revision:'r2',contentFile:'new.html',parts:['Job'],referenced:false,views:[{id:'dark',label:'Mobile',viewport:'mobile',platform:'android',language:'en',theme:'dark',current:'current.png',proposed:'new.png',note:'Synthetic test capture',wide:false}]};
    const action={action:'complete',id:'i1',expectedVersion:3,text:'Verified',previewUrl:'/new.html',revision};
    assert.equal((await updateIssue(root,{...action,expectedVersion:2},true)).code,409);
    assert.equal((await updateIssue(root,{...action,id:'i3'},true)).code,409);
    assert.equal((await updateIssue(root,{...action,revision:{...revision,pageId:'P02'}},true)).code,400);
    assert.equal((await updateIssue(root,{...action,revision:{...revision,contentFile:'missing.html'}},true)).code,400);
    assert.equal((await updateIssue(root,{...action,revision:{...revision,views:[{...revision.views[0],viewport:'tablet'}]}},true)).code,400);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root,'review-revisions.json'),'utf8')),registry);
    const done=await updateIssue(root,action,true);assert.equal(done.code,200);assert.equal(done.body.item.status,'ready');
    const published=JSON.parse(await fs.readFile(path.join(root,'review-revisions.json'),'utf8'));
    assert.deepEqual(published.pages.P01[0],registry.pages.P01[0]);assert.equal(published.pages.P01[1].issueId,'i1');assert.equal(published.pages.P01[1].hashes['new.png'].length,64);assert.equal(published.pages.P01[1].views[0].viewport,'mobile');assert.equal(published.pages.P01[1].views[0].platform,'android');
    assert.equal((await updateIssue(root,{...action,id:'i2'},true)).code,409);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root,'review-revisions.json'),'utf8')),published);
  }finally{const target=path.resolve(root);assert.ok(target.startsWith(path.resolve(os.tmpdir())+path.sep+'review-revisions-test-'));await fs.rm(target,{recursive:true,force:true});}
});
