/* Samples: brief visualizer (vanilla port of the original React island, which was never hydrated). */
(function(){
var root=document.getElementById('brief-lab');if(!root)return;
var P={void:{bg:'#070707',fg:'#ece8e0',mute:'#8d8d8d',accent:'#d8ff00',plate:'#141414'},paper:{bg:'#f3efe6',fg:'#161616',mute:'#5c5c5c',accent:'#111111',plate:'#e7e1d6'},dusk:{bg:'#100e14',fg:'#f2eef8',mute:'#a398b0',accent:'#c9a6ff',plate:'#1b1722'},sea:{bg:'#071416',fg:'#e7f4f2',mute:'#8eaea8',accent:'#9ee7d8',plate:'#102022'},heat:{bg:'#140c0a',fg:'#f6efe8',mute:'#b59a90',accent:'#ff6a3d',plate:'#241410'}};
var M=[['booking','Booking','dated booking, not a contact dump'],['catalog','Catalog','a short catalog of offers'],['journal','Journal','a writing or news index'],['prices','Prices','a visible rate table'],['form','Inquiry','a short inquiry form'],['map','Place','a place line, no embedded map widget'],['lang','Languages','EN / UA switch'],['reviews','Reviews','two short quotes'],['gallery','Gallery','a strip of work plates'],['shop','Shop','one buy row, no full storefront']];
function f(on){var o={};M.forEach(function(m){o[m[0]]=on.indexOf(m[0])>=0});return o}
var T={atelier:{name:'Atelier',line:'A studio that books from the first screen.',palette:'void',type:'grotesk',layout:'split',nav:'bar',hero:'statement',density:'air',motion:'drift',features:f(['booking','gallery','prices','form'])},
route:{name:'Route',line:'Tours, dates and a place, on paper.',palette:'paper',type:'serif',layout:'editorial',nav:'bar',hero:'offer',density:'air',motion:'still',features:f(['catalog','map','reviews','lang'])},
instrument:{name:'Instrument',line:'A product with one job and a tight frame.',palette:'sea',type:'mono',layout:'grid',nav:'corner',hero:'portrait',density:'tight',motion:'still',features:f(['catalog','prices','form','lang'])},
ledger:{name:'Ledger',line:'An editorial index. Reading first.',palette:'dusk',type:'serif',layout:'stack',nav:'corner',hero:'statement',density:'air',motion:'still',features:f(['journal','gallery','form'])},
night:{name:'Night',line:'An event page that sells the next date.',palette:'heat',type:'grotesk',layout:'split',nav:'bar',hero:'offer',density:'tight',motion:'glitch',features:f(['catalog','shop','reviews','map'])}};
var GROUPS={type:['grotesk','serif','mono'],layout:['split','stack','editorial','grid'],nav:['bar','corner','hidden'],hero:['statement','offer','portrait'],density:['air','tight'],motion:['still','drift','glitch']};
function clone(t,id){var o=JSON.parse(JSON.stringify(t));o.id=id;return o}
var st=clone(T.atelier,'atelier'),phone=false;
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function spec(b){var on=M.filter(function(m){return b.features[m[0]]});return [b.name,b.line,'','Palette: '+b.palette,'Type: '+b.type,'Layout: '+b.layout,'Navigation: '+b.nav,'Hero: '+b.hero,'Density: '+b.density,'Motion: '+b.motion,'',on.length?'Include:':'Include: a single screen, no extra modules'].concat(on.map(function(m){return '- '+m[1]+': '+m[2]}),['','Deliver one working sample in this system. No extra pages unless a module needs one.']).join('\n')}
function frame(b,ph){var n=P[b.palette],font=b.type==='serif'?"Georgia, 'Times New Roman', serif":b.type==='mono'?"ui-monospace, 'Geist Mono', monospace":"Arial, 'Arimo', sans-serif",
pad=b.density==='air'?(ph?16:28):(ph?12:16),fs=ph?34:b.layout==='editorial'?54:46,on=M.filter(function(m){return b.features[m[0]]}),h='';
h+='<div class="tz-frame tz-motion-'+b.motion+'" style="background:'+n.bg+';color:'+n.fg+';font-family:'+font.replace(/"/g,'&quot;')+';padding:'+pad+'px">';
if(b.nav!=='hidden')h+='<div class="tz-nav" style="color:'+n.mute+'"><span>'+esc(b.name)+'</span><span>'+(b.nav==='corner'?'Menu':b.features.lang?'EN&nbsp; UA':'Work&nbsp; Book')+'</span></div>';
h+='<div class="tz-hero tz-hero-'+b.layout+'"><div><p class="tz-kicker" style="color:'+n.accent+'">'+(b.hero==='offer'?'Next open date':'Sample')+'</p><h3'+(b.motion==='glitch'?' class="tz-glitch"':'')+' style="font-size:'+fs+'px">'+esc(b.name||' ')+'</h3><p style="color:'+n.mute+';max-width:28ch">'+esc(b.line)+'</p></div>';
if(b.hero!=='statement')h+='<div class="tz-offer" style="background:'+n.plate+';color:'+n.fg+'"><span style="color:'+n.accent+'">'+(b.hero==='portrait'?'Plate':'From')+'</span><strong>'+(b.hero==='portrait'?'01':'Open')+'</strong></div>';
h+='</div>';
h+=on.length?'<ul class="'+(b.layout==='grid'?'tz-modules tz-modules-grid':'tz-modules')+'">'+on.map(function(m){return '<li style="border-color:'+n.mute+'"><span style="color:'+n.accent+'">'+m[1]+'</span><span style="color:'+n.mute+'">'+m[2]+'</span></li>'}).join('')+'</ul>':'<p style="color:'+n.mute+'">One screen. Nothing else.</p>';
return h+'</div>'}
var cards=[].slice.call(document.querySelectorAll('.tz-card')),inputs=root.querySelectorAll('.tz-field input'),device=root.querySelector('.tz-device'),pre=root.querySelector('.tz-spec'),bar=root.querySelector('.tz-stage-bar'),send=bar.querySelector('[data-fx=send-sample]'),copyBtn=bar.querySelector('[data-fx=copy]');
function setOn(btn,on){btn.classList.toggle('is-on',!!on)}
function render(){
 cards.forEach(function(c){var on=c.dataset.fx===st.id;setOn(c,on);c.setAttribute('aria-pressed',on)});
 if(document.activeElement!==inputs[0])inputs[0].value=st.name;if(document.activeElement!==inputs[1])inputs[1].value=st.line;
 root.querySelectorAll('[data-fx^="palette-"]').forEach(function(b){var on=b.dataset.fx==='palette-'+st.palette;setOn(b,on);b.setAttribute('aria-pressed',on)});
 Object.keys(GROUPS).forEach(function(g){GROUPS[g].forEach(function(v){var b=root.querySelector('.tz-controls [data-fx="'+v+'"]');if(b){setOn(b,st[g]===v);b.setAttribute('aria-pressed',st[g]===v)}})});
 M.forEach(function(m){var b=root.querySelector('.tz-controls [data-fx="'+m[0]+'"]');if(b){setOn(b,st.features[m[0]]);b.setAttribute('aria-pressed',!!st.features[m[0]])}});
 setOn(bar.querySelector('[data-fx=desk]'),!phone);setOn(bar.querySelector('[data-fx=phone]'),phone);
 device.classList.toggle('is-phone',phone);device.innerHTML=frame(st,phone);
 var s=spec(st);pre.textContent=s;send.textContent='Send';
 send.href='mailto:imtrtd@pm.me?subject='+encodeURIComponent('Sample · '+st.name)+'&body='+encodeURIComponent(s)}
cards.forEach(function(c){c.setAttribute('aria-pressed','false');c.addEventListener('click',function(){var t=T[c.dataset.fx];if(t){st=clone(t,c.dataset.fx);render()}})});
inputs[0].addEventListener('input',function(){st.name=this.value;st.id='custom';render()});
inputs[1].addEventListener('input',function(){st.line=this.value;st.id='custom';render()});
root.querySelector('.tz-controls').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var k=b.dataset.fx;
 if(k.indexOf('palette-')===0){st.palette=k.slice(8)}else if(st.features.hasOwnProperty(k)){st.features[k]=!st.features[k]}else{for(var g in GROUPS)if(GROUPS[g].indexOf(k)>=0)st[g]=k}
 st.id='custom';render()});
bar.querySelector('[data-fx=desk]').addEventListener('click',function(){phone=false;render()});
bar.querySelector('[data-fx=phone]').addEventListener('click',function(){phone=true;render()});
function copied(ok){copyBtn.textContent=ok?'Copied':'Select & copy';setTimeout(function(){copyBtn.textContent='Copy brief'},1600)}
send.addEventListener('click',function(e){if(!window.IMTRTD)return;e.preventDefault();window.IMTRTD.openBrief({title:'Send this sample.',label:'Samples · '+st.name,task:'Sample · '+st.name,message:spec(st)})});
copyBtn.addEventListener('click',function(){var s=spec(st);
 if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(s).then(function(){copied(true)},fallback)}else fallback();
 function fallback(){var t=document.createElement('textarea');t.value=s;t.setAttribute('readonly','');t.style.cssText='position:fixed;opacity:0;top:0';document.body.appendChild(t);t.select();t.setSelectionRange(0,s.length);var ok=false;try{ok=document.execCommand('copy')}catch(e){}document.body.removeChild(t);copied(ok)}});
render();
})();
