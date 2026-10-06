// One review board represents one PROJECT. Products belong to that project.
// Shared is added automatically when project.products has more than one item.
// Product titles are arbitrary; Provider and Customer are examples, not built-in roles.
window.reviewConfig={
 reviewMode:'brief', // 'full' adds prepared element explanations below the comparison.
 reviewLanguage:'en',direction:'ltr',
 project:{id:'project',title:'Your project',products:[
  {id:'product',title:'Your product',viewports:['mobile','desktop'],platforms:['pwa'],languages:['en'],themes:['light','dark']}
 ]},
 pages:[{
  id:'P01',productId:'product',title:'First page',revision:'r1',
  summary:'Capture this page, then prepare a concrete alternative to review.',
  provenance:'Inventory only. No visual proposal or implementation has been approved.',
  defaultPlatform:'pwa',defaultLanguage:'en',
  parts:[{name:'Primary task',current:'Document the current task.',proposed:'Describe the specific improvement.'}],
  views:[],
  // Only add views after the exact captures exist. All axes describe SCREEN evidence.
  // {id:'desktop-en-light',viewport:'desktop',platform:'pwa',language:'en',theme:'light',variant:'Default',label:'Desktop · English · Light',current:'p01-current-desktop.png',proposed:'p01-r1-desktop.png',wide:true,note:'Synthetic fixture, same state and content.'}
  externalSources:[]
  // {id:'stitch-concept-1',label:'Stitch concept 1',provider:'Stitch',provenance:'Inspected export, original artboard retained.',views:[{id:'stitch-mobile-en-light',viewport:'mobile',platform:'pwa',language:'en',theme:'light',variant:'Default',image:'sources/stitch-concept-1.png'}]}
 }]
};
