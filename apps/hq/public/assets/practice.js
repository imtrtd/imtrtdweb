(function(){
var S=[
{k:'Brief',h:'Start from what exists',p:'I read the brand as it is: logo, type, colours, the copy already written. Then one question: what should a visitor do on the first screen?',o:['A one-page brief in plain language','The first-screen job, named','What stays untouched'],s:['Samples','/archive#brief-lab','build one in the visualizer']},
{k:'Sample',h:'One working screen, not a deck',p:'Before any scope, one real screen in the browser with real copy. You click it on your phone. If the direction is wrong, it costs a day, not a month.',o:['A live link, not a PDF','Real copy, real photos','Desk and phone, side by side'],s:['NATVIK TOURS','/work/natvik','a Ukrainian-language site for Dublin tours']},
{k:'System',h:'Identity and interface as one',p:'The sample becomes a system: type scale, spacing, components and states. The brand mark drives it. Nothing is restyled to look like this site.',o:['Tokens: colour, type, spacing','Components with every state','Rules for what not to do'],s:['NAMENLOS','/work/namenlos','a tattoo studio, Nuremberg / Kyiv']},
{k:'Build',h:'Shipped as code',p:'Design and build happen in the same hands, so nothing gets lost in a handoff. Static where it can be, a small server only where it must be.',o:['A fast site on the edge','Works offline where it makes sense','No dead links, no console errors'],s:['PULSEBOX','/work/pulse-box','a four-channel chiptune studio in the browser']},
{k:'Run',h:'Kept alive after launch',p:'A site that stops on launch week is not finished. Content changes, a new language, a fix after the first real users: that is part of the job.',o:['Deploys on every change','Small fixes without starting over','A record of what changed and why'],s:['CUEBOX','/work/cuebox','a standalone product app']}];
var root=document.getElementById('pr-process');if(root){
 var tabs=root.querySelector('.pr-steps'),panel=root.querySelector('.pr-panel'),bar=root.querySelector('.pr-track i'),cur=0;
 tabs.innerHTML=S.map(function(s,i){return '<button class="pr-step" role="tab" type="button" id="pr-t'+i+'" aria-controls="pr-panel" aria-selected="false"><b>0'+(i+1)+'</b><span>'+s.k+'</span></button>'}).join('');
 var bs=[].slice.call(tabs.children);
 function show(i,focus){cur=(i+S.length)%S.length;var s=S[cur];
  bs.forEach(function(b,j){b.setAttribute('aria-selected',j===cur);b.tabIndex=j===cur?0:-1});
  if(focus){bs[cur].focus();bs[cur].scrollIntoView({block:'nearest',inline:'nearest'})}
  bar.style.width=((cur+1)/S.length*100)+'%';
  panel.setAttribute('aria-labelledby','pr-t'+cur);
  panel.innerHTML='<div class="pr-anim"><span class="pr-num">STEP 0'+(cur+1)+' / 0'+S.length+'</span><h3>'+s.h+'</h3><p>'+s.p+'</p><p class="pr-seen">Seen in: <a href="'+s.s[1]+'">'+s.s[0]+'</a>, '+s.s[2]+'</p><div class="pr-nav"><button class="pr-btn" type="button" data-d="-1" aria-label="Previous step">←</button><button class="pr-btn" type="button" data-d="1">Next: '+S[(cur+1)%S.length].k+' →</button></div></div><ul class="pr-out pr-anim"><li class="pr-label">You get</li>'+s.o.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul>'}
 tabs.addEventListener('click',function(e){var b=e.target.closest('.pr-step');if(b)show(bs.indexOf(b))});
 tabs.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();show(cur+1,true)}else if(e.key==='ArrowLeft'){e.preventDefault();show(cur-1,true)}});
 panel.addEventListener('click',function(e){var b=e.target.closest('[data-d]');if(b)show(cur+ +b.dataset.d)});
 show(0)}
var ck=document.getElementById('pr-checklist');if(ck){
 var boxes=[].slice.call(ck.querySelectorAll('input')),out=ck.querySelector('.pr-meter strong'),msg=ck.querySelector('.pr-meter p'),fill=ck.querySelector('.pr-bar i'),mail=ck.querySelector('[data-mail]'),KEY='imtrtd-practice-check';
 try{var saved=JSON.parse(localStorage.getItem(KEY)||'[]');boxes.forEach(function(b,i){b.checked=saved.indexOf(i)>=0})}catch(e){}
 function upd(){var on=boxes.filter(function(b){return b.checked}),n=on.length,t=boxes.length;
  out.textContent=n+'/'+t;fill.style.width=(n/t*100)+'%';
  msg.textContent=n===t?'Ready. Send it as it is: a short email beats a long form.':n>=3?'Enough to start. The rest we can find together.':'Tick what you already know. None of it is required.';
  var body='Hi,\n\n'+(n?'What I already have:\n'+on.map(function(b){return '- '+b.dataset.q}).join('\n')+'\n\n':'')+'About the project:\n';
  mail.href='mailto:admin@imtrtd.space?subject='+encodeURIComponent('Brief')+'&body='+encodeURIComponent(body);
  try{localStorage.setItem(KEY,JSON.stringify(boxes.map(function(b,i){return b.checked?i:-1}).filter(function(i){return i>=0})))}catch(e){}}
 mail.addEventListener('click',function(e){if(!window.IMTRTD)return;e.preventDefault();var on=boxes.filter(function(b){return b.checked});window.IMTRTD.openBrief({label:'Practice',task:'Brief',message:on.length?'What I already have:\n'+on.map(function(b){return '- '+b.dataset.q}).join('\n')+'\n\nAbout the project:\n':''})});
 boxes.forEach(function(b){b.addEventListener('change',upd)});upd()}
})();
