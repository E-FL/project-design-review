window.reviewPreview={async open(ctx){
  const dialog=document.createElement('dialog');dialog.className='visual-preview';dialog.setAttribute('closedby','any');dialog.setAttribute('aria-labelledby','visual-preview-title');
  dialog.innerHTML='<div class="preview-top"><div><p class="preview-label"></p><h2 id="visual-preview-title">Preview changes</h2></div><button type="button" data-close autofocus>Close preview</button></div><p class="preview-message" role="status" aria-live="polite">Building your visual preview…</p><div class="preview-controls" hidden></div><div class="preview-layout" hidden><div class="preview-stage"><iframe title="Interactive page preview"></iframe></div><section class="preview-brief"><h3>Changes in this preview</h3><div class="preview-requirements"></div><p class="preview-scope">Visual prototype only. Try the controls, then return to the review to approve or request changes.</p><a data-manifest target="_blank" rel="noopener">Preserved preview record</a><button type="button" data-finish>Return to review</button></section></div>';
  dialog.querySelector('.preview-label').textContent=ctx.pageId+' · '+ctx.title+' · '+ctx.revision;
  const opener=ctx.approvalPanel.querySelector('[data-preview]');
  const close=()=>dialog.close();dialog.querySelector('[data-close]').onclick=close;dialog.querySelector('[data-finish]').onclick=close;
  dialog.addEventListener('close',()=>{dialog.remove();opener.focus();});
  if(!('closedBy' in HTMLDialogElement.prototype))dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
  document.body.append(dialog);dialog.showModal();
  try{
    const response=await fetch('/api/review-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:ctx.key,expectedVersion:ctx.version})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not build this preview. Please try again.');
    if(!dialog.open)return;
    dialog.querySelector('.preview-message').textContent=result.message;
    if(result.state!=='ready'){dialog.classList.add('preview-not-ready');return;}
    dialog.querySelector('.preview-layout').hidden=false;const controls=dialog.querySelector('.preview-controls');controls.hidden=false;
    const frame=dialog.querySelector('iframe'),stage=dialog.querySelector('.preview-stage');
    result.views.forEach((view,index)=>{
      const button=document.createElement('button');button.type='button';button.textContent=view.label;button.setAttribute('aria-pressed',String(index===0));
      button.onclick=()=>{controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));dialog.querySelector('.preview-layout').classList.toggle('desktop',view.width>=900);stage.dataset.width=String(view.width);frame.style.width=view.width+'px';frame.src=result.url+view.query;};controls.append(button);
    });controls.firstElementChild.click();
    const requirements=dialog.querySelector('.preview-requirements'),decision=document.getElementById('review-decision');
    if(decision){[...decision.children].filter(el=>!el.classList.contains('page-approval')&&el.tagName!=='H2'&&!el.classList.contains('requirements-status')).forEach(el=>requirements.append(el.cloneNode(true)));}
    dialog.querySelector('[data-manifest]').href=result.manifest;
    frame.onload=()=>{if(dialog.open)dialog.querySelector('.preview-message').textContent=result.message;};
  }catch(error){if(dialog.open){dialog.classList.add('preview-not-ready');dialog.querySelector('.preview-message').textContent=error.message;}}
}};
