window.reviewFeedback = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const choices = [['unreviewed','Not decided'],['current','Keep current'],['proposed','Prefer proposed'],['mixed','Mix both'],['rework','Needs another pass']];
  const storagePrefix = `design-review:${location.pathname}:`;
  let active;
  const pageStates=new Map();
  const pageData=new Map();
  function hasChanges(data){return !!(data?.changesRequestedAt||data?.notes?.trim()||data?.pins?.some(p=>p.text?.trim())||['mixed','rework'].includes(data?.preference)||Object.values(data?.parts||{}).some(p=>p.notes?.trim()||['mixed','rework'].includes(p.preference)));}
  function decisionLabel(state,data){if(state==='approved')return data?.approvalBasis==='as-is'?'Approved as-is':data?.approvalBasis==='requirements-concluded'?'Approved with changes':'Approved · basis not recorded';return state==='pending'&&hasChanges(data)?'Changes requested':state==='rejected'?'Rejected':'Awaiting review';}
  function inferState(data,referenced=false){return data?.reviewStatus||(referenced||data?.notes?.trim()||data?.pins?.length||['proposed','mixed','rework'].includes(data?.preference)||Object.values(data?.parts||{}).some(p=>p.notes?.trim()||['proposed','mixed','rework'].includes(p.preference))?'pending':'unreviewed');}
  function decorateNav(){document.querySelectorAll('[data-page]').forEach(button=>{
    const selected=active?.pageId===button.dataset.page&&button.getAttribute('aria-current')==='page';
    const key=selected?active.key:button.dataset.page+'-'+(button.dataset.revision||'inventory');
    const state=(selected&&active.reviewState)||pageStates.get(key)||(button.dataset.referenced==='true'?'pending':'unreviewed');
    let marker=button.querySelector('.review-page-marker');if(!marker){marker=document.createElement('span');marker.className='review-page-marker';button.append(marker);}
    const label=decisionLabel(state,(selected&&active.data)||pageData.get(key));marker.dataset.state=state;marker.textContent=(state==='pending'?'◷ ':state==='approved'?'✓ ':state==='rejected'?'× ':'○ ')+label;marker.setAttribute('aria-label',label);
  });}
  function publish(ctx){pageStates.set(ctx.key,ctx.reviewState);pageData.set(ctx.key,ctx.data);decorateNav();renderApproval(ctx);ctx.reviewDetailsChanged?.();}
  function renderApproval(ctx){
    if(active!==ctx||!ctx.approvalPanel)return;
    const state=ctx.reviewState;ctx.approvalPanel.querySelector('[data-review-state]').textContent=decisionLabel(state,ctx.data);ctx.approvalPanel.dataset.state=state;
    const scopeStatus=document.querySelector('#review-decision .requirements-status');if(scopeStatus)scopeStatus.textContent=ctx.pageId+' · '+ctx.revision+' · '+decisionLabel(state,ctx.data);
    const approve=ctx.approvalPanel.querySelector('[data-approve]');approve.disabled=['approved','rejected'].includes(state)||!!ctx.approving||!!ctx.rejecting||!!ctx.saving;approve.textContent=ctx.approving?'Saving approval…':hasChanges(ctx.data)?'Approve with changes':'Approve as-is';
    const preview=ctx.approvalPanel.querySelector('[data-preview]');preview.disabled=!window.reviewPreview||!!ctx.saving||!!ctx.previewing||!!ctx.approving||!!ctx.rejecting;preview.textContent=ctx.previewing?'Building preview…':'Preview changes';
    const request=ctx.approvalPanel.querySelector('[data-request-changes]');request.disabled=(state==='pending'&&hasChanges(ctx.data))||!!ctx.approving||!!ctx.rejecting||!!ctx.saving;request.textContent=['approved','rejected'].includes(state)?'Reopen for changes':'Request changes';
    const reject=ctx.approvalPanel.querySelector('[data-reject]');reject.disabled=state==='rejected'||!!ctx.approving||!!ctx.rejecting||!!ctx.saving;reject.textContent=ctx.rejecting?'Saving rejection…':'Reject changes';
    ctx.approvalPanel.querySelector('[data-state-help]').textContent=state==='rejected'?'Rejected. Notes and previews are kept.':state==='approved'?(ctx.data.approvalBasis==='as-is'?'You accepted this revision as-is.':ctx.data.approvalBasis==='requirements-concluded'?'You explicitly accepted the scope with your requested changes.':'The saved approval does not record whether it was as-is or with changes.'):state==='pending'&&hasChanges(ctx.data)?'Changes requested. The displayed proposal is not accepted as-is.':'Review the proposal, approve it as-is, or request changes.';
  }
  const readDraft = key => { try {return JSON.parse(localStorage.getItem(storagePrefix+key)||'null');} catch {return null;} };
  function cache(ctx) {try {localStorage.setItem(storagePrefix+ctx.key,JSON.stringify({data:ctx.data,version:ctx.version,dirty:ctx.dirty}));return true;}catch{return false;}}
  function status(ctx,text) {if(active===ctx) ctx.panel.querySelector('[role=status]').textContent=text;}
  function changed(ctx,requestChanges=true) {
    if(requestChanges){ctx.data.reviewStatus='pending';ctx.data.changesRequestedAt=new Date().toISOString();delete ctx.data.approvedAt;delete ctx.data.approvalBasis;delete ctx.data.rejectedAt;ctx.rejecting=false;ctx.approving=false;ctx.reviewState='pending';publish(ctx);}
    ctx.dirty=true;ctx.sequence++;const stored=cache(ctx);
    ctx.reviewDetailsChanged?.();
    status(ctx,stored?'Saved in this browser · saving to review folder…':'Saving to review folder…');
    clearTimeout(ctx.timer);ctx.timer=setTimeout(()=>save(ctx),650);
  }
  function save(ctx){
    if(ctx.savePromise)return ctx.savePromise;
    ctx.saveFailed=false;
    ctx.savePromise=performSave(ctx).finally(()=>{ctx.savePromise=null;if(ctx.dirty&&!ctx.saveFailed)save(ctx);});
    return ctx.savePromise;
  }
  async function performSave(ctx) {
    clearTimeout(ctx.timer);if(ctx.saving||!ctx.dirty)return;
    ctx.saving=true;renderApproval(ctx);const sequence=ctx.sequence;
    try {
      const response=await fetch('/api/review-notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:ctx.key,expectedVersion:ctx.version,data:ctx.data})});
      if(response.status===409) {if(active===ctx)ctx.panel.querySelector('[data-reload-saved]').hidden=false;throw new Error('This review changed in another tab. Export your draft, then load the newer saved notes before merging.');}
      if(!response.ok) {const failure=await response.json().catch(()=>null);throw new Error((failure?.error||'Could not save to the review folder.')+(failure?.code?' ('+failure.code+')':'')+' Your browser draft is retained; retry Save feedback or export a copy.');}
      const result=await response.json();ctx.version=result.version;ctx.dirty=ctx.sequence!==sequence;cache(ctx);
      if(!ctx.dirty){ctx.reviewState=ctx.data.reviewStatus||inferState(ctx.data);ctx.approving=false;ctx.rejecting=false;publish(ctx);if(ctx.queueApprovedPage){ctx.queueApprovedPage=false;await window.reviewIssues?.pageApproved(ctx);}if(ctx.rejectPageWork){ctx.rejectPageWork=false;try{await window.reviewIssues?.pageRejected(ctx);}catch{status(ctx,'Rejection saved. Work cancellation could not sync; retry after reconnecting.');}}}
      status(ctx,ctx.dirty?'Saving newer changes…':'Saved to review folder · '+new Date(result.savedAt).toLocaleTimeString());
    } catch(error) {ctx.saveFailed=true;status(ctx,error.message);ctx.saving=false;ctx.approving=false;ctx.rejecting=false;renderApproval(ctx);return;}
    ctx.saving=false;renderApproval(ctx);
  }
  function exportNotes(ctx) {
    const serialized=JSON.stringify({project:ctx.projectId,product:ctx.productId,page:ctx.pageId,title:ctx.title,revision:ctx.revision,...ctx.data},null,2);
    const dialog=document.createElement('dialog');dialog.className='feedback-export';
    dialog.innerHTML='<h2>Export feedback</h2><p>Copy this complete revision, or download it as JSON.</p><label for="export-content">Feedback JSON</label><textarea id="export-content" readonly rows="12" spellcheck="false"></textarea><div class="feedback-actions"><button type="button" data-copy>Copy feedback</button><button type="button" data-download>Download JSON</button><button type="button" data-close>Close</button></div><p role="status" aria-live="polite"></p>';
    dialog.querySelector('textarea').value=serialized;
    dialog.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(serialized);dialog.querySelector('[role=status]').textContent='Copied.';}catch{dialog.querySelector('textarea').select();dialog.querySelector('[role=status]').textContent='Text selected. Use your normal Copy command.';}};
    dialog.querySelector('[data-download]').onclick=()=>{const blob=new Blob([serialized],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=ctx.key+'-feedback.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
  }
  function renderPins(ctx) {
    if(active!==ctx)return;
    const list=ctx.panel.querySelector('.pin-list');list.replaceChildren();
    ctx.data.pins.forEach((pin,index)=>{
      const item=document.createElement('div');item.className='pin-note';
      item.innerHTML=`<header><label for="pin-${esc(pin.id)}">${index+1}. ${esc(pin.source?.label||(pin.side==='current'?'Current':'Proposed'))} · ${esc(pin.view||'screen')}${pin.x===null?' · source note':''}</label><button type="button" aria-label="Remove flag ${index+1}">Remove</button></header><label class="pin-target">Element / image label<input maxlength="120" value="${esc(pin.target||'Visual element / image')}" aria-label="Element label for flag ${index+1}"></label><textarea id="pin-${esc(pin.id)}" name="pin-${esc(pin.id)}" maxlength="4000" dir="auto">${esc(pin.text)}</textarea>`;
      item.querySelector('input').oninput=e=>{pin.target=e.target.value;changed(ctx);};
      item.querySelector('textarea').oninput=e=>{pin.text=e.target.value;document.querySelectorAll('.review-pin').forEach(m=>{if(m.dataset.pinId===pin.id)m.setAttribute('aria-label',`Edit note ${index+1}: ${pin.text||'No text yet'}`);});changed(ctx);};
      const discuss=document.createElement('button');discuss.type='button';discuss.textContent='Discuss flag';discuss.setAttribute('aria-label','Discuss screenshot note '+(index+1));discuss.onclick=()=>window.reviewIssues?.open('Screenshot note '+(index+1),{side:pin.side,image:pin.image,x:pin.x,y:pin.y,...(pin.source?{source:pin.source}:{}),...(pin.target?{target:pin.target}:{})},pin.text);item.querySelector('header').append(discuss);
      item.querySelector('button').onclick=()=>{ctx.data.pins=ctx.data.pins.filter(p=>p.id!==pin.id);changed(ctx);renderPins(ctx);};list.append(item);
    });
    document.querySelectorAll('.annotation-image').forEach(wrap=>{
      wrap.querySelectorAll('.review-pin').forEach(e=>e.remove());const img=wrap.querySelector('img');
      ctx.data.pins.forEach((pin,index)=>{
        if(pin.image!==img.getAttribute('src')||pin.x===null)return;
        const marker=document.createElement('button');marker.type='button';marker.className='review-pin';marker.dataset.pinId=pin.id;marker.textContent=index+1;marker.style.left=(pin.x*100)+'%';marker.style.top=(pin.y*100)+'%';marker.setAttribute('aria-label',`Edit note ${index+1}: ${pin.text||'No text yet'}`);
        marker.onclick=e=>{e.stopPropagation();window.reviewWorkspace?.hideRichTip();window.reviewWorkspace?.drawerTab('tools');const field=ctx.panel.querySelector('#pin-'+pin.id);field.focus();field.scrollIntoView({block:'nearest'});};wrap.append(marker);window.reviewWorkspace?.bindRichTip(marker,()=>({pin,number:index+1,page:ctx.pageId+' · '+ctx.revision}));
      });
    });
  }
  function addPin(ctx,side,image,x=null,y=null) {
    if(ctx.data.pins.length>=100){status(ctx,'This revision already has 100 notes. Please start a new revision.');return;}
    const id='p'+crypto.randomUUID().replaceAll('-','').slice(0,12);
    const source=window.reviewWorkspace?.captureContext(side);
    if(window.reviewWorkspace&&!source)return status(ctx,'Prepare this exact capture before placing a flag.');
    const view=source?.view||document.querySelector('.review-view-status')?.textContent||document.querySelector('[data-view][aria-pressed=true]')?.textContent||'Screen';
    ctx.data.pins.push({id,side,image,x,y,view: view.slice(0,80),text:'',target:'Visual element / image',...(source?{source}:{})});ctx.armed=false;changed(ctx);renderPins(ctx);updateArmed(ctx);window.reviewWorkspace?.drawerTab('tools');ctx.panel.querySelector('#pin-'+id).focus();
  }
  function keyboardFlag(ctx){
    const dialog=document.createElement('dialog');dialog.className='feedback-export';dialog.innerHTML='<h2>Place a flag with the keyboard</h2><form><label>Side<select name="side"><option value="current">Left</option><option value="proposed">Right</option></select></label><label>Horizontal position (%)<input name="x" type="number" min="0" max="100" value="50" required></label><label>Vertical position (%)<input name="y" type="number" min="0" max="100" value="50" required></label><div class="feedback-actions"><button type="submit">Place flag</button><button type="button" data-close>Cancel</button></div></form>';
    dialog.querySelectorAll('option').forEach(o=>o.disabled=ctx.availableSides?.[o.value]===false);const select=dialog.querySelector('select');select.value=ctx.availableSides?.current===false?'proposed':'current';const trigger=document.activeElement;
    dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const form=new FormData(e.currentTarget),side=form.get('side'),img=document.getElementById(side==='current'?'current-shot':'draft-shot');dialog.close();addPin(ctx,side,img.getAttribute('src'),Number(form.get('x'))/100,Number(form.get('y'))/100);};dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus();});document.body.append(dialog);dialog.showModal();select.focus();
  }
  function setAvailableSides(sides){const ctx=active;if(!ctx?.toolbar)return;ctx.availableSides=sides;ctx.toolbar.querySelectorAll('[data-side]').forEach(b=>{b.disabled=!sides[b.dataset.side];b.textContent='Note on '+(b.dataset.side==='current'?'left':'right')+(window.reviewWorkspace?.captureContext(b.dataset.side)?' · '+window.reviewWorkspace.captureContext(b.dataset.side).label:'');});ctx.toolbar.querySelectorAll('[data-annotate],[data-keyboard-flag]').forEach(b=>b.disabled=!sides.current&&!sides.proposed);if(!sides.current&&!sides.proposed){ctx.armed=false;updateArmed(ctx);}}
  function updateArmed(ctx) {
    if(active!==ctx)return;ctx.toolbar?.querySelector('[data-annotate]')?.setAttribute('aria-pressed',String(ctx.armed));
    document.querySelectorAll('.annotation-image').forEach(w=>w.classList.toggle('armed',ctx.armed));
  }
  async function mount(options) {
    if(active?.dirty)save(active);
    const ctx={...options,key:options.pageId+'-'+options.revision,version:0,sequence:0,dirty:false,saving:false,armed:false};active=ctx;
    ctx.panel=document.createElement('section');ctx.panel.className='review-feedback';ctx.panel.id='review-feedback';
    const insertion=document.querySelector('#draft-caveats');if(insertion)insertion.after(ctx.panel);else document.getElementById('content').append(ctx.panel);
    ctx.panel.innerHTML='<h2>Your feedback</h2><p role="status">Loading saved notes…</p>';
    let remote=null,online=true;
    try{const response=await fetch('/api/review-notes');if(!response.ok)throw new Error();const records=(await response.json()).records;remote=records[ctx.key];Object.entries(records).forEach(([key,record])=>{pageStates.set(key,inferState(record.data));pageData.set(key,record.data);});decorateNav();}catch{online=false;}
    if(active!==ctx)return;const draft=readDraft(ctx.key);
    ctx.data=draft?.dirty?draft.data:(remote?.data||draft?.data||{preference:'unreviewed',notes:'',parts:{},pins:[]});
    ctx.version=draft?.dirty?draft.version:(remote?.version||draft?.version||0);ctx.dirty=!!draft?.dirty;
    ctx.reviewState=draft?.dirty&&['approved','rejected'].includes(ctx.data.reviewStatus)?inferState(remote?.data,!!options.referenced):inferState(ctx.data,!!options.referenced);
    ctx.approving=!!(draft?.dirty&&ctx.data.reviewStatus==='approved');
    ctx.rejecting=!!(draft?.dirty&&ctx.data.reviewStatus==='rejected');
    const migratingPending=!ctx.data.reviewStatus&&ctx.reviewState==='pending';
    if(!ctx.data.reviewStatus)ctx.data.reviewStatus=ctx.reviewState;
    const decision=document.getElementById('review-decision');
    if(decision){ctx.approvalPanel=document.createElement('div');ctx.approvalPanel.className='page-approval';ctx.approvalPanel.innerHTML='<div class="page-approval-actions"><span data-review-state role="status" aria-live="polite"></span><button type="button" data-preview>Preview changes</button><button type="button" data-approve>Approve page</button><button type="button" data-request-changes>Request changes</button><button type="button" data-reject>Reject changes</button></div><p data-state-help></p>';
      (decision.querySelector('.requirements-status')||decision.querySelector('h2')).after(ctx.approvalPanel);
      ctx.approvalPanel.querySelector('[data-preview]').onclick=async()=>{ctx.previewing=true;renderApproval(ctx);try{if(ctx.dirty)await save(ctx);if(ctx.dirty||ctx.saving){status(ctx,'Save your latest feedback before building a preview.');return;}await window.reviewPreview.open(ctx);}finally{ctx.previewing=false;renderApproval(ctx);}};
      ctx.approvalPanel.querySelector('[data-approve]').onclick=()=>{ctx.queueApprovedPage=true;ctx.data.approvalBasis=hasChanges(ctx.data)?'requirements-concluded':'as-is';delete ctx.data.rejectedAt;ctx.data.reviewStatus='approved';ctx.data.approvedAt=new Date().toISOString();ctx.approving=true;renderApproval(ctx);changed(ctx,false);save(ctx);};
      ctx.approvalPanel.querySelector('[data-request-changes]').onclick=()=>{changed(ctx);save(ctx);};
      ctx.approvalPanel.querySelector('[data-reject]').onclick=()=>{ctx.rejectPageWork=true;ctx.data.reviewStatus='rejected';ctx.data.rejectedAt=new Date().toISOString();delete ctx.data.approvedAt;delete ctx.data.approvalBasis;ctx.rejecting=true;renderApproval(ctx);changed(ctx,false);save(ctx);};
    }
    publish(ctx);
    ctx.panel.innerHTML=`<h2>Your feedback</h2><div class="feedback-revision">${esc(ctx.pageId)} · ${esc(ctx.title)} · ${esc(ctx.revision)}. Notes stay with this revision.</div><form action="/api/review-notes" method="post"><fieldset><legend>Which direction do you prefer?</legend><div class="preference-options">${choices.map(([value,label])=>`<label><input type="radio" name="preference" value="${value}" ${ctx.data.preference===value?'checked':''}>${label}</label>`).join('')}</div></fieldset><label for="review-notes">What should we keep or change?</label><textarea id="review-notes" name="notes" dir="auto" maxlength="20000">${esc(ctx.data.notes)}</textarea><details><summary>Comment on individual page parts</summary>${options.parts.map((part,i)=>{const existing=ctx.data.parts[part]||{};return `<div class="section-feedback"><label for="part-pref-${i}">${esc(part)}</label><select id="part-pref-${i}" name="part-${i}" data-part-pref="${esc(part)}">${choices.map(([v,label])=>`<option value="${v}" ${(existing.preference||'unreviewed')===v?'selected':''}>${label}</option>`).join('')}</select><label for="part-note-${i}">Notes for ${esc(part)}</label><textarea id="part-note-${i}" name="part-note-${i}" data-part-note="${esc(part)}" dir="auto" maxlength="4000">${esc(existing.notes)}</textarea></div>`;}).join('')}</details><div class="pin-list" aria-label="Screenshot notes"></div><div class="feedback-actions"><button type="submit">Save feedback</button><button type="button" data-export>Export feedback</button></div><p class="save-status" role="status" aria-live="polite"></p><p class="muted">Saves automatically to this local review folder, with a browser draft as backup. Saving a preference records design feedback; it does not approve deployment or change the apps.</p></form>`;
    const reloadSaved=document.createElement('button');reloadSaved.type='button';reloadSaved.hidden=true;reloadSaved.dataset.reloadSaved='';reloadSaved.textContent='Load newer saved notes';
    reloadSaved.onclick=()=>{try{localStorage.setItem(storagePrefix+ctx.key+':conflict-backup',JSON.stringify(ctx.data));localStorage.removeItem(storagePrefix+ctx.key);}catch{exportNotes(ctx);}ctx.dirty=false;clearTimeout(ctx.timer);location.reload();};ctx.panel.querySelector('.feedback-actions').append(reloadSaved);
    ctx.panel.querySelector('form').onsubmit=e=>{e.preventDefault();if(!ctx.dirty)changed(ctx,false);save(ctx);};ctx.panel.querySelector('[data-export]').onclick=()=>exportNotes(ctx);
    ctx.panel.querySelectorAll('[name=preference]').forEach(input=>input.onchange=()=>{ctx.data.preference=input.value;changed(ctx,!['current','unreviewed'].includes(input.value));});ctx.panel.querySelector('#review-notes').oninput=e=>{ctx.data.notes=e.target.value;changed(ctx);};
    ctx.panel.querySelectorAll('[data-part-pref]').forEach(input=>input.onchange=()=>{const key=input.dataset.partPref;ctx.data.parts[key]={...(ctx.data.parts[key]||{}),preference:input.value};changed(ctx,!['current','unreviewed'].includes(input.value));});
    ctx.panel.querySelectorAll('[data-part-note]').forEach(input=>input.oninput=()=>{const key=input.dataset.partNote;ctx.data.parts[key]={...(ctx.data.parts[key]||{}),notes:input.value};changed(ctx);});
    const compare=document.getElementById('compare');if(compare){
      ctx.toolbar=document.createElement('div');ctx.toolbar.className='annotation-toolbar';ctx.toolbar.innerHTML='<button type="button" data-annotate aria-pressed="false">Flag an element / image</button><button type="button" data-keyboard-flag>Place flag with keyboard</button><button type="button" data-side="current">Note on left</button><button type="button" data-side="proposed">Note on right</button><p>Arm a flag, then click a point on either capture. Hover or focus flags for details. Use the page note for general feedback.</p>';compare.before(ctx.toolbar);
      ctx.toolbar.querySelector('[data-keyboard-flag]').onclick=()=>keyboardFlag(ctx);
      ctx.toolbar.querySelector('[data-annotate]').onclick=()=>{ctx.armed=!ctx.armed;updateArmed(ctx);};ctx.toolbar.querySelectorAll('[data-side]').forEach(button=>button.onclick=()=>{const img=document.getElementById(button.dataset.side==='current'?'current-shot':'draft-shot');addPin(ctx,button.dataset.side,img.getAttribute('src'));});
      compare.querySelectorAll('img').forEach(img=>{const wrap=document.createElement('div');wrap.className='annotation-image';img.before(wrap);wrap.append(img);
        img.onclick=e=>{if(!ctx.armed)return;const side=img.id==='current-shot'?'current':'proposed';if(ctx.availableSides?.[side]===false)return;const rect=img.getBoundingClientRect();addPin(ctx,side,img.getAttribute('src'),Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height)));};img.addEventListener('load',()=>renderPins(ctx));
      });
    }
    renderPins(ctx);window.reviewIssues?.attach(ctx);window.reviewRequirements?.mount(decision,ctx);status(ctx,online?(remote?'Loaded saved feedback.':'Ready for your notes.'):'Review server unavailable. Notes will be kept in this browser; export a copy.');if(migratingPending){changed(ctx,false);}if(ctx.dirty&&online)save(ctx);
  }
  async function flush(){
    const ctx=active;if(!ctx)return true;
    while(ctx.dirty||ctx.saving||ctx.savePromise){await save(ctx);if(ctx.saveFailed)return false;}
    return true;
  }
  return {mount,decorateNav,flush,setAvailableSides,async recordRequest(key){if(active?.key===key){changed(active);await save(active);}},refreshPins:()=>active&&renderPins(active),reset(){clearTimeout(active?.timer);active=null;},isBusy:()=>!!(active?.dirty||active?.saving||active?.savePromise)};
})();
