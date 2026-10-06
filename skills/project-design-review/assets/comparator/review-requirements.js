window.reviewRequirements = (() => {
  const prepared = new Map();
  let sequence = 0, listener;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function detailsHTML(data = {}) {
    const items = Array.isArray(data.items) ? data.items : [], open = Array.isArray(data.open) ? data.open : [], elements = Array.isArray(data.elements) ? data.elements : [];
    return `${data.summary ? `<p class="full-review-summary">${esc(data.summary)}</p>` : ''}${elements.length ? `<h3>Element-by-element explanation</h3><div class="element-review-grid">${elements.map((item,index) => `<article class="element-review"><span class="element-review-number">${index+1}</span><h4>${esc(item.name || item.title)}</h4><dl>${[['Current',item.current],['Suggested',item.proposed],['Why change it',item.reason],['Keep',item.keep],['Accessibility',item.accessibility],['Platform parity',item.platform],['Status',item.status]].filter(([,text])=>text).map(([label,text])=>`<div><dt>${label}</dt><dd>${esc(text)}</dd></div>`).join('')}</dl></article>`).join('')}</div>` : ''}${items.length ? `<h3>Composed change requirements</h3><ol class="requirements-list">${items.map(item => `<li><h4>${esc(item.title)}</h4><p>${esc(item.detail)}</p></li>`).join('')}</ol>` : ''}${data.scope ? `<h3>Platform scope and implementation status</h3><p>${esc(data.scope)}</p>` : ''}${open.length ? `<h3>Still to settle</h3><ul>${open.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}`;
  }
  function render(page, requirements = page.requirements) {
    const key = 'requirements-' + ++sequence;
    prepared.clear(); prepared.set(key, requirements || {});
    const summary = requirements?.summary || page.proposal || page.summary || 'Review this page and record the changes you want.';
    return `<section class="decision requirements" id="review-decision" data-requirements-key="${key}" aria-labelledby="requirements-heading"><h2 id="requirements-heading">Decision for this review</h2><p class="requirements-status">${esc(page.id)} · ${esc(page.revision)} · ${requirements?.status === 'discussed' ? 'Your recorded scope' : 'Review scope'}</p><p class="requirements-summary">${esc(summary)}</p></section>`;
  }
  function mount(section, ctx) {
    listener?.abort(); listener = new AbortController();
    if (!section || section.querySelector('[data-review-details-toggle]')) return;
    const signal = listener.signal, model = prepared.get(section.dataset.requirementsKey);
    const heading = [...section.children].find(node => node.tagName === 'H3' && /composed change requirements/i.test(node.textContent));
    const preserved = document.createDocumentFragment();
    if (heading) { let node = heading; while (node) { const next = node.nextSibling; preserved.append(node); node = next; } }
    let saved = !!heading || model?.detailsGenerated === true || !!(model?.elements?.length || model?.items?.length || model?.scope || model?.open?.length);
    const content = document.createElement('div'); content.id = 'review-details-content'; content.hidden = true;
    const button = document.createElement('button'); button.type = 'button'; button.dataset.reviewDetailsToggle = ''; button.className = 'requirements-toggle';
    button.setAttribute('aria-controls', content.id); button.setAttribute('aria-expanded', 'false');
    button.textContent = saved ? 'Show saved review details' : 'Generate review details';
    const status = document.createElement('p'); status.className = 'requirements-note'; status.setAttribute('role', 'status'); status.hidden = true;
    const host = document.createElement('section'); host.className = 'full-review-details requirements'; host.hidden = true; host.setAttribute('aria-labelledby','full-review-heading');
    const title = document.createElement('h2'); title.id = 'full-review-heading'; title.textContent = 'Full element review';
    const context = document.createElement('p'); context.className = 'requirements-status'; context.textContent = ctx.title+' · '+ctx.revision+' · explanations belong to this review revision, independent of the displayed sources';
    host.append(title,context); document.getElementById('content').append(host); section.append(button,status,content);
    let rendered = false, requested = false, loadedVersion = null, loading = false;
    const live = () => !signal.aborted && host.isConnected;
    function expand(opening = content.hidden) {
      if (!rendered) { if (heading) content.append(preserved); else content.innerHTML = detailsHTML(model); rendered = true; }
      if (!opening && content.contains(document.activeElement)) button.focus();
      content.hidden = !opening; button.setAttribute('aria-expanded', String(opening)); button.textContent = opening ? 'Hide review details' : 'Show saved review details';
    }
    ctx.reviewDetailsChanged = () => {
      if (loadedVersion === null || (!ctx.dirty && ctx.version === loadedVersion)) return;
      if (content.contains(document.activeElement)) button.focus();
      saved = false; rendered = false; requested = false; loadedVersion = null;
      content.replaceChildren(); content.hidden = true; button.setAttribute('aria-expanded','false'); button.textContent = 'Generate review details';
      status.hidden = false; status.textContent = 'Feedback changed. Request details for the latest saved feedback.';
    };
    async function loadSaved() {
      const version = ctx.version;
      if (ctx.dirty) return false;
      const response = await fetch(`/review-details/${encodeURIComponent(ctx.key)}-v${version}.json`,{cache:'no-store',signal});
      if (!live() || ctx.dirty || ctx.version !== version) return false;
      if (response.status === 404) return false;
      if (!response.ok) throw new Error('Could not load review details. Try again.');
      const data = await response.json();
      if (!live() || ctx.dirty || ctx.version !== version) return false;
      if (data.key !== ctx.key || data.feedbackVersion !== version) throw new Error('These details belong to different feedback. Request an updated explanation.');
      content.innerHTML = detailsHTML(data); rendered = true; saved = true; loadedVersion = version; status.hidden = true; return true;
    }
    async function modeChanged() {
      if (!live()) return;
      const full = window.reviewWorkspace?.reviewMode === 'full';
      host.hidden = !full; (full ? host : section).append(button,status,content);
      if (!full) { if(saved)expand(false); return; }
      if(saved) { expand(true); return; }
      if(loading)return;loading=true;button.disabled=true;
      try { if(await loadSaved()) {if(window.reviewWorkspace.reviewMode==='full')expand(true);} else {status.hidden=false;status.textContent='Full explanations are not prepared for this saved feedback. Generate review details to request them.';} }
      catch(error) {if(live()){status.hidden=false;status.textContent=error.message;}}
      finally {loading=false;if(live())button.disabled=false;}
    }
    button.addEventListener('click',async()=>{
      ctx.reviewDetailsChanged(); if(saved)return expand();
      button.disabled=true;status.hidden=false;
      try {
        if(!await window.reviewFeedback.flush())throw new Error('Save your feedback before requesting its details.');
        if(!live())return;
        if(await loadSaved())expand(true);
        else {
          if(!live())return;
          if(!window.reviewIssues?.requestDetails)throw new Error('Details generation is not connected. Ask for review details in the chat.');
          await window.reviewIssues.requestDetails(ctx);requested=true;
          if(live())status.textContent='Request saved. Awaiting a design response; check here when the details are ready.';
        }
      }catch(error){if(live())status.textContent=error.message;}
      finally{if(live()){button.disabled=false;if(!saved)button.textContent=requested?'Check requested details':'Generate review details';}}
    });
    document.addEventListener('review-mode-change',modeChanged,{signal}); modeChanged();
  }
  return {render,mount};
})();
