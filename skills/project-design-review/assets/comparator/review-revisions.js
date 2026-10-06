window.reviewRevisions=(()=>{
  let pages={},fingerprint='',onChange;
  const safeFile=value=>typeof value==='string'&&/^[a-z0-9_./-]+\.(?:html|png|jpe?g|webp)$/i.test(value)&&!value.includes('..');
  async function load(){
    const response=await fetch('/review-revisions.json',{cache:'no-store'});
    if(response.status===404)return false;
    if(!response.ok)throw new Error('Revision history is unavailable.');
    const data=await response.json();
    if(data.schemaVersion!==1||!data.pages||Array.isArray(data.pages))throw new Error('Invalid revision history.');
    const next={};
    for(const [id,entries] of Object.entries(data.pages)){
      if(!/^[a-z0-9_-]{1,60}$/i.test(id)||!Array.isArray(entries))throw new Error('Invalid revision page.');
      // The registry records completed visual artifacts. Reopening an issue must
      // never erase the completed revision or its independent review decision.
      next[id]=entries;
      const ids=new Set();
      for(const e of next[id]){
        if(!/^r[1-9][0-9]*$/.test(e.revision)||ids.has(e.revision)||!safeFile(e.contentFile)||!Array.isArray(e.parts)||!e.parts.every(p=>typeof p==='string')||!Array.isArray(e.views)||!e.views.length||!e.views.every(v=>safeFile(v.current)&&safeFile(v.proposed)))throw new Error('Invalid revision record.');
        ids.add(e.revision);
      }
      next[id].sort((a,b)=>Number(a.revision.slice(1))-Number(b.revision.slice(1)));
    }
    const key=JSON.stringify(next),changed=key!==fingerprint;pages=next;fingerprint=key;return changed;
  }
  const list=id=>pages[id]||[];
  const latest=id=>list(id).at(-1);
  const resolve=(id,revision)=>list(id).find(e=>e.revision===revision)||latest(id);
  async function content(entry){const r=await fetch('/'+entry.contentFile,{cache:'no-store'});if(!r.ok)throw new Error('This preserved revision could not be opened.');return r.text();}
  function mount(pageId,entry,navigate){
    if(!entry){
      const newest=latest(pageId);if(!newest)return;
      document.querySelector('#content .revision-history')?.remove();
      const bar=document.createElement('section');bar.className='revision-history';bar.setAttribute('aria-label','Revision history');
      const text=document.createElement('p');text.textContent=`Revision ${newest.revision.slice(1)} is ready. Your current notes are kept before opening it.`;
      const button=document.createElement('button');button.type='button';button.textContent='Current / latest';button.onclick=()=>navigate(null);
      bar.append(text,button);document.querySelector('#content').prepend(bar);return;
    }
    document.querySelector('#content .revision-history')?.remove();
    const entries=list(pageId),index=entries.findIndex(e=>e.revision===entry.revision),newest=entries.at(-1),isLatest=entry.revision===newest.revision,bar=document.createElement('section');
    bar.className='revision-history';bar.setAttribute('aria-label','Revision history');
    const description=document.createElement('div'),title=document.createElement('strong'),help=document.createElement('p');
    title.textContent=`${pageId} · Revision ${entry.revision.slice(1)} · ${isLatest?'Latest completed':'Earlier revision'}`;
    help.textContent=isLatest?'This page opens its latest completed design. Approval and notes apply only to this revision.':`Viewing a preserved design. Latest completed: revision ${newest.revision.slice(1)}. Notes and approval stay with each revision.`;
    description.append(title,help);
    const actions=document.createElement('nav');actions.setAttribute('aria-label','Browse page revisions');
    for(const [label,target,disabled] of [['First revision',entries[0],index===0],['← Back',entries[index-1],index===0],['Next →',entries[index+1],index===entries.length-1],['Current / latest',newest,isLatest]]){
      const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=disabled;
      button.onclick=()=>navigate(target===newest?null:target.revision);actions.append(button);
    }
    bar.append(description,actions);(document.querySelector('#content .lead')||document.querySelector('#content h1')||document.querySelector('#content h2')).after(bar);
  }
  function watch(callback){onChange=callback;setInterval(async()=>{if(document.visibilityState!=='visible')return;try{if(await load())onChange?.();}catch{/* Retain the last verified history when disconnected. */}},10000);}
  return {load,list,latest,resolve,content,mount,watch};
})();
