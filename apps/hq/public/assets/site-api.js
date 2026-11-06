/* imtrtd.space ↔ admin.imtrtd.space: lead submission + optional CMS content. */
(function(){
var API='https://admin.imtrtd.space',MAIL='admin@imtrtd.space';
var page=(location.pathname.replace(/\.html$/,'').replace(/\/index$/,'/')||'/');
function src(extra){return 'imtrtd.space'+page+(extra?' · '+extra:'')}
function mailto(p){var body=(p.message||'')+'\n\n'+p.name+'\n'+p.contact;return 'mailto:'+MAIL+'?subject='+encodeURIComponent('Brief'+(p.task_type?' · '+p.task_type:''))+'&body='+encodeURIComponent(body.trim())}
function sendLead(p){
 var ctl=window.AbortController?new AbortController():null,t=setTimeout(function(){ctl&&ctl.abort()},12000);
 return fetch(API+'/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),signal:ctl&&ctl.signal,credentials:'omit',mode:'cors'})
 .then(function(r){clearTimeout(t);return r.json().catch(function(){return {}}).then(function(d){
  if(r.ok)return {ok:true};var e=new Error(d.error||('HTTP '+r.status));e.status=r.status;throw e})},function(err){clearTimeout(t);err.network=true;throw err})}
/* styles */
var css='.lx-status{margin-top:.75rem;padding:.7rem .85rem;border:1px solid var(--color-hair,rgba(178,141,255,.18));font-size:.85rem;line-height:1.45;color:#f3effa;background:#14141c}'+
'.lx-status[data-kind=ok]{border-color:#d8ff00}.lx-status[data-kind=ok] b{color:#d8ff00}.lx-status[data-kind=err]{border-color:#ff2bd6}.lx-status[data-kind=err] b{color:#ff2bd6}.lx-status a{color:var(--color-signal,#b28dff)}'+
'.lx-ts{margin-top:.75rem;min-height:65px}'+
'.lx-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}'+
'.lx-dlg{position:fixed;inset:0;z-index:80;display:grid;place-items:end center;background:rgba(5,5,10,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:0}'+
'@media(min-width:640px){.lx-dlg{place-items:center;padding:1rem}}'+
'.lx-box{width:100%;max-width:30rem;max-height:92dvh;overflow:auto;background:#14141c;border:1px solid rgba(178,141,255,.3);padding:1.25rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));color:#f3effa;font-family:inherit}'+
'.lx-box h2{margin:.25rem 0 1rem;font-size:1.6rem;font-weight:600;letter-spacing:-.03em}.lx-box label{display:grid;gap:.3rem;margin-top:.7rem}'+
'.lx-box label span{font-family:var(--font-mono,monospace);font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:#a3aac0}'+
'.lx-box input,.lx-box textarea{width:100%;font:inherit;font-size:16px;color:#f3effa;background:#0a0a0f;border:1px solid rgba(178,141,255,.25);padding:.65rem .75rem;border-radius:0;outline:none}'+
'.lx-box input:focus,.lx-box textarea:focus{border-color:var(--color-signal,#b28dff)}.lx-row{display:flex;gap:.5rem;margin-top:1rem;flex-wrap:wrap}'+
'.lx-btn{min-height:2.75rem;padding:0 1rem;font-family:var(--font-mono,monospace);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;border:1px solid rgba(178,141,255,.25);background:transparent;color:#f3effa;cursor:pointer}'+
'.lx-btn.p{background:linear-gradient(135deg,#b28dff,#7b5cff);border:0;color:#0a0a0f;flex:1}.lx-btn[disabled]{opacity:.6;cursor:progress}.lx-k{font-family:var(--font-mono,monospace);font-size:.68rem;letter-spacing:.14em;color:var(--color-signal,#b28dff);text-transform:uppercase}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
function status(after,kind,html){var el=after.parentNode.querySelector('.lx-status');if(!el){el=document.createElement('p');el.className='lx-status';el.setAttribute('role','status');el.setAttribute('aria-live','polite');after.parentNode.insertBefore(el,after.nextSibling)}el.dataset.kind=kind;el.innerHTML=html;return el}
function hp(form){if(form.querySelector('[name=website]'))return;var i=document.createElement('input');i.name='website';i.tabIndex=-1;i.autocomplete='off';i.className='lx-hp';i.setAttribute('aria-hidden','true');form.appendChild(i)}
/* Turnstile (PSE-22): admin.imtrtd.space GET /api/leads returns {turnstile:{siteKey}} or {turnstile:null}.
   Null, a failed request or a blocked script = no widget, the form works exactly as before. */
var TSCFG=null,TSAPI=null;
function tsConfig(){if(!TSCFG)TSCFG=fetch(API+'/api/leads',{credentials:'omit'}).then(function(r){return r.ok?r.json():null}).then(function(d){return d&&d.turnstile&&d.turnstile.siteKey?d.turnstile:null}).catch(function(){return null});return TSCFG}
function tsScript(){if(!TSAPI)TSAPI=new Promise(function(res){if(window.turnstile)return res(window.turnstile);var s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=function(){res(window.turnstile||null)};s.onerror=function(){res(null)};document.head.appendChild(s)});return TSAPI}
/* render the widget once per form, lazily (first focus / submit).
   Resolves to {on:false} (feature off, or script blocked: send without a token, the server decides)
   or {on:true,id} with a rendered widget. Expired / errored challenges reset themselves. */
function tsInit(form){if(form._ts)return form._ts;form._ts=tsConfig().then(function(c){if(!c)return {on:false};return tsScript().then(function(ts){if(!ts||!form.isConnected)return {on:false};
 var box=document.createElement('div');box.className='lx-ts';var a=form.querySelector('[type=submit]');while(a&&a.parentNode!==form)a=a.parentNode;form.insertBefore(box,a||null);
 var id=null,re=function(){try{id!=null&&ts.reset(id)}catch(e){}};
 try{id=ts.render(box,{sitekey:c.siteKey,theme:'dark',size:'flexible',action:'brief','expired-callback':re,'timeout-callback':re,'error-callback':function(){re();return true}})}catch(e){box.remove();return {on:false}}
 return {on:true,id:id}})});return form._ts}
/* {wait:true} while the widget is still loading or unsolved; never posts without a token once a widget exists */
function tsToken(form){var p=tsInit(form);
 return Promise.race([p,new Promise(function(r){setTimeout(function(){r(null)},8000)})]).then(function(w){
  if(!w)return {wait:true};if(!w.on||!window.turnstile)return {id:null,token:''};
  var t=window.turnstile.getResponse(w.id)||'';return t?{id:w.id,token:t}:{wait:true,id:w.id}})}
/* submit a form element; fields: name, contact, task|task_type, note|message */
function wire(form,opts){hp(form);form.addEventListener('focusin',function(){tsInit(form)},{once:true});form.addEventListener('submit',function(e){e.preventDefault();
 var g=function(n){var el=form.elements[n];return el?String(el.value||'').trim():''};
 var p={name:g('name'),contact:g('contact'),task_type:g('task')||g('task_type')||opts.task||'',message:(opts.prefix?opts.prefix()+'\n\n':'')+(g('note')||g('message')),website:g('website'),source:src(opts.label)};
 p.message=p.message.trim();var btn=form.querySelector('[type=submit]'),orig=btn&&btn.textContent;
 if(!p.name||!p.contact){status(btn,'err','<b>Name and contact, please.</b> Email or Telegram is enough.');return}
 if(btn){btn.disabled=true;btn.textContent='Sending…'}
 tsToken(form).then(function(t){
 if(t.wait){status(btn,'err','<b>One more step.</b> The anti-spam check above the button is still loading or needs a click. Finish it, then send again.');if(btn){btn.disabled=false;btn.textContent=orig}return}
 if(t.token)p.turnstile_token=t.token;
 return sendLead(p).then(function(){status(btn,'ok','<b>Sent.</b> I’ll answer at '+esc(p.contact)+' within a working day.');form.reset();opts.done&&opts.done()},
  function(err){var m=err.network?'<b>Couldn’t reach the server.</b> <a href="'+mailto(p)+'">Send it by email instead</a>.':err.status===429?'<b>Too many tries.</b> Wait a minute, or <a href="'+mailto(p)+'">email it</a>.':'<b>Not sent.</b> '+esc(err.message)+' · <a href="'+mailto(p)+'">email instead</a>';status(btn,'err',m)})
 .then(function(){if(btn){btn.disabled=false;btn.textContent=orig}if(t.id!=null)try{window.turnstile.reset(t.id)}catch(e){}})})})}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
/* modal brief: opts {title, message, task, label} */
function openBrief(o){o=o||{};var last=document.activeElement,d=document.createElement('div');d.className='lx-dlg';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','lx-h');
 d.innerHTML='<form class="lx-box" novalidate><span class="lx-k">Brief'+(o.label?' · '+esc(o.label):'')+'</span><h2 id="lx-h">'+esc(o.title||'Send a brief.')+'</h2>'+
 '<label><span>Name</span><input name="name" autocomplete="name" required maxlength="120"></label>'+
 '<label><span>Email / Telegram</span><input name="contact" autocomplete="email" required maxlength="200" inputmode="email"></label>'+
 '<label><span>Note</span><textarea name="message" rows="5" maxlength="3800"></textarea></label>'+
 '<div class="lx-row"><button class="lx-btn p" type="submit">Send brief</button><button class="lx-btn" type="button" data-x>Close</button></div><p class="lx-privacy" style="margin-top:.75rem">Your details are only used to reply to this request. They are never shared.</p></form>';
 document.body.appendChild(d);var f=d.querySelector('form');f.elements.message.value=o.message||'';var prevOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
 function close(){document.documentElement.style.overflow=prevOverflow;d.remove();removeEventListener('keydown',key);last&&last.focus&&last.focus()}
 function key(e){if(e.key==='Escape')close()}addEventListener('keydown',key);
 d.addEventListener('click',function(e){if(e.target===d||e.target.closest('[data-x]'))close()});
 wire(f,{task:o.task,label:o.label,done:function(){f.querySelectorAll('input,textarea').forEach(function(i){if(i.name!=='website')i.disabled=true});f.querySelector('[type=submit]').style.display='none'}});
 setTimeout(function(){f.elements.name.focus()},30)}
window.IMTRTD={sendLead:sendLead,openBrief:openBrief,wire:wire,mailto:mailto};
/* home brief form */
var home=document.querySelector('.brief-panel form');if(home)wire(home,{label:'Send a brief'});
/* contact page inline brief form (same fields + endpoint as home) */
var cform=document.querySelector('form[data-brief="contact"]');if(cform)wire(cform,{label:'Contact page'});
/* contact page: mailto CTA gets a form option */
var ct=document.querySelector('main[data-div*="Contact"] a[href^="mailto:"]')||(page==='/contact'&&document.querySelector('main a[href^="mailto:"]'));
if(ct&&!document.querySelector('[data-lx-open]')&&!cform){var b=document.createElement('button');b.type='button';b.className='lx-btn p';b.style.cssText='flex:none;margin-top:1.25rem;display:inline-flex;align-items:center';b.textContent='Send a brief here';b.setAttribute('data-lx-open','');b.addEventListener('click',function(){openBrief({label:'Contact'})});var w=document.createElement('div');w.appendChild(b);ct.parentNode.insertBefore(w,ct.nextSibling)}
/* CMS content: applied only when the admin sets copy key hq_cms = "on" (D1 still holds the old site's content). */
if(page==='/'||page==='/contact'||page==='/selected'){
 fetch(API+'/api/content',{credentials:'omit'}).then(function(r){return r.ok?r.json():null}).then(function(c){if(!c||!c.copy||c.copy.hq_cms!=='on')return;applyContent(c)}).catch(function(){});
}
/* admin stores case links as "work/x.html": serve the clean absolute URL (no 301 hop, works from any page) */
function caseHref(u){u=String(u||'').trim();if(/^work\//.test(u))u='/'+u;if(/^\/work\/[a-z0-9-]+\.html$/i.test(u))u=u.replace(/\.html$/i,'');return u}
function applyContent(c){var cp=c.copy;
 var mail=cp.hq_contact_email||cp.contact_email;if(mail&&/^[^\s@]+@[^\s@]+$/.test(mail)&&!/@pm\.me$/i.test(mail)){/* legacy pm.me value in admin copy is ignored */MAIL=mail;document.querySelectorAll('a[href^="mailto:"]').forEach(function(a){var q=a.getAttribute('href').split('?')[1];a.href='mailto:'+mail+(q?'?'+q:'');var t=a.querySelector('[data-mail-text]');if(t)t.textContent=mail;else if(!a.children.length&&/@/.test(a.textContent))a.textContent=mail;var cb=a.closest('.ct-card');cb=cb&&cb.querySelector('[data-ct-copy]');if(cb)cb.setAttribute('data-ct-copy',mail)})}
 /* only touch the DOM when the copy really differs: re-setting identical text repaints the hero line and moves LCP behind this cross-origin fetch */
 if(cp.hq_hero_line){var h=document.querySelector('.pulse-copy p.text-base');if(h&&h.textContent.trim()!==String(cp.hq_hero_line).trim())h.textContent=cp.hq_hero_line}
 var tg=(cp.hq_contact_telegram||cp.contact_telegram||'').replace(/^@/,'');
 if(tg&&/^[A-Za-z0-9_]{4,32}$/.test(tg)){var foot=document.querySelector('footer a[href^="mailto:"]');if(foot&&!document.querySelector('footer [data-tg]')){var a=document.createElement('a');a.href='https://t.me/'+tg;a.className=foot.className;a.textContent='@'+tg;a.setAttribute('data-tg','');a.rel='noopener';foot.parentNode.insertBefore(a,foot)}}
 var list=document.querySelector('#work ul');
 if(list&&c.cases&&c.cases.length){var tpl=list.querySelector('li'),rows=list.querySelectorAll('li'),same=rows.length===c.cases.length&&c.cases.every(function(k,i){var sp=rows[i].children[1],a=rows[i].querySelector('a');return sp&&sp.children.length>2&&sp.children[0].textContent===(k.role||'')&&sp.children[1].textContent===k.title&&sp.children[2].textContent===(k.result||'')&&a&&a.getAttribute('href')===caseHref(k.image_url)});if(tpl&&!same){list.innerHTML='';c.cases.forEach(function(k,i){var li=tpl.cloneNode(true),sp=li.children[1];li.children[0].textContent=('0'+(i+1)).slice(-2);
   sp.children[0].textContent=k.role||'';sp.children[1].textContent=k.title;sp.children[2].textContent=k.result||'';
   var a=li.querySelector('a'),href=caseHref(k.image_url);if(a){if(/^(https:\/\/|\/(?!\/))/.test(href)&&!/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(href))a.setAttribute('href',href);else a.remove()}list.appendChild(li)});
   var cnt=document.querySelector('#work p.text-mute'),ct2=c.cases.length+' live builds';if(cnt&&cnt.textContent.trim()!==ct2)cnt.textContent=ct2}}
 var caps=[].slice.call(document.querySelectorAll('section[data-div*="Capabilities"] ul'))[0];
 if(caps&&c.services&&c.services.length){var t2=caps.querySelector('li'),cur=caps.querySelectorAll('li'),same=cur.length===c.services.length&&c.services.every(function(s,i){var ps=cur[i].querySelectorAll('p');return ps.length>2&&ps[1].textContent===s.title&&ps[2].textContent===(s.description||'')});if(t2&&!same){caps.innerHTML='';c.services.forEach(function(s,i){var li=t2.cloneNode(true),ps=li.querySelectorAll('p');ps[0].textContent=('0'+(i+1)).slice(-2);ps[1].textContent=s.title;ps[2].textContent=s.description||'';caps.appendChild(li)})}}
}
})();
