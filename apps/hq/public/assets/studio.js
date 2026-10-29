/* imtrtd merged — lightweight vanilla replacement for the original React bundles */
(function(){
'use strict';
var EMAIL='admin@imtrtd.space', KEY='imtrtd-accent', ACCENTS={lime:'#d8ff00',violet:'#b28dff',magenta:'#ff2bd6',cyan:'#2ee9ff'};
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function signal(){return getComputedStyle(document.documentElement).getPropertyValue('--color-signal').trim()||'#b28dff'}
function rgb(hex){var m=String(hex).match(/rgba?\(([^)]+)\)/);if(m)return m[1].split(/[ ,\/]+/).slice(0,3).map(function(v){return Math.round(parseFloat(v))});hex=hex.replace('#','');if(hex.length===3)hex=hex.replace(/./g,'$&$&');var n=parseInt(hex,16);return [(n>>16)&255,(n>>8)&255,n&255]}

/* ---------- Sound: 8-bit chiptune engine, one original track per accent, crossfaded ---------- */
var VOLKEY='imtrtd-volume';
var Audio_={ctx:null,on:false,master:null,waves:{},noise:null,timer:0,players:[],out:null,vol:.6,
  init:function(){if(this.ctx)return;var C=window.AudioContext||window.webkitAudioContext;if(!C)return;var c=this.ctx=new C();
    this.master=c.createGain();this.master.gain.value=this.curve(this.vol);var hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=40;
    var comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;this.master.connect(hp);hp.connect(comp);comp.connect(c.destination);
    this.fx=c.createGain();this.fx.gain.value=1;this.fx.connect(this.master);this.an=c.createAnalyser();this.an.fftSize=512;comp.connect(this.an);this.abuf=new Float32Array(this.an.fftSize);this.beats=[];
    var self=this;[.125,.25,.5].forEach(function(d){var n=64,re=new Float32Array(n),im=new Float32Array(n);for(var k=1;k<n;k++)im[k]=2/(k*Math.PI)*Math.sin(k*Math.PI*d);self.waves[d]=c.createPeriodicWave(re,im)});
    var b=c.createBuffer(1,c.sampleRate,c.sampleRate),dd=b.getChannelData(0),r=1;for(var i=0;i<dd.length;i++){r^=r<<13;r^=r>>17;r^=r<<5;dd[i]=((r>>>0)%2)?.8:-.8}this.noise=b},
  unlock:function(){var c=this.ctx;if(!c)return;if(c.resume)c.resume();var s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0)},
  curve:function(v){return .55*v*v},
  setVolume:function(v){this.vol=v;try{localStorage.setItem(VOLKEY,String(v))}catch(e){}if(this.ctx)this.master.gain.setTargetAtTime(this.curve(v),this.ctx.currentTime,.06)},
  hz:function(m){return 440*Math.pow(2,(m-69)/12)},
  pulse:function(m,t,dur,vol,duty,slide,vib){var c=this.ctx,o=c.createOscillator(),g=c.createGain();o.setPeriodicWave(this.waves[duty||.5]);o.frequency.setValueAtTime(this.hz(m),t);if(slide)o.frequency.exponentialRampToValueAtTime(this.hz(m+slide),t+dur);
    if(vib&&dur>.3){var l=c.createOscillator(),lg=c.createGain();l.frequency.value=5.5;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(this.hz(m)*.012,t+dur*.6);l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+dur+.02)}
    g.gain.setValueAtTime(vol,t);g.gain.setValueAtTime(vol*.7,t+dur*.6);g.gain.linearRampToValueAtTime(0,t+dur);o.connect(g);g.connect(this.out||this.fx);o.start(t);o.stop(t+dur+.02)},
  tri:function(m,t,dur,vol){var c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=this.hz(m);g.gain.setValueAtTime(vol,t);g.gain.linearRampToValueAtTime(0,t+dur);o.connect(g);g.connect(this.out||this.fx);o.start(t);o.stop(t+dur+.02)},
  hit:function(t,dur,vol,f,type){var c=this.ctx,s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;s.playbackRate.value=type==='hp'?1:.35;fl.type=type==='hp'?'highpass':'lowpass';fl.frequency.value=f;
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(1e-4,t+dur);s.connect(fl);fl.connect(g);g.connect(this.out||this.fx);s.start(t,Math.random()*.5);s.stop(t+dur+.02)},
  kick:function(t,v){this.pulse(52,t,.09,v||.35,.5,-24)},
  lead:function(T,bar,s,t,q,duty,vol,oct,vib){var row=T.lead[bar%T.lead.length],n=row[s];if(n<=0)return;var len=1;while(s+len<16&&row[s+len]===-1)len++;this.pulse(n+(oct||0),t,q*len*.95,vol,duty,0,vib);return len},
  play:function(name){var c=this.ctx,T=TRACKS[name]||TRACKS.violet,now=c.currentTime,self=this;
    this.players.forEach(function(p){if(p.stopAt)return;p.stopAt=now+1.6;p.gain.gain.cancelScheduledValues(now);p.gain.gain.setValueAtTime(p.gain.gain.value,now);p.gain.gain.linearRampToValueAtTime(0,now+1.5)});
    var g=c.createGain();g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(1,now+1.2);g.connect(this.master);
    this.players.push({T:T,name:name,gain:g,next:now+.06,step:0,stopAt:0});
    if(!this.timer)this.timer=setInterval(function(){self.pump()},25)},
  pump:function(){var c=this.ctx,now=c.currentTime,self=this;
    this.players=this.players.filter(function(p){if(p.stopAt&&now>p.stopAt){p.gain.disconnect();return false}return true});
    this.players.forEach(function(p){var q=60/p.T.bpm/4;self.out=p.gain;while(p.next<now+.15){if(!p.stopAt||p.next<p.stopAt){p.T.tick(self,p.next,p.step,q);if(p.step%4===0&&!p.stopAt)self.beats.push({t:p.next,w:p.step%16===0?1:.7,q:q})}p.next+=q;p.step++}});if(this.beats.length>64)this.beats.splice(0,this.beats.length-64);self.out=null;
    if(!this.players.length){clearInterval(this.timer);this.timer=0}},
  stopAll:function(){var now=this.ctx.currentTime;this.players.forEach(function(p){if(!p.stopAt){p.stopAt=now+.5;p.gain.gain.cancelScheduledValues(now);p.gain.gain.setValueAtTime(p.gain.gain.value,now);p.gain.gain.linearRampToValueAtTime(0,now+.45)}})},
  blip:function(steps,gap){if(!this.on||!this.ctx)return;var t=this.ctx.currentTime+.01,self=this;this.out=null;steps.forEach(function(s,i){self.pulse(72+s,t+gap/1000*i,.07,.08,.25,s>=0?2:-2)})},
  sting:function(steps,gap){this.blip(steps,Math.min(gap,90))},
  /* beat envelope from the real schedule (AudioContext clock) + RMS amplitude from an AnalyserNode */
  levels:function(){if(!this.ctx||!this.an)return{beat:0,amp:0};var c=this.ctx,now=c.currentTime-(c.outputLatency||c.baseLatency||0),b=null;
    for(var i=this.beats.length-1;i>=0;i--){if(this.beats[i].t<=now){b=this.beats[i];break}}
    var beat=0;if(b){var dt=now-b.t,dec=Math.max(.12,b.q*2.2);beat=b.w*Math.min(1,dt/.025)*Math.exp(-dt/dec*2.5)}
    this.an.getFloatTimeDomainData(this.abuf);var sum=0;for(var j=0;j<this.abuf.length;j++)sum+=this.abuf[j]*this.abuf[j];
    return{beat:beat,amp:Math.min(1,Math.sqrt(sum/this.abuf.length)*4)}}
};
var TRACKS={
  /* VIOLET (default): "Low Orbit" — calm D-major drift, 92 bpm, slow arps, long lead, soft hats */
  violet:{bpm:92,chords:[[50,54,57,61],[47,50,54,57],[43,47,50,54],[45,49,52,57]],
    lead:[[78,-1,-1,-1,-1,-1,76,-1,74,-1,-1,-1,0,0,0,0],[73,-1,-1,-1,74,-1,76,-1,-1,-1,-1,-1,0,0,0,0],[71,-1,-1,-1,-1,-1,74,-1,79,-1,-1,-1,78,-1,-1,-1],[76,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,73,-1,76,-1]],
    tick:function(A,t,st,q){var bar=Math.floor(st/16)%4,s=st%16,ch=this.chords[bar],half=Math.floor(st/64)%2;
      if(s%2===0){var i=s/2%6,idx=[0,1,2,3,2,1][i];A.pulse(ch[idx]+12,t,q*1.8,.03,.125)}
      if(s===0)A.tri(ch[0]-12,t,q*7.5,.22);if(s===8)A.tri(ch[0]-5,t,q*7.5,.18);
      if(half)A.lead(this,bar,s,t,q,.5,.045,0,true);
      if(s===4||s===12)A.hit(t,.05,.035,8000,'hp');if(s===0)A.kick(t,.12)}},
  /* LIME: "Ball Launch" — energetic pinball-arcade A-minor, 150 bpm (the Space-Cadet-spirited one) */
  lime:{bpm:150,chords:[[57,60,64],[53,57,60],[48,52,55],[55,59,62],[57,60,64],[53,57,60],[55,59,62],[52,56,59]],
    lead:[[76,-1,0,79,0,81,-1,0,84,-1,81,0,79,0,76,0],[77,-1,0,76,0,72,-1,0,74,0,76,-1,77,0,79,-1],[79,-1,-1,0,76,0,79,0,84,-1,0,83,0,79,0,76],[74,-1,0,79,0,74,0,71,74,-1,-1,0,0,0,0,0],
      [81,0,84,0,88,-1,0,86,84,-1,0,81,0,79,81,0],[77,-1,0,81,0,84,-1,0,81,0,79,0,77,-1,76,0],[79,0,83,0,86,-1,0,83,86,0,91,-1,0,88,-1,0],[88,-1,-1,-1,86,-1,84,-1,83,-1,-1,-1,80,-1,-1,0]],
    tick:function(A,t,st,q){var bar=Math.floor(st/16)%8,s=st%16,ch=this.chords[bar],sec=Math.floor(st/128)%2;
      A.pulse(ch[s%3]+(s%6<3?12:24),t,q*.9,.04,.125);
      if(s%2===0)A.tri((s%4===0?ch[0]:ch[0]+12)-24+(s===14?7:0)-(ch[0]>=55?12:0),t,q*1.8,.26);
      if(sec===1||bar%2===0||s<8){var len=A.lead(this,bar,s,t,q,sec?.25:.5,.065);if(len>3)A.pulse(this.lead[bar][s]+12,t+q*len*.5,q*len*.45,.02,.125)}
      if(s%4===0)A.kick(t);if(s%8===4)A.hit(t,.12,.24,3000,'lp');if(s%2===1)A.hit(t,.035,.085,7000,'hp');if(bar===7&&s>11)A.hit(t,.08,.17,2500,'lp')}},
  /* MAGENTA: "Neon Strut" — funky E-dorian, 124 bpm, syncopated octave bass, staccato riffs, backbeat claps */
  magenta:{bpm:124,chords:[[52,55,59,62],[57,61,64,67],[52,55,59,62],[47,50,54,57]],
    lead:[[76,0,79,0,0,81,0,79,0,76,0,0,74,0,76,0],[0,0,81,-1,0,79,0,76,0,0,73,0,76,-1,0,0],[76,0,79,0,0,81,0,83,-1,0,81,0,79,0,76,0],[74,-1,0,71,0,74,0,78,-1,-1,0,0,0,0,0,0]],
    tick:function(A,t,st,q){var bar=Math.floor(st/16)%4,s=st%16,ch=this.chords[bar];
      if([0,3,6,8,10,11,14].indexOf(s)>=0)A.tri(ch[0]-12+(s%2?12:0),t,q*.9,.3);
      if(s%4===2)ch.forEach(function(n){A.pulse(n+12,t,q*.7,.018,.5)});
      if(Math.floor(st/64)%2||bar<2)A.lead(this,bar,s,t,q,.25,.06);
      if(s===0||s===8||s===11)A.kick(t,.32);if(s===4||s===12){A.hit(t,.1,.2,2600,'lp');A.hit(t+.012,.06,.08,5000,'hp')}
      A.hit(t,s===14?.12:.025,s%2?.04:.06,9000,'hp')}},
  /* CYAN: "Tide Pool" — aquatic C-minor, 108 bpm, rippling 16th arps, triangle-doubled lead with vibrato */
  cyan:{bpm:108,chords:[[48,51,55],[44,48,51],[51,55,58],[46,50,53]],
    lead:[[72,-1,-1,75,-1,-1,79,-1,-1,-1,77,-1,75,-1,-1,-1],[72,-1,-1,-1,-1,-1,0,0,68,-1,72,-1,75,-1,-1,-1],[74,-1,-1,75,-1,-1,79,-1,82,-1,-1,-1,79,-1,-1,-1],[77,-1,-1,-1,74,-1,-1,-1,70,-1,-1,-1,0,0,0,0]],
    tick:function(A,t,st,q){var bar=Math.floor(st/16)%4,s=st%16,ch=this.chords[bar];
      var seq=[0,1,2,3,4,5,4,3],n=seq[s%8],note=ch[n%3]+12*(1+Math.floor(n/3));A.pulse(note+12,t,q*.8,.026,.125);
      if(s%2===0)A.tri(ch[0]-12+(s%4?12:0),t,q*1.7,.22);
      if(Math.floor(st/64)%2||bar%2===0){var len=A.lead(this,bar,s,t,q,.5,.04,0,true);if(len)A.tri(this.lead[bar][s],t,q*len*.95,.1)}
      if(s===0||s===10)A.kick(t,.22);if(s===4||s===12)A.hit(t,.03,.08,6000,'hp');if(s%2===1)A.hit(t,.02,.025,11000,'hp')}}
};
/* UI sounds: main buttons only (primary CTAs, brief send/open, Preview). Nav, logo, mail, colour switcher and planet clicks are silent. */
var FX_MAIN=[['[data-fx=explore]',[[0,4,7,12],40]],['[data-fx=send],form button[type=submit],.lx-dlg button[type=submit]',[[0,7,12,19],45]],['[data-lx-open],[data-ct-brief]',[[0,7,12],45]],['a.bg-signal[href*="work/"]',[[7,12],50]]];
document.addEventListener('pointerdown',function(e){if(!Audio_.on||!e.target.closest)return;for(var i=0;i<FX_MAIN.length;i++){if(e.target.closest(FX_MAIN[i][0])){Audio_.blip(FX_MAIN[i][1][0],FX_MAIN[i][1][1]);return}}},true);
window.addEventListener('imtrtd-accent',function(){if(Audio_.on&&Audio_.ctx)Audio_.play(currentAccent())});

function initSound(){try{var v=parseFloat(localStorage.getItem(VOLKEY));if(v>=0&&v<=1)Audio_.vol=v}catch(e){}
  $$('[data-sound]').forEach(function(b){
    var wrap=document.createElement('label');wrap.className='vol-wrap';wrap.title='Music volume';
    wrap.innerHTML='<span class="sr-only">Music volume</span><input class="vol" type="range" min="0" max="1" step="0.01" aria-label="Music volume">';
    var r=wrap.querySelector('input');r.value=Audio_.vol;function paint(){r.style.setProperty('--v',(r.value*100)+'%')}paint();
    r.addEventListener('input',function(){Audio_.setVolume(parseFloat(r.value));paint()});
    b.parentNode.insertBefore(wrap,b.nextSibling);
    b.addEventListener('click',function(){Audio_.init();if(!Audio_.ctx)return;Audio_.unlock();Audio_.on=!Audio_.on;b.setAttribute('aria-pressed',String(Audio_.on));document.documentElement.classList.toggle('sound-on',Audio_.on);
      if(Audio_.on){Audio_.blip([0,4,7,12],45);Audio_.play(currentAccent())}else{Audio_.stopAll();Audio_.out=null;Audio_.pulse(84,Audio_.ctx.currentTime,.15,.08,.5,-24)}})})}

/* ---------- Colour switcher ---------- */
function currentAccent(){var a=document.documentElement.dataset.accent;return ACCENTS[a]?a:'violet'}
function setAccent(a){if(a==='violet')delete document.documentElement.dataset.accent;else document.documentElement.dataset.accent=a;try{localStorage.setItem(KEY,a)}catch(e){}paintSwitcher();window.dispatchEvent(new Event('imtrtd-accent'))}
function paintSwitcher(){var cur=currentAccent();$$('[aria-label="Site colour"] [role=radio]').forEach(function(b){var id=b.getAttribute('data-fx'),on=id===cur,sw=b.firstElementChild;b.setAttribute('aria-checked',String(on));if(!sw)return;sw.style.background=ACCENTS[id];sw.style.boxShadow=on?'0 0 12px '+ACCENTS[id]:'none';sw.className=on?'size-3.5 ring-2 ring-paper ring-offset-2 ring-offset-ink':'size-3.5 opacity-80'})}
function initSwitcher(){$$('[aria-label="Site colour"] [role=radio]').forEach(function(b){b.addEventListener('click',function(){setAccent(b.getAttribute('data-fx'))})});paintSwitcher()}

/* ---------- One shared rAF loop for every canvas ----------
   Each job has its own frame interval (fps cap) and a want() test; the loop stops entirely when no job
   wants frames (tab hidden, canvas off-screen, reduced motion) and is restarted with Loop.go(). */
var small=window.matchMedia('(max-width: 767px), (pointer: coarse)');
function dprCap(){return Math.min(window.devicePixelRatio||1,small.matches?1.25:1.5)}
var Loop={jobs:[],raf:0,
  add:function(j){j.last=-1e9;Loop.jobs.push(j);Loop.go()},
  go:function(){if(!Loop.raf&&!document.hidden)Loop.raf=requestAnimationFrame(Loop.tick)},
  tick:function(t){Loop.raf=0;var more=false;
    for(var i=0;i<Loop.jobs.length;i++){var j=Loop.jobs[i];if(!j.want())continue;more=true;
      if(t-j.last>=j.iv-4){var f=Math.min(6,(t-j.last)/16.667);j.last=t;j.run(t,f)}}
    if(more)Loop.go()}};
document.addEventListener('visibilitychange',function(){Loop.go()});
if(reduce.addEventListener)reduce.addEventListener('change',function(){Loop.go()});
/* start canvas work after the first paint and load, when the main thread is idle */
function whenIdle(fn){function go(){(window.requestIdleCallback||function(f){return setTimeout(f,50)})(fn,{timeout:1000})}
  if(document.readyState==='complete')go();else addEventListener('load',go,{once:true})}

/* stable viewport height: on touch devices ignore height-only resizes (mobile address bar) */
var coarse=window.matchMedia('(pointer: coarse)'),_vh=innerHeight,_vw=innerWidth;
function stableVH(){if(!coarse.matches||innerWidth!==_vw||Math.abs(innerHeight-_vh)>innerHeight*.35){_vw=innerWidth;_vh=innerHeight}return _vh}

/* ---------- Background starfield (ported from the original cosmos-field) ----------
   30 fps, DPR capped (1.25 on phones, 1.5 elsewhere), motion scaled by elapsed time; one static frame with reduced motion. */
function initCosmos(){var t=$('.cosmos-field');if(!t)return;var n=t.getContext('2d',{alpha:false});if(!n)return;
  var stars=Array.from({length:small.matches?180:260},function(){return{x:Math.random(),y:Math.random(),z:Math.random(),w:.4+Math.random()*1.4,tint:Math.random()}});
  var acc=rgb(signal()),dirty=true;function redraw(){dirty=true;Loop.go()}
  window.addEventListener('imtrtd-accent',function(){acc=rgb(signal());redraw()});addEventListener('resize',redraw);
  if(reduce.addEventListener)reduce.addEventListener('change',redraw);
  function frame(e,fr){var c=dprCap(),l=Math.max(2,Math.round(innerWidth*c)),u=Math.max(2,Math.round(stableVH()*c));
    if(t.width!==l||t.height!==u){t.width=l;t.height=u}
    n.fillStyle='#0a0a0f';n.fillRect(0,0,l,u);var d=e*.001*(reduce.matches?.3:1);
    var f=l*(.78+Math.sin(d*.07)*.03),p=u*(.58+Math.cos(d*.05)*.02),m=n.createRadialGradient(f,p,0,f,p,l*.28);
    m.addColorStop(0,'rgba('+acc+',0.26)');m.addColorStop(.35,'rgba(90,40,160,0.12)');m.addColorStop(1,'rgba(10,10,15,0)');n.fillStyle=m;n.fillRect(0,0,l,u);
    var h=n.createLinearGradient(0,u*.42,0,u);h.addColorStop(0,'rgba(20,10,32,0)');h.addColorStop(.45,'rgba(40,20,70,0.18)');h.addColorStop(1,'rgba(14,12,36,0.28)');n.fillStyle=h;n.fillRect(0,0,l,u);
    var g=u*(.62+Math.sin(d*.04)*.01);n.strokeStyle='rgba(178,141,255,0.09)';n.lineWidth=c;var _=d*40%48;
    for(var i=0;i<9;i++){var y=g+i*i*3.2*c+i/8*_;n.globalAlpha=.35+i*.05;n.beginPath();n.moveTo(0,y);n.lineTo(l,y);n.stroke()}
    n.globalAlpha=1;var v=l*.5;n.strokeStyle='rgba('+acc+',0.07)';n.beginPath();for(i=-6;i<=6;i++){n.moveTo(v,g);n.lineTo(v+i*l*.16,u)}n.stroke();
    var sp=(reduce.matches?0:.0034)*fr,b=l*.5,x=u*.46;
    stars.forEach(function(s){s.z-=sp;if(s.z<.02){s.z=1;s.x=Math.random();s.y=Math.random()}var k=1-s.z,r=b+(s.x-.5)*l*(.2+k*1.55),a=x+(s.y-.5)*u*(.2+k*1.45),
      col=s.tint>.82?acc.join(','):s.tint>.64?'123,92,255':'243,239,250',al=k*.75;
      if(!reduce.matches&&k>.62){var dx=r-b,dy=a-x,len=Math.hypot(dx,dy)||1,dd=k*k*36*c;n.strokeStyle='rgba('+col+','+al+')';n.lineWidth=Math.max(1,s.w*k*c);n.beginPath();n.moveTo(r,a);n.lineTo(r-dx/len*dd,a-dy/len*dd);n.stroke()}
      else{n.fillStyle='rgba('+col+','+al+')';var sz=s.w*(.5+k*1.8)*c;n.fillRect(r,a,sz,sz)}})}
  frame(performance.now(),0);dirty=false;
  Loop.add({iv:1000/30,want:function(){return !reduce.matches||dirty},run:function(e,fr){dirty=false;frame(e,fr)}})}

/* ---------- Scroll-pinned hero (same maths as original: fold = progress/.68, open > .62) ---------- */
var fold={v:0,on:null};
function initHero(){var st=$('.pulse-stage');if(!st)return;var raf=0;
  function upd(){
    var e=st.offsetHeight-stableVH(),i=e<=0?0:-st.getBoundingClientRect().top/e,a=Math.min(1,Math.max(0,i/.68));if(a!==fold.v){fold.v=a;if(fold.on)fold.on()}st.style.setProperty('--fold',a.toFixed(4));st.dataset.open=a>.62?'1':'0'}
  function q(){cancelAnimationFrame(raf);raf=requestAnimationFrame(upd)}
  addEventListener('scroll',q,{passive:true});addEventListener('resize',q);upd();
  var ex=$('[data-fx=explore]');if(ex)ex.addEventListener('click',function(ev){var w=$('#work');if(w){ev.preventDefault();w.scrollIntoView({behavior:reduce.matches?'auto':'smooth'})}});
  /* brief form submit is handled by assets/site-api.js (POST to admin API, mailto fallback) */
  whenIdle(function(){if(!initSolar())initFigure()})}

/* ---------- Hero figure: lightweight 2D take on the original pulse shader ---------- */
function initFigure(){var cv=$('.pulse-shader');if(!cv)return;var x=cv.getContext('2d');if(!x)return;var ptr={x:.5,y:.5,e:0},pulse=0,vis=true,dirty=true;
  function redraw(){dirty=true;Loop.go()}
  cv.addEventListener('pointermove',function(e){var r=cv.getBoundingClientRect();ptr.x=(e.clientX-r.left)/r.width;ptr.y=(e.clientY-r.top)/r.height;ptr.e=1});
  cv.addEventListener('pointerdown',function(){pulse=1;redraw()});
  window.addEventListener('imtrtd-accent',function(){pulse=1;redraw()});fold.on=redraw;
  if(window.ResizeObserver)new ResizeObserver(redraw).observe(cv);
  new IntersectionObserver(function(en){vis=en[0].isIntersecting;if(vis)Loop.go()}).observe(cv);
  function draw(t,fr){var dpr=dprCap(),w=Math.round(cv.clientWidth*dpr),h=Math.round(cv.clientHeight*dpr);if(!w||!h)return;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}
    var s=t*.001,c=rgb(signal()).join(','),R=Math.min(w,h)*.34*(1-fold.v*.25),cx=w*(.5+(ptr.x-.5)*.08),cy=h*(.5+(ptr.y-.5)*.08);
    if(reduce.matches){s=4;pulse=0;ptr.e=0}ptr.e*=Math.pow(.96,fr);pulse*=Math.pow(.93,fr);x.clearRect(0,0,w,h);
    var g=x.createRadialGradient(cx-R*.25,cy-R*.3,R*.05,cx,cy,R*1.05);g.addColorStop(0,'rgba(255,255,255,.85)');g.addColorStop(.22,'rgba('+c+',.9)');g.addColorStop(.6,'rgba(40,20,80,.9)');g.addColorStop(1,'rgba(10,10,15,0)');
    x.fillStyle=g;x.beginPath();x.arc(cx,cy,R*(1+Math.sin(s*1.85)*.03+pulse*.08),0,7);x.fill();
    x.lineWidth=dpr;for(var i=0;i<3;i++){var ph=((s/3.4)+i/3)%1;x.strokeStyle='rgba('+c+','+(.5*(1-ph))+')';x.beginPath();x.arc(cx,cy,R*(1+ph*.7),0,7);x.stroke()}
    x.strokeStyle='rgba('+c+',.35)';for(i=0;i<14;i++){var yy=cy+(i-6.5)*R*.13,k=Math.sqrt(Math.max(0,1-Math.pow((yy-cy)/R,2)))*R;var wob=Math.sin(s*2+i*.6)*(4+ptr.e*10+pulse*14)*dpr;x.beginPath();x.moveTo(cx-k,yy+wob);x.quadraticCurveTo(cx,yy-wob*1.5,cx+k,yy+wob);x.stroke()}}
  Loop.add({iv:1000/30,want:function(){return vis&&(dirty||!reduce.matches)},run:function(t,fr){dirty=false;draw(t,fr)}})}

/* ---------- Hero: WebGL solar system (vanilla, one fragment shader, analytic sphere impostors) ---------- */
var SOLAR_FS=[
'#ifdef GL_FRAGMENT_PRECISION_HIGH',
'precision highp float;',
'#else',
'precision mediump float;',
'#endif',
'uniform vec2 R;uniform float T,P,F;uniform vec3 A;uniform vec2 M;',
'uniform vec4 S[7];uniform vec2 O[6];uniform vec2 C0;uniform float K;uniform float B;uniform float D;uniform float Y;uniform float SC;',
'float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
'float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
' return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}',
/* band-limited fbm: octaves fade out once their feature size drops under ~3 px (px = sphere radius in pixels) */
'float fbm(vec3 p,float base,float px){float v=0.,a=.5,f=base,tot=0.;for(int i=0;i<5;i++){float w=clamp(px/(f*3.)-1.,0.,1.);v+=a*w*n3(p*f);tot+=a*w;p+=vec3(1.7,9.2,3.1);f*=2.;a*=.5;}return tot>0.?v/tot:.5;}',
'vec3 rotY(vec3 n,float a){float c=cos(a),s=sin(a);return vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);}',
'vec3 pal(float t){return .5+.5*cos(6.2832*(t+vec3(0.,.33,.67)));}',
'vec3 hotc(){return mix(A,vec3(1.),.45);}',
'vec3 shade(int id,vec3 n,vec3 L,float px,float t){',
' float nl=dot(n,L),lam=smoothstep(-.2,.75,nl),rim=pow(1.-n.z,2.5);vec3 hot=hotc();',
' if(id==0){vec3 q=rotY(n,t*.05);float w=fbm(q+vec3(0.,t*.03,0.),2.,px);float pl=fbm(q+w*.9+vec3(t*.02),3.,px);',
'  vec3 c=mix(A*.55,hot,smoothstep(.35,.7,pl));c=mix(c,vec3(1.,.98,.94),smoothstep(.62,.85,pl));float limb=.65+.35*pow(n.z,.5);return c*limb*(1.15+P*.5)+rim*hot*.6;}',
' if(id==1){vec3 q=rotY(n,t*.35);float lon=atan(q.x,q.z),lat=asin(clamp(q.y,-1.,1.));', /* soft posterised "low-poly" planet + AA graticule */
'  float steps=4.,lv=lam*steps;lv=(floor(lv)+smoothstep(.35,.65,fract(lv)))/steps;',
'  float lw=1.2/px;float gl1=1.-smoothstep(0.,lw*6.,abs(sin(lat*6.))),gl2=1.-smoothstep(0.,lw*6.,abs(sin(lon*5.))*max(cos(lat),.15));',
'  vec3 base=mix(vec3(.07,.06,.11),mix(A,vec3(.9),.15),lv);return base+max(gl1,gl2)*A*(.25+.55*lam)+rim*A*.35*lam;}',
' if(id==2){vec3 q=rotY(n,t*.18);float warp=fbm(q*vec3(1.,.3,1.)+vec3(t*.01,0.,0.),2.,px)-.5;float lat=q.y+warp*.18;', /* gas giant */
'  float b=.5+.5*sin(lat*14.),b2=.5+.5*sin(lat*33.+warp*4.);float fine=clamp(px/40.,0.,1.);',
'  vec3 c=mix(vec3(.93,.85,.76),mix(A,vec3(.95,.7,.55),.25),b);c=mix(c,vec3(.32,.18,.38),b2*.3*fine);',
'  vec2 sp=vec2(atan(q.x,q.z)-1.,q.y+.32)*vec2(.55,1.4);c=mix(c,mix(hot,vec3(1.,.6,.5),.3),smoothstep(.2,.1,length(sp))*.85);',
'  return c*(.08+lam*1.)+rim*mix(A,vec3(1.),.3)*.45*smoothstep(-.3,.4,nl);}',
' if(id==3){float fr=pow(1.-n.z,3.);vec3 H=normalize(L+vec3(0,0,1));float sp=pow(max(dot(n,H),0.),80.);', /* glass */
'  vec3 rd=refract(vec3(0,0,-1),n,.75);float inner=fbm(rd*1.5+vec3(t*.05),2.,px);',
'  vec3 body=vec3(.02,.02,.05)+A*.35*smoothstep(.35,.8,inner)*(1.-fr);float env=.5+.5*n.y;',
'  return body+mix(A*.8,vec3(1.),.35+.3*env)*fr*1.2+sp*1.4+A*.15*lam;}',
' if(id==4){vec3 q=rotY(n,t*.2);float fr=1.-n.z;float film=fr*1.4+fbm(q,1.5,px)*.5+t*.03;', /* iridescent thin film */
'  vec3 c=mix(pal(film),A,.25);return c*(.25+.85*lam)+pow(fr,3.)*vec3(.9)+pow(max(dot(n,normalize(L+vec3(0,0,1))),0.),40.)*.6;}',
' if(id==5){vec3 q=rotY(n,t*.1);float st=fbm(q*vec3(1.,4.,1.),1.5,px);vec3 c=mix(vec3(.58,.54,.64),mix(A,vec3(.8),.3),st);return c*(.06+lam)+rim*A*.5*lam;}', /* ringed */
' vec3 q=rotY(n,t*.3);float cr=fbm(q,3.,px);float pits=smoothstep(.55,.65,n3(q*7.))*clamp(px/25.,0.,1.);vec3 c=vec3(.62,.62,.68)*(.65+cr*.5)-pits*.18;return c*(.03+lam)+rim*A*.2;', /* moon */
'}',
'void main(){vec2 fc=gl_FragCoord.xy;float u=.5*min(R.x,R.y);vec2 p=(fc-.5*R)/u;float pxu=1./u;float t=mod(T,600.);',
' vec3 col=vec3(0.);float a=0.;float zbest=1e9;vec3 hot=hotc();vec3 of=vec3(0.);float ofa=0.;int ib=-1;',
' if(D>.5){vec2 q=p-C0;float neb=exp(-dot(q,q)*1.9)*.085+exp(-dot(q*vec2(.95,2.2),q*vec2(.95,2.2))*1.4)*.045;col+=mix(A,vec3(.48,.36,1.),.35)*neb;}',
' vec4 rs=S[5];vec2 rd=(p-rs.xy)/vec2(rs.w,rs.w*K*1.3);float rr=length(rd);float raa=pxu/rs.w*1.5;',
' float ring=smoothstep(1.4-raa,1.4+raa,rr)*(1.-smoothstep(2.25-raa,2.25+raa,rr));',
' ring*=.45+.35*sin(rr*16.)+.2*sin(rr*41.)*clamp(rs.w/pxu/50.,0.,1.);ring*=1.-.55*smoothstep(1.75,1.85,rr)*(1.-smoothstep(1.9,2.,rr));',
' bool ringFront=rd.y*Y<0.;',
' vec3 sun3=vec3(S[0].x,S[0].y,S[0].z);',
' for(int i=0;i<7;i++){vec4 s=S[i];vec2 d=(p-s.xy)/s.w;float r=length(d);float aa=1.5*pxu/s.w;',
'  if(i>0&&r>1.35+aa)continue;float px=s.w*u;', /* far from this planet: no halo, no surface -> skip the lighting maths */
'  vec2 wp=vec2((s.x-sun3.x)/SC,s.z);vec3 Ld=normalize(vec3(-wp.x,-Y*wp.y*K,wp.y*sqrt(max(1.-K*K,0.)))+vec3(0.,0.,.0001));',
'  if(i==0&&r>1.&&r<8.){float ang=atan(d.y,d.x);float cn=n3(vec3(cos(ang)*1.6,sin(ang)*1.6,t*.15));float cg=exp(-(r-1.)*(2.4-cn*.6-B*.5))*1.2*(1.+B*.5);',
'   col+=hot*cg*(.85+P);a=max(a,min(cg,1.)*.9);}',
'  else if(r>1.&&r<1.35&&s.z<zbest+.0){float lit=clamp(dot(normalize(vec3(d,0.)),Ld)*.5+.5,0.,1.);float halo=exp(-(r-1.)*(14.-B*4.))*(.35+B*.3)*lit;col+=mix(A,vec3(1.),.3)*halo;a=max(a,halo);}',
'  if(r<1.+aa&&s.z<zbest){float dd=min(dot(d,d),1.);vec3 n=vec3(d,sqrt(1.-dd));',
'   float edge=1.-smoothstep(1.-aa,1.+aa,r);vec3 c=shade(i,n,Ld,px,t);col=mix(col,c,edge);a=max(a,edge);if(edge>.5){zbest=s.z;ib=i;}}',
' }',
' for(int i=0;i<6;i++){vec2 o=O[i];if(o.x<=0.)continue;vec2 d=p-C0;vec2 e=d/vec2(o.x,o.x*K);float r=length(e);',
'  float dist=abs(r-1.)*o.x*K;if(dist>pxu*12.)continue;float ang=atan(e.y,e.x);float lag=mod(o.y-ang,6.2832);float trail=exp(-lag*1.3);',
'  float wdt=pxu*(1.+trail*1.5);float line=exp(-dist*dist/(wdt*wdt))*(.14+trail*.8*(1.+B*.6));vec3 lc=mix(A,vec3(1.),trail*.35)*line;',
'  float lz=e.y*Y*o.x/SC;if(lz<zbest){col+=lc;a+=line*.6;}}', /* depth-tested: far half hides behind sun/planets, near half passes in front */
' bool ringVis=ib==5?ringFront:(ringFront?rs.z-.02<zbest:rs.z+.02<zbest);',
' if(ring>0.&&ringVis&&(ib!=5||ringFront)){col+=mix(A,vec3(1.),.45)*ring*.55;a=max(a,ring*.6);}',
' if(D>.5){vec2 uv=fc/R;float vg=smoothstep(0.,.22,uv.x)*smoothstep(1.,.86,uv.x)*smoothstep(0.,.16,uv.y)*smoothstep(1.,.84,uv.y);col*=vg;a*=vg;}',
' a=clamp(a,0.,1.);gl_FragColor=vec4(min(col,vec3(1.)),a);}'
].join('\n');
function initSolar(){var cv=$('.pulse-shader');if(!cv)return false;var gl,soft=false;
  /* antialias off: the shader already smooths every edge itself (smoothstep over 1.5 px), MSAA only adds fill cost.
     failIfMajorPerformanceCaveat: a null context here means a software rasteriser (no GPU) */
  var ca={premultipliedAlpha:true,antialias:false,alpha:true,powerPreference:'low-power'};
  try{gl=cv.getContext('webgl',Object.assign({failIfMajorPerformanceCaveat:true},ca));if(!gl){soft=true;gl=cv.getContext('webgl',ca)||cv.getContext('experimental-webgl',ca)}}catch(e){}
  if(!gl)return false;
  try{var rn=String(gl.getParameter(gl.RENDERER));if(/^webkit/i.test(rn)){var ri=gl.getExtension('WEBGL_debug_renderer_info');if(ri)rn=String(gl.getParameter(ri.UNMASKED_RENDERER_WEBGL))}
    if(/swiftshader|llvmpipe|softpipe|software|basic render/i.test(rn))soft=true}catch(e){}
  /* compile two frames later: the new canvas is presented once, and that present would otherwise wait for the compile */
  requestAnimationFrame(function(){requestAnimationFrame(function(){if(!setup())cv.dataset.fallback='1'})});cv.dataset.webgl='1';return true;
  function setup(){
  function sh(t,src){var s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(s));return null}return s}
  var vs=sh(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'),fs=sh(gl.FRAGMENT_SHADER,SOLAR_FS);if(!vs||!fs)return false;
  function prog(v,f){var q=gl.createProgram();gl.attachShader(q,v);gl.attachShader(q,f);gl.bindAttribLocation(q,0,'p');gl.linkProgram(q);return gl.getProgramParameter(q,gl.LINK_STATUS)?q:null}
  var pr=prog(vs,fs);if(!pr)return false;gl.useProgram(pr);
  var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  gl.disable(gl.BLEND);
  var U={};['R','T','P','F','A','M','S','O','C0','K','B','D','Y','SC'].forEach(function(k){U[k]=gl.getUniformLocation(pr,k)});
  // planets: id, orbit a, radius, speed, phase  (id5 ringed, id6 moon of gas giant id2)
  var PL=[[1,.4,.082,.9,0],[2,.6,.162,.42,2.1],[3,.78,.105,.3,4.2],[4,.93,.094,.22,1.0],[5,1.1,.115,.15,3.3]];var beatS=0,ampS=0;
  var ptr={x:0,y:0,tx:0,ty:0},pulse=0,vis=true,dirty=true,acc=rgb(signal()),t0=performance.now();
  /* static frame (no animation loop) with reduced motion, or when WebGL runs on the CPU: every frame of this shader
     would then cost hundreds of ms of main-thread time. The frame is redrawn only on resize / scroll / accent changes. */
  function still(){return soft||reduce.matches}
  var T_STILL=4.2,BAND_PX=small.matches?1.2e4:3e4;
  /* software path: presenting a WebGL frame makes the compositor read the canvas back and wait (ReadPixels) until the
     CPU rasteriser has finished the whole shader - that wait was the ~0.3-0.75 s main-thread task (x4 under Lighthouse's
     mobile CPU throttling = ~1.2 s). So the still frame is rendered offscreen in horizontal bands, one band (~12k px on phones, ~30k px otherwise) per 40 ms;
     a 1-pixel readPixels makes each band rasterise on its own (a few ms) instead of all at once on present (ANGLE keeps
     the render pass open otherwise, and finish() is only a flush in Chrome); a 1-pixel warm-up draw first lets the one-off shader compile finish in the background, and the canvas is only resized at the final copy (a resize forces a present, which would wait for it). Then one cheap copy
     to the canvas. Same image, no long task. */
  var fb=null,tex=null,bp=null,band=0,bw=0,bh=0,tw=0,th=0,warm=false,px1=new Uint8Array(4);
  if(soft){var bvs=sh(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}'),
      bfs=sh(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D X;varying vec2 v;void main(){gl_FragColor=texture2D(X,v);}');
    bp=bvs&&bfs?prog(bvs,bfs):null;if(bp){tex=gl.createTexture();fb=gl.createFramebuffer();gl.bindTexture(gl.TEXTURE_2D,tex);
      ['TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER'].forEach(function(k){gl.texParameteri(gl.TEXTURE_2D,gl[k],gl.NEAREST)});
      ['TEXTURE_WRAP_S','TEXTURE_WRAP_T'].forEach(function(k){gl.texParameteri(gl.TEXTURE_2D,gl[k],gl.CLAMP_TO_EDGE)})}}
  function banded(){return !!bp&&still()}
  function redraw(){dirty=true;Loop.go()}
  /* desktop (>=1024px): camera above the plane (far side up, planets pass behind/in front of the sun), steeper tilt, nebula glow, near orbit arcs over the sun */
  var desk=window.matchMedia('(min-width:1024px)');var MOY=-.2;if(desk.addEventListener)desk.addEventListener('change',redraw);
  var lw=0,lh=0;if(window.ResizeObserver)new ResizeObserver(function(){if(cv.clientWidth!==lw||cv.clientHeight!==lh)redraw()}).observe(cv);
  window.addEventListener('imtrtd-accent',function(){acc=rgb(signal());pulse=1;redraw()});
  fold.on=function(){if(still())redraw()};
  cv.addEventListener('pointermove',function(e){var r=cv.getBoundingClientRect();ptr.tx=(e.clientX-r.left)/r.width-.5;ptr.ty=(e.clientY-r.top)/r.height-.5});
  cv.addEventListener('pointerleave',function(){ptr.tx=ptr.ty=0});
  cv.addEventListener('pointerdown',function(){pulse=1});
  new IntersectionObserver(function(en){vis=en[0].isIntersecting;if(vis)Loop.go()}).observe(cv);
  if(reduce.addEventListener)reduce.addEventListener('change',redraw);
  function prep(t,fr){var st=still(),dpr=dprCap(),cw=lw=cv.clientWidth,ch=lh=cv.clientHeight,bud=small.matches||soft?1e6:1.6e6;
    if(cw*ch*dpr*dpr>bud)dpr=Math.max(Math.min(1,dpr),Math.sqrt(bud/(cw*ch)));
    var w=Math.round(cw*dpr),h=Math.round(ch*dpr);if(!w||!h)return false;tw=w;th=h;if(!banded()&&(cv.width!==w||cv.height!==h)){cv.width=w;cv.height=h}gl.viewport(0,0,w,h);
    /* easing is scaled by elapsed frames (fr), so the 30 fps cap keeps the same speed as the old 60 fps loop */
    var dk=desk.matches,ys=dk?1:-1,T=st?T_STILL:(t-t0)/1000;
    if(st){ptr.x=ptr.y=0;pulse=0}else{ptr.x+=(ptr.tx-ptr.x)*(1-Math.pow(.94,fr));ptr.y+=(ptr.ty-ptr.y)*(1-Math.pow(.94,fr));pulse*=Math.pow(.94,fr)}
    var K=(dk?.4:.36)+ptr.y*(dk?.1:.12),uu=.5*Math.min(w,h),oa=dk?.1:0,sr=dk?.34:.28,fit=dk?Math.min(innerWidth*.66*(1-fold.v*.3)*dpr*.5/1.62*1.36,(h*.5)/(K*1.2+.3))/uu:Math.min(Math.min(cw*.45,252)*dpr,(h*.5)/(K*1.1+.42))/uu;
    var lv=Audio_.on&&!st?Audio_.levels():{beat:0,amp:0},rm=reduce.matches?.4:1;
    beatS+=((lv.beat)-beatS)*(1-Math.pow(1-(lv.beat>beatS?.6:.18),fr));ampS+=(lv.amp-ampS)*(1-Math.pow(1-(lv.amp>ampS?.25:.06),fr));
    var B=(beatS*.75+ampS*.45)*rm+(Audio_.on?0:(.5+.5*Math.sin(T*1.1))*.12*rm);
    var ox=0;if(dk){var br=cv.getBoundingClientRect();ox=((innerWidth*(.655+fold.v*.07)-br.left)*dpr-w*.5)/uu}
    var sc=fit*(1+pulse*.04),cx=ox+ptr.x*.12,cy=-ptr.y*.06+(dk?0:MOY),bs=1+B*.035;
    var S=[cx,cy,0,sr*sc*(1+pulse*.15)*bs],O=[],pos={};
    // orbit angle in ellipse-normalized space: angle of (x,-z) since e=d/(a,aK)
    PL.forEach(function(q){var qa=q[1]+oa*(1-q[1]*.35),th=q[4]+T*q[3],x=Math.cos(th)*qa,z=Math.sin(th)*qa,persp=1-z*.18;pos[q[0]]=[cx+x*sc,cy+ys*z*K*sc,z,q[2]*sc*persp*(1+B*.02)];S.push.apply(S,pos[q[0]]);O.push(qa*sc,Math.atan2(ys*Math.sin(th),Math.cos(th)))});O.push(0,0);
    var g=pos[2],mt=T*1.6,m=[g[0]+Math.cos(mt)*g[3]*1.9,g[1]+ys*Math.sin(mt)*g[3]*1.9*K,g[2]+Math.sin(mt)*.05,.04*sc];S.push.apply(S,m);
    gl.useProgram(pr);
    gl.uniform2f(U.R,w,h);gl.uniform1f(U.T,T);gl.uniform1f(U.P,pulse);gl.uniform1f(U.F,fold.v);gl.uniform3f(U.A,acc[0]/255,acc[1]/255,acc[2]/255);gl.uniform2f(U.M,ptr.x,ptr.y);
    gl.uniform4fv(U.S,S);gl.uniform2fv(U.O,O);gl.uniform2f(U.C0,cx,cy);gl.uniform1f(U.K,K);gl.uniform1f(U.B,B);gl.uniform1f(U.D,dk?1:0);gl.uniform1f(U.Y,ys);gl.uniform1f(U.SC,sc);return true}
  function draw(t,fr){if(!prep(t,fr))return;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3)}
  function drawBand(){var w=tw,h=th,n=Math.min(h,Math.ceil(w*h/BAND_PX)),y0=Math.floor(h*band/n),y1=Math.floor(h*(band+1)/n);
    if(!warm){y1=y0+1}
    if(band===0&&(bw!==w||bh!==h)){bw=w;bh=h;gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0)}
    gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.useProgram(pr);gl.enable(gl.SCISSOR_TEST);gl.scissor(0,y0,w,y1-y0);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.SCISSOR_TEST);
    if(!warm){warm=true;dirty=true;gl.flush();return 300}if(band>0)gl.readPixels(0,y0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px1);
    band++;if(band<n)return 0;band=0;gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}gl.viewport(0,0,w,h);gl.useProgram(bp);gl.bindTexture(gl.TEXTURE_2D,tex);gl.drawArrays(gl.TRIANGLES,0,3);return 0}
  /* 30 fps while animating; a still frame is redrawn only when something changed (banded on the software path) */
  var job={iv:1000/30,want:function(){return vis&&(dirty||band>0||!still())},run:function(t,fr){
    if(banded()){job.iv=40;if(dirty){dirty=false;band=0;if(!prep(t,fr))return}job.last+=drawBand();return}
    job.iv=1000/30;band=0;dirty=false;draw(t,fr)}};
  Loop.add(job);if(soft)cv.dataset.soft='1';return true}}

/* ---------- Project preview frames: "Opening …" label fades on load ---------- */
function initFrames(){$$('iframe.preview-frame').forEach(function(f){var lbl=f.parentNode.querySelector('.opening-label');function done(){f.classList.add('is-loaded');if(lbl)lbl.classList.add('is-hidden')}f.addEventListener('load',done);try{if(f.contentDocument&&f.contentDocument.readyState==='complete'&&f.contentDocument.body&&f.contentDocument.body.childNodes.length)done()}catch(e){done()}setTimeout(done,2500)})}

function boot(){initSwitcher();initSound();initCosmos();initHero();initFrames()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
