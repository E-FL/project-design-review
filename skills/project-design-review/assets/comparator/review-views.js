window.reviewViews = (() => {
  const names={android:'Android',pwa:'PWA',ios:'iOS',web:'Web',wearos:'Wear OS',desktop:'Desktop',he:'Hebrew',en:'English',ar:'Arabic',light:'Light',dark:'Dark'};
  const unique=values=>[...new Set(values)];
  function normalize(view,index,config){
    const words=(view.id+' '+view.label+' '+view.proposed).toLowerCase();
    const reference=view.kind==='reference'||/stitch|reference/.test(words);
    const platform=view.platform||(/android/.test(words)?'android':/\bpwa\b/.test(words)?'pwa':/\bios\b/.test(words)?'ios':config.defaultPlatform||'pwa');
    const language=view.language||(/english|(?:^|[-_ ·])en(?:[-_ .·]|$)/.test(words)?'en':/arabic/.test(words)?'ar':/hebrew|(?:^|[-_ ·])he(?:[-_ .·]|$)/.test(words)?'he':config.defaultLanguage||'he');
    const theme=view.theme||(/dark/.test(words)?'dark':/light/.test(words)?'light':config.defaultTheme||'light');
    const variant=view.variant||(/desktop|wide/.test(words)?'Wide screen':/source.failure/.test(words)?'Source unavailable':/large/.test(words)?'Large text':/map/.test(words)?'Map':/scheduled/.test(words)&&!/unscheduled/.test(words)?'Scheduled':/unscheduled/.test(words)?'Unscheduled':/unknown/.test(words)?'Unknown timing':/drawer/.test(words)&&/calls?/i.test(config.title||'')?'Details drawer':'Default');
    return {...view,id:String(view.id??index),platform,language,theme,variant,kind:reference?'reference':'capture'};
  }
  function mount({views=[],config={},onSelect}){
    const compare=document.getElementById('compare');
    const captures=views.map((v,i)=>normalize(v,i,config)),matrix=captures.filter(v=>v.kind!=='reference'),references=captures.filter(v=>v.kind==='reference');
    document.querySelectorAll('[data-view]').forEach(button=>{button.hidden=true;button.closest('.segmented')?.classList.add('review-legacy-views');});
    document.querySelector('.review-view-controls')?.remove();
    const first=matrix[0]||{platform:config.defaultPlatform||config.platforms?.[0]||'pwa',language:config.defaultLanguage||'he',theme:config.defaultTheme||'light',variant:'Default'},selection={platform:first.platform,language:first.language,theme:first.theme,variant:first.variant},section=document.createElement('section');
    section.className='review-view-controls';section.setAttribute('aria-label','Capture options');
    const basic=document.createElement('div');basic.className='review-view-basic';section.append(basic);
    const axes={platform:unique([...(config.platforms||(matrix.length?matrix.map(v=>v.platform):[first.platform])),...(config.deferredPlatforms||[])]),language:unique(config.languages||['he','en',...matrix.map(v=>v.language)]),theme:unique(config.themes||['light','dark'])};
    for(const [axis,values] of Object.entries(axes)){
      if(axis==='theme'&&config.showTheme===false)continue;
      const group=document.createElement('fieldset'),legend=document.createElement('legend'),buttons=document.createElement('div');legend.textContent=axis[0].toUpperCase()+axis.slice(1);buttons.className='review-view-segments';group.append(legend,buttons);
      for(const value of values){const button=document.createElement('button');button.type='button';button.dataset.axis=axis;button.dataset.value=value;button.textContent=(names[value]||value)+(axis==='platform'&&config.deferredPlatforms?.includes(value)?' · paused':'');button.onclick=()=>{selection[axis]=value;extra.value='';update();};buttons.append(button);}
      basic.append(group);
    }
    const secondary=document.createElement('div');secondary.className='review-view-secondary';
    const scenario=document.createElement('select');scenario.id='review-scenario';
    const variants=unique(matrix.map(v=>v.variant));for(const value of variants){const option=document.createElement('option');option.value=value;option.textContent=value;scenario.append(option);}scenario.value=first.variant;scenario.onchange=()=>{selection.variant=scenario.value;extra.value='';update();};
    const scenarioLabel=document.createElement('label');scenarioLabel.htmlFor=scenario.id;scenarioLabel.textContent='State / viewport';if(variants.length>1)secondary.append(scenarioLabel,scenario);
    const extra=document.createElement('select');extra.id='review-reference';extra.append(new Option('Product comparison',''));for(const v of references)extra.append(new Option(v.label,v.id));extra.onchange=update;
    if(references.length){const label=document.createElement('label');label.htmlFor=extra.id;label.textContent='Additional references';secondary.append(label,extra);}
    for(const reference of config.referenceLinks||[]){if(!/^[a-z0-9_./-]+\.(?:png|jpg|webp|html|md)$/i.test(reference.href)||reference.href.includes('..'))continue;const link=document.createElement('a');link.href=reference.href;link.target='_blank';link.rel='noopener';link.textContent=reference.label;link.title=reference.note||'';secondary.append(link);}
    section.append(secondary);
    const status=document.createElement('p');status.className='review-view-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');section.append(status);
    const discussPage=document.createElement('button');discussPage.type='button';discussPage.className='review-discuss-comparison';discussPage.textContent='Discuss';discussPage.setAttribute('aria-label','Discuss page comparison');discussPage.onclick=()=>window.reviewIssues?.open();section.append(discussPage);
    const missing=document.createElement('div');missing.className='review-view-missing';missing.hidden=true;const explanation=document.createElement('p'),discuss=document.createElement('button');discuss.type='button';discuss.textContent='Discuss this missing view';discuss.onclick=()=>window.reviewIssues?.open('Capture · '+Object.values(selection).join(' · '));missing.append(explanation,discuss);section.append(missing);
    const toolbar=document.querySelector('.annotation-toolbar'),anchor=toolbar||compare||document.querySelector('#content .preparation,#content .notice,#content .parts');if(!anchor)return;anchor.before(section);
    function update(){
      const ref=references.find(v=>v.id===extra.value),match=ref||matrix.find(v=>v.platform===selection.platform&&v.language===selection.language&&v.theme===selection.theme&&v.variant===selection.variant);
      section.querySelectorAll('[data-axis]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===selection[button.dataset.axis])));
      if(compare)compare.hidden=!match;if(toolbar){toolbar.hidden=!match;toolbar.querySelectorAll('button').forEach(button=>button.disabled=!match);}
      const caption=document.getElementById('image-note')||document.getElementById('capture-note');if(caption)caption.hidden=!match;
      missing.hidden=!!match;
      if(match){onSelect(match);status.textContent=ref?'Reference · '+match.label:([names[selection.platform]||selection.platform,names[selection.language]||selection.language,names[selection.theme]||selection.theme,selection.variant==='Default'?'':selection.variant].filter(Boolean).join(' · '));}
      else{const title=[names[selection.platform]||selection.platform,names[selection.language]||selection.language,names[selection.theme]||selection.theme,selection.variant].filter(Boolean).join(' · ');status.textContent=title;explanation.textContent=config.deferredPlatforms?.includes(selection.platform)?(names[selection.platform]||selection.platform)+' implementation is paused. This capture is not prepared.':title+' capture is not prepared for this revision. Prepare matching evidence to review this combination.';}
    }
    update();return {selection,captures};
  }
  return {mount,normalize};
})();
