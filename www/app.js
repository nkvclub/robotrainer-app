(function(){
'use strict';
var CFG=window.RT_CONFIG, L=window.RT_I18N;
var Cap=window.Capacitor, P=(Cap&&Cap.Plugins)||{};
var isNative=!!(Cap&&Cap.isNativePlatform&&Cap.isNativePlatform());
var $=function(id){return document.getElementById(id);};

/* ---------- storage (Preferences in the app, localStorage in a browser) ---------- */
var store={
  get:function(k){
    if(P.Preferences)return P.Preferences.get({key:k}).then(function(r){return r.value?JSON.parse(r.value):null;}).catch(function(){return null;});
    try{var v=localStorage.getItem(k);return Promise.resolve(v?JSON.parse(v):null);}catch(e){return Promise.resolve(null);}
  },
  set:function(k,v){
    var s=JSON.stringify(v);
    if(P.Preferences)return P.Preferences.set({key:k,value:s}).catch(function(){});
    try{localStorage.setItem(k,s);}catch(e){}return Promise.resolve();
  }
};
/* ---------- usage counter: which buttons people press, nothing personal ----------
   One batch per app session: app version, language, platform and a list of [event, seconds since open].
   No email, no results, no device or user id. Off while CFG.ANALYTICS_ENDPOINT is empty. */
var EV=[],evT0=Date.now();
function track(e){if(EV.length<200)EV.push([e,Math.round((Date.now()-evT0)/1000)]);}
function sendTrack(){var url=CFG.ANALYTICS_ENDPOINT;if(!url||!EV.length)return;
  var body=JSON.stringify({key:CFG.EMAIL_KEY,v:CFG.version,lang:lang,os:(window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform())||'web',ev:EV});
  EV=[];try{fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true}).catch(function(){});}catch(e){}}
document.addEventListener('visibilitychange',function(){if(document.hidden){sendTrack();if(!run&&!EX.on)awake(false);if(ac)ac.suspend();}});
var S={lang:null,snd:true,vib:true,warned:false,rem:false,remDay:1,remTime:'09:00'};
var history=[];

/* ---------- language ---------- */
var lang='ru',D=L.ru;
function pickLang(){var n=(navigator.language||'ru').toLowerCase();return n.indexOf('ru')===0||n.indexOf('uk')===0||n.indexOf('be')===0||n.indexOf('kk')===0?'ru':'en';}
function applyTexts(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-t]').forEach(function(el){var v=D[el.getAttribute('data-t')];if(typeof v==='string')el.textContent=v;});
  var h1=document.querySelector('#scrTest h1');h1.innerHTML='';h1.classList.remove('words');
  D.h1.split(' ').forEach(function(w,i){var sp=document.createElement('span');sp.textContent=w;sp.style.animationDelay=(120+i*90)+'ms';h1.appendChild(sp);h1.appendChild(document.createTextNode(' '));});
  void h1.offsetWidth;h1.classList.add('words');
  $('howList').innerHTML='';D.howL.forEach(function(t){var li=document.createElement('li');li.textContent=t;$('howList').appendChild(li);});
  $('warnList').innerHTML='';D.warnL.forEach(function(t){var li=document.createElement('li');li.textContent=t;$('warnList').appendChild(li);});
  $('lru').setAttribute('aria-pressed',lang==='ru');$('len').setAttribute('aria-pressed',lang==='en');
  $('privLink').href=CFG.PRIVACY_URL[lang];$('consentLink').href=CFG.PRIVACY_URL[lang];$('siteLink').href=CFG.SITE_URL[lang];$('payPriv').href=CFG.PRIVACY_URL[lang];if(window.payRender)payRender();
  $('ver').textContent=D.ver+' '+CFG.version;
  if(P.App&&P.App.getInfo&&!CFG.nativeVer)P.App.getInfo().then(function(i){CFG.version=i.version;CFG.nativeVer=true;$('ver').textContent=D.ver+' '+i.version;}).catch(function(){});  // show the store version, not the web one
  var sd=$('sDay');sd.innerHTML='';[1,2,3,4,5,6,0].forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=D.days[d];sd.appendChild(o);});sd.value=S.remDay;
}

/* ---------- screen stays on only while a test is going: released after the result, on restart, when the app is hidden, or after 2 idle minutes ---------- */
var awakeT=0;
function awake(on){clearTimeout(awakeT);if(!P.KeepAwake)return;
  if(on){P.KeepAwake.keepAwake().catch(function(){});awakeT=setTimeout(function(){if(!run)awake(false);},120000);}
  else P.KeepAwake.allowSleep().catch(function(){});}
/* ---------- feedback: sound + vibration ---------- */
var ac=null,acT=0;  // the sound chip sleeps after a quiet minute or when the app is hidden (battery); never during a hold or rest, so timer beeps always sound
function beep(f){
  if(S.snd){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();clearTimeout(acT);acT=setTimeout(function(){if(ac&&!run&&!restT&&!EX.on)ac.suspend();},60000);var o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;g.gain.setValueAtTime(.15,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.25);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.25);}catch(e){}}
  if(S.vib){if(P.Haptics){P.Haptics.impact({style:'MEDIUM'}).catch(function(){});}else{try{navigator.vibrate&&navigator.vibrate(60);}catch(e){}}}
}

/* ---------- screens ---------- */
function go(id){track('tab_'+id);if(id==='scrTest'&&S.warned&&!S.howSeen)setTimeout(openHow,300);
  ['scrWarn','scrTest','scrEx','scrHist','scrSet'].forEach(function(s){$(s).hidden=s!==id;});
  $('tabs').hidden=id==='scrWarn'||id==='scrEx';  // the exercise has its own way out
  document.querySelectorAll('#tabs button').forEach(function(b){b.toggleAttribute('aria-current',b.dataset.go===id);if(b.dataset.go===id)b.setAttribute('aria-current','page');});
  if(id==='scrHist')renderHistory();
  window.scrollTo(0,0);
}
document.querySelectorAll('#tabs button').forEach(function(b){b.addEventListener('click',function(){if(run)return;go(b.dataset.go);});});

/* ---------- test (same algorithm as robotrainer.ru / robotrainerpro.com) ---------- */
var LOCK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
var ORDER=['inhale','exhale','load'],CV=['--red','--orange','--green'];
function col(l){return getComputedStyle(document.documentElement).getPropertyValue(CV[l]).trim();}
function acc(){return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();}
var mode='inhale',run=false,t0=0,raf=0,rest=0,ts={},lv={},rows={},finished=false;
var prg=$('prg'),box=$('box'),C=339.3;
var REST=30,restT=0,restLeft=0;  // calm breathing before the exhale hold, counted down automatically
function level(s,m){if(m==='inhale')return s>=50?2:(s>=40?1:0);if(m==='exhale')return s>70?2:(s>=25?1:0);var p=s/rest*100;return p>50?2:(p>=30?1:0);}
function full(m){return 50;}  // one speed on all 3 steps: a ring lap is 50 s, a bit faster than a stopwatch (Nov). Only the look; times stay real seconds
function barFull(m){return m==='inhale'?60:(m==='exhale'?80:rest*0.6);}  // result bars keep their own scale
function fmt(s){var t=s.toFixed(1);return lang==='ru'?t.replace('.',','):t;}
function name(m){return D.N[m];}
function paintRow(m,s,count){var r=rows[m],l=level(s,m),c=col(l);r.fill.style.background=c;r.fill.style.width=Math.round(Math.min(s/barFull(m),1)*100)+'%';r.wd.style.color=c;
  var txt=function(v){return Math.round(v)+' '+D.sec+' · '+D.W[m][l];};
  if(!count){r.wd.textContent=txt(s);return;}
  var a=performance.now();(function step(){var k=Math.min((performance.now()-a)/900,1);r.wd.textContent=txt(s*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(step);})();}
function show(){
  $('calcBtn').hidden=finished||ORDER.some(function(k){return ts[k]===undefined;});
  $('restartBtn').hidden=finished||!(lastDone()||run);$('stepBtn').hidden=finished||!(lastDone()||run);
  ORDER.forEach(function(m,i){var ok=ts[m]!==undefined,r=rows[m];
    r.row.classList.toggle('act',m===mode&&!ok);r.row.classList.toggle('ok',ok);r.row.classList.toggle('locked',!ok&&m!==mode);
    if(finished)return;
    if(!run){r.wd.style.color='';r.wd.textContent=ok?D.doneT:(m===mode?D.yourT:'');}
    r.rl.textContent=(!ok&&m!==mode)?D.stepT+' '+(i+1):name(m);
    r.num.innerHTML=ok?'✓':((m!==mode)?LOCK:String(i+1));
    r.rd.textContent=(m===mode&&!ok)?(m==='load'&&!sqN?D.sqAsk:D.T[m]):'';
    if(r.sq)r.sq.hidden=!(m===mode&&!ok);});
}
function resetRing(){prg.style.transition='';prg.style.stroke='';box.className='ringbox idle showface';box.style.setProperty('--puff',0);prg.style.strokeDashoffset=C;$('time').textContent=fmt(0);$('lbl').textContent=D.start;}
function stopRest(){if(restT){clearInterval(restT);restT=0;}box.classList.remove('rest','ready');}
function mmss(n){return Math.floor(n/60)+':'+('0'+n%60).slice(-2);}
var cd={sec:REST,calm:'restCalm',soon:'restSoon',go:'restGo'},sqN=0;
function startRest(o){cd=o||{sec:REST,calm:'restCalm',soon:'restSoon',go:'restGo'};var TOT=cd.sec;stopRest();restLeft=TOT;box.className='ringbox idle rest';prg.style.stroke=acc();
  var paint=function(){$('time').textContent=mmss(restLeft);prg.style.strokeDashoffset=C*(1-restLeft/TOT);
    $('lbl').textContent=restLeft>10?D[cd.calm]:(restLeft>0?D[cd.soon]:D[cd.go]);};
  paint();
  var end=Date.now()+TOT*1000,warned=false;  // wall clock, so a dimmed screen doesn't slow it down
  restT=setInterval(function(){restLeft=Math.max(0,Math.ceil((end-Date.now())/1000));
    if(restLeft<=10&&!warned){warned=true;beep(520);}
    if(restLeft<=0){clearInterval(restT);restT=0;restLeft=0;beep(880);setTimeout(function(){beep(880);},250);
      box.className='ringbox idle showface ready';prg.style.strokeDashoffset=C;}
    paint();},250);}
function pick(m){if(run)return;mode=m;stopRest();resetRing();show();
  if(m==='exhale'&&ts.exhale===undefined)startRest();
  if(m==='load'&&ts.load===undefined)sqPaint();
  $('scrTest').classList.toggle('started',ts.inhale!==undefined&&!finished);
  if(ts.inhale!==undefined)setTimeout(function(){window.scrollTo({top:0,behavior:'smooth'});},50);}  // after step 1 the headline hides, so circle and current step fit on one screen
ORDER.forEach(function(m){var row=document.createElement('div');row.className='row';row.innerHTML='<div class="num"></div><div class="rl"></div><div class="rw"></div><div class="rd"></div><div class="bar"><div class="fill"></div></div>';$('bars').appendChild(row);rows[m]={row:row,fill:row.querySelector('.fill'),wd:row.querySelector('.rw'),rl:row.querySelector('.rl'),rd:row.querySelector('.rd'),num:row.querySelector('.num')};});
// Step 3: after the squats the person types how many they did, then the START command appears
(function(){var w=document.createElement('label');w.className='sqin';w.hidden=true;w.innerHTML='<span id="sqDid"></span><input type="number" inputmode="numeric" min="1" max="100" placeholder="?" id="sqNum"><span id="sqUnit"></span>';
  rows.load.rd.after(w);rows.load.sq=w;w.addEventListener('click',function(e){e.stopPropagation();});
  var inp=w.querySelector('input');
  inp.addEventListener('input',function(){var v=parseInt(inp.value,10);sqN=(v>0&&v<=100)?v:0;sqPaint();show();});
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'){inp.blur();}});})();
function sqPaint(){if(mode!=='load'||run||ts.load!==undefined)return;$('sqUnit').textContent=D.sqUnit;$('sqDid').textContent=D.sqDid;
  box.classList.toggle('ready',!!sqN);$('lbl').textContent=sqN?D.start:D.sqFirst;}
function newTest(){stopRest();sqN=0;$('sqNum').value='';ts={};lv={};rest=0;finished=false;$('bars').classList.remove('results');$('out').hidden=true;$('againBtn').hidden=true;ORDER.forEach(function(m){rows[m].fill.style.width='0';});pick('inhale');}
function tick(){var s=(performance.now()-t0)/1000;box.style.setProperty('--puff',Math.min(s/full(mode),1).toFixed(3));prg.style.stroke=acc();prg.style.strokeDashoffset=C*(1-(s%full(mode))/full(mode));rows[mode].wd.textContent=D.going;raf=requestAnimationFrame(tick);}
function overall(){var a=(lv.inhale+lv.exhale+lv.load)/3;return a>=1.5?2:(a>=.6?1:0);}
function buildResult(o){
  var out=$('out');out.innerHTML='';out.classList.remove('reveal');
  var hd=document.createElement('div');hd.className='sumh';hd.textContent=D.sumH;out.appendChild(hd);
  var b=document.createElement('div');b.className='badge';b.textContent=D.B[o];b.style.background=col(o);out.appendChild(b);
  var t=document.createElement('div');t.textContent=D.M[o];out.appendChild(t);
  if(lv.inhale>lv.exhale){var c2=document.createElement('div');c2.className='co2';c2.textContent=D.co2;out.appendChild(c2);}
  if(ts.exhale>=5&&!EX.on){var ex=document.createElement('div');ex.className='exbox';var eq=document.createElement('div');eq.className='ctah';eq.textContent=D.X.q;ex.appendChild(eq);var eb=document.createElement('button');eb.type='button';eb.className='cta';eb.textContent=D.X.btn;eb.addEventListener('click',exOpen);
    var es=document.createElement('div');es.className='ctasub';es.textContent=D.X.btnSub;ex.appendChild(eb);ex.appendChild(es);out.appendChild(ex);}
  var bx=document.createElement('div');bx.className='ctabox';
  [['ctah',D.ctaH],['ctasub',D.ctaSub]].forEach(function(p){var e=document.createElement('div');e.className=p[0];e.textContent=p[1];bx.appendChild(e);});
  var c=document.createElement('button');c.type='button';c.className='again';c.textContent=D.cta;c.addEventListener('click',openEmail);bx.appendChild(c);out.appendChild(bx);
}
function sparks(){var n=16;for(var i=0;i<n;i++){var p=document.createElement('i');p.className='spark';
  var a=i/n*Math.PI*2+Math.random()*.3,d=58+Math.random()*16;p.style.setProperty('--x',(Math.cos(a)*d).toFixed(1)+'%');p.style.setProperty('--y',(Math.sin(a)*d).toFixed(1)+'%');
  p.style.animationDelay=Math.round(Math.random()*160)+'ms';if(i%3===0)p.classList.add('gold');box.appendChild(p);setTimeout(function(p){p.remove();}.bind(null,p),1700);}}
function ringReveal(o){if(o===2)setTimeout(sparks,500);box.className='ringbox idle done lv'+o;prg.style.transition='stroke .4s, stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)';prg.style.stroke=col(o);prg.style.strokeDashoffset=0;$('lbl').textContent=D.B[o];}
function summary(anim){
  var o=overall();finished=true;$('restartBtn').hidden=true;$('stepBtn').hidden=true;rows.load.sq.hidden=true;$('scrTest').classList.remove('started');$('bars').classList.add('results');
  ORDER.forEach(function(k,i){var r=rows[k];r.row.classList.remove('act','ok','locked');r.rl.textContent=name(k);r.num.textContent=String(i+1);r.rd.textContent='';
    if(anim){r.fill.style.width='0';r.wd.textContent='';setTimeout(function(){paintRow(k,ts[k],true);},1500+i*450);}else paintRow(k,ts[k]);});
  buildResult(o);
  if(anim){$('out').hidden=true;$('lbl').textContent=D.calc;box.className='ringbox showface';
    setTimeout(function(){ringReveal(o);},1300);
    setTimeout(function(){$('out').hidden=false;$('out').classList.add('reveal');$('againBtn').hidden=false;var cb=$('out').querySelector('.ctabox');(cb||$('out')).scrollIntoView({behavior:'smooth',block:'center'});},2050+3*450);}
  else{$('out').hidden=false;$('againBtn').hidden=false;ringReveal(o);}
}
function saveResult(){
  history.unshift({d:Date.now(),ts:{inhale:ts.inhale,exhale:ts.exhale,load:ts.load},sq:sqN,o:overall()});
  history=history.slice(0,200);store.set('history',history);
}
$('btn').addEventListener('click',function(){
  if(finished){newTest();window.scrollTo({top:0,behavior:'smooth'});return;}  // tap the face again = new test
  if(!run){
    if(mode==='load'&&!sqN){var i=$('sqNum'),w=rows.load.sq;w.classList.remove('nudge');void w.offsetWidth;w.classList.add('nudge');i.focus();return;}  // number of squats first
    track(restT?'rest_skip':'start_'+mode);stopRest();
    run=true;$('scrTest').classList.add('started');$('stepBtn').hidden=false;$('restartBtn').hidden=false;rows[mode].rd.textContent=D.holdT;if(rows[mode].sq)rows[mode].sq.hidden=true;t0=performance.now();box.className='ringbox hold';$('lbl').textContent=D.stop;beep(660);raf=requestAnimationFrame(tick);
    awake(true);
  }else{
    run=false;cancelAnimationFrame(raf);$('restartBtn').hidden=!lastDone();$('stepBtn').hidden=!lastDone();var s=(performance.now()-t0)/1000,m=mode;
    box.className='ringbox idle done '+(s<5?'lvx':'mid');box.style.setProperty('--puff',0);prg.style.strokeDashoffset=C;beep(330);
    track((s<5?'short_':'done_')+m);
    if(s<5){show();rows[m].wd.textContent=D.short;rows[m].wd.style.color='';$('lbl').textContent=D.again;return;}
    if(m==='inhale')rest=s;
    ts[m]=s;lv[m]=level(s,m);rows[m].wd.textContent=D.doneT;
    var next=ORDER.filter(function(k){return ts[k]===undefined;})[0];
    if(next){$('lbl').textContent=D.nextT;show();setTimeout(function(){pick(next);},800);}
    else{show();$('lbl').textContent=D.calcReady;$('calcBtn').hidden=false;setTimeout(function(){$('calcBtn').scrollIntoView({behavior:'smooth',block:'nearest'});},300);}
  }
});
// Tap the current step card = same as the big button; locked cards just wiggle
ORDER.forEach(function(m){rows[m].row.addEventListener('click',function(e){
  if(finished)return;var r=rows[m].row;
  if(r.classList.contains('act')){if(!e.target.closest('.cbtn'))return;track('card_tap');$('btn').click();return;}
  if(r.classList.contains('locked')){track('locked_tap');r.classList.remove('nudge');void r.offsetWidth;r.classList.add('nudge');}});});
// Repeat the last finished step (person made a mistake), like the reset button on a phone timer
function lastDone(){return ORDER.filter(function(k){return ts[k]!==undefined;}).pop();}
function cancelHold(){run=false;cancelAnimationFrame(raf);box.style.setProperty('--puff',0);}
$('stepBtn').addEventListener('click',function(){if(finished)return;
  if(run){track('step_cancel_'+mode);cancelHold();pick(mode);return;}  // during a hold: start this step over
  var k=lastDone();if(!k)return;track('step_again_'+k);
  delete ts[k];delete lv[k];if(k==='inhale')rest=0;rows[k].fill.style.width='0';rows[k].wd.textContent='';pick(k);});
$('calcBtn').addEventListener('click',function(){if(run||finished)return;$('calcBtn').hidden=true;awake(false);saveResult();window.scrollTo({top:0,behavior:'smooth'});summary(true);track('finished');sendTrack();});
$('restartBtn').addEventListener('click',function(){if(run)cancelHold();track('restart');newTest();awake(false);window.scrollTo(0,0);});
$('againBtn').addEventListener('click',function(){track('again');newTest();window.scrollTo(0,0);});

/* ---------- history ---------- */
function renderHistory(){
  var box2=$('histList');box2.innerHTML='';
  if(!history.length){var e=document.createElement('div');e.className='empty';
    e.innerHTML='<img src="img/logo.png" alt="" width="72" height="72"><p></p>';e.querySelector('p').textContent=D.histEmpty;
    var gb=document.createElement('button');gb.type='button';gb.className='cta';gb.textContent=D.histGo;gb.addEventListener('click',function(){go('scrTest');});e.appendChild(gb);box2.appendChild(e);return;}
  var wrap=document.createElement('div');wrap.style.display='flex';wrap.style.flexDirection='column';wrap.style.gap='14px';
  var sm=document.createElement('div');sm.className='hsum';
  var cell=function(k,v,c,cls){var d=document.createElement('div');d.className='hs'+(cls?' '+cls:'');var b=document.createElement('b');b.textContent=v;if(c)b.style.color=c;var t=document.createElement('span');t.textContent=k;d.appendChild(b);d.appendChild(t);sm.appendChild(d);};
  cell(D.histN,String(history.length));cell(D.histLast,D.B[history[0].o],col(history[0].o),'hlv');
  if(history.length>1){var df=Math.round(history[0].ts.exhale-history[1].ts.exhale);cell(D.histTrend,(df>0?'+':'')+df+' '+D.sec,df>0?col(2):(df<0?col(0):''));}
  wrap.appendChild(sm);
  history.forEach(function(h,hi){
    var c=document.createElement('div');c.className='card hcard';c.style.setProperty('--lv',col(h.o));c.style.animationDelay=Math.min(hi,8)*70+'ms';
    var top=document.createElement('div');top.className='hist-top';
    var dt=document.createElement('div');dt.className='hist-date';dt.textContent=new Date(h.d).toLocaleString(lang==='ru'?'ru-RU':'en-US',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
    var b=document.createElement('div');b.className='badge';b.textContent=D.B[h.o];b.style.background=col(h.o);
    top.appendChild(dt);top.appendChild(b);c.appendChild(top);
    var saved=rest;rest=h.ts.inhale;
    ORDER.forEach(function(m){var s=h.ts[m],l=level(s,m);
      var g=document.createElement('div');g.className='hb';
      var n=document.createElement('div');n.textContent=name(m);
      var v=document.createElement('div');v.className='v';v.textContent=Math.round(s)+' '+D.sec;v.style.color=col(l);
      var bar=document.createElement('div');bar.className='bar';var f=document.createElement('div');f.className='fill';f.style.background=col(l);f.style.width='0';(function(f,w,d){setTimeout(function(){f.style.width=w;},250+d);})(f,Math.round(Math.min(s/barFull(m),1)*100)+'%',Math.min(hi,8)*70);bar.appendChild(f);
      g.appendChild(n);g.appendChild(v);g.appendChild(bar);c.appendChild(g);});
    if(h.ex>0){var xe=document.createElement('div');xe.className='hex';xe.textContent=X('hist',{b:h.ex});c.appendChild(xe);}
    rest=saved;wrap.appendChild(c);});
  box2.appendChild(wrap);
}

/* ---------- settings + reminders ---------- */
function saveS(){store.set('settings',S);}
function setLang(l){if(run)return;lang=l;D=L[l];S.lang=l;saveS();applyTexts();if(finished){summary(false);}else{pick(mode);}}
$('lru').addEventListener('click',function(){setLang('ru');});$('len').addEventListener('click',function(){setLang('en');});
$('sSnd').addEventListener('change',function(){S.snd=this.checked;saveS();});
$('sVib').addEventListener('change',function(){S.vib=this.checked;saveS();});
function remMsg(t,cls){var m=$('remMsg');m.textContent=t||'';m.className='msg'+(cls?' '+cls:'');}
function scheduleReminder(){
  var LN=P.LocalNotifications;
  if(!LN){remMsg(S.rem?D.remWeb:'');return Promise.resolve();}
  return LN.cancel({notifications:[{id:1}]}).catch(function(){}).then(function(){
    if(!S.rem){remMsg(D.remOff);return;}
    return LN.requestPermissions().then(function(p){
      if(p.display!=='granted'){S.rem=false;$('sRem').checked=false;saveS();remMsg(D.remDenied,'err');return;}
      var hm=S.remTime.split(':');
      return LN.schedule({notifications:[{id:1,title:D.remTitle,body:D.remBody,schedule:{on:{weekday:Number(S.remDay)+1,hour:Number(hm[0]),minute:Number(hm[1])},repeats:true,allowWhileIdle:true}}]}).then(function(){remMsg(D.remOn,'ok');});
    });
  }).catch(function(){remMsg(D.sendErr,'err');});
}
$('sRem').addEventListener('change',function(){S.rem=this.checked;$('remWhen').hidden=!S.rem;saveS();scheduleReminder();});
$('sDay').addEventListener('change',function(){S.remDay=Number(this.value);saveS();scheduleReminder();});
$('sTime').addEventListener('change',function(){S.remTime=this.value||'09:00';saveS();scheduleReminder();});

/* ---------- email offer ---------- */
var reEmail=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function openEmail(){track('email_open');checkForm();$('emailMsg').textContent='';$('emailMsg').className='msg';$('emailModal').hidden=false;document.body.classList.add('lock');}
function closeEmail(){$('emailModal').hidden=true;document.body.classList.remove('lock');if(document.activeElement)document.activeElement.blur();}
$('emailClose').addEventListener('click',closeEmail);
$('emailModal').addEventListener('click',function(e){if(e.target===this)closeEmail();});
function checkForm(){$('emailSend').disabled=!($('consent').checked&&$('email').value.trim());}
$('consent').addEventListener('change',checkForm);$('email').addEventListener('input',checkForm);
// Fields as the site expects them (robotrainer.ru/wp-json/rt/v1/app-lead)
function payload(email,last){var t=last.ts||{};
  var b={key:CFG.EMAIL_KEY,email:email,consent:true,lang:lang,inhale:Math.round(t.inhale||0),exhale:Math.round(t.exhale||0),load:Math.round(t.load||0),website:''};
  if(last.sq>0&&last.sq<=100)b.squats=Math.round(last.sq);return b;}
function post(url,body){
  var ac=window.AbortController?new AbortController():null;if(ac)setTimeout(function(){ac.abort();},15000);
  return fetch(url,{method:'POST',signal:ac?ac.signal:undefined,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){return r.json().catch(function(){return {};}).then(function(j){j.status=r.status;return j;});});}
// No internet: keep the request and send it when the network is back
var flushing=false;
function flushQueue(){if(!navigator.onLine||flushing)return;flushing=true;store.get('emailQueue').then(function(q){if(!q){flushing=false;return;}
  post(q.url,q.body).then(function(j){if(j.status<500)store.set('emailQueue',null);}).catch(function(){}).then(function(){flushing=false;});});}
window.addEventListener('online',flushQueue);setTimeout(flushQueue,3000);
$('emailForm').addEventListener('submit',function(e){
  e.preventDefault();
  var email=$('email').value.trim(),msg=$('emailMsg');
  var say=function(t,ok){msg.textContent=t;msg.className='msg '+(ok?'ok':'err');};
  $('consent').parentNode.classList.remove('need');
  if(!reEmail.test(email)){say(D.badEmail);return;}
  var url=CFG.EMAIL_ENDPOINT[lang];
  if(!url){say(D.sendOff,true);setTimeout(closeEmail,2500);return;}
  var body=payload(email,history[0]||{});
  if(!navigator.onLine){store.set('emailQueue',{url:url,body:body});say(D.queued,true);store.set('emailSent',true);setTimeout(closeEmail,2500);return;}
  $('emailSend').disabled=true;
  var server=function(j,fallback){return lang==='ru'&&j.message?j.message:fallback;};
  post(url,body).then(function(j){
    if(j.ok){track('email_sent');sendTrack();say(server(j,j.repeat?D.repeat:D.sent),true);store.set('emailSent',true);setTimeout(closeEmail,3000);return;}
    $('emailSend').disabled=false;
    if(j.error==='email')say(server(j,D.badEmail));
    else if(j.error==='consent'){$('consent').parentNode.classList.add('need');say(server(j,D.consent));}
    else if(j.error==='rate'||j.status===429)say(server(j,D.rate));
    else say(server(j,D.sendErr));
  }).catch(function(){
    // Network dropped mid-way: queue it so the person doesn't lose their result
    store.set('emailQueue',{url:url,body:body});say(D.queued,true);store.set('emailSent',true);setTimeout(closeEmail,3000);});
});

/* ---------- Android back button ---------- */
if(P.App&&P.App.addListener){P.App.addListener('backButton',function(){
  if(!$('tour').hidden){endTour();return;}
  if(!$('howModal').hidden){closeHow();return;}
  if(!$('payModal').hidden){closePay();return;}if(!$('emailModal').hidden){closeEmail();return;}
  if(!$('scrEx').hidden){exClose();return;}
  if($('scrTest').hidden&&S.warned){go('scrTest');return;}
  P.App.minimizeApp();
});}


/* ---------- exercise after the test, like on the site (Nov 2026-10-19): 30 s to catch the breath, set 1 = exhale hold as long as you can (the measure),
   set 2 = measure + 5 s, set 3 = + 5 s more, 30 s rest before each, then a control INHALE hold compared with step 1 of the test, gain in percent.
   Numbers are fine during the sets (it is not the test); the control hold shows no numbers until it ends, like the test */
var EX={on:false,base:0,goal:0,set:0,state:'',t0:0,raf:0,restT:0,end:0};
var exPrg=$('exPrg'),exBox=$('exBox');
(function(){var m=box.querySelector('.mascot');if(m)$('exFace').insertBefore(m.cloneNode(true),$('exFace').firstChild);})();
function X(k,o){var t=D.X[k];for(var n in o)t=t.replace('{'+n+'}',o[n]);return t;}
function exDots(){var d=$('exDots');d.innerHTML='';for(var i=1;i<=4;i++){var e=document.createElement('span');e.textContent=i<4?String(i):D.X.ctrlShort;
  var cur=EX.state==='res'?5:(EX.set||1);e.className=i<cur?'ok':(i===cur?'cur':'');if(i<cur)e.textContent='✓';d.appendChild(e);}}
function exCard(h,t,btn){$('exH').textContent=h;$('exT').textContent=t;var g=$('exGo');g.classList.toggle('wait',!btn);g.disabled=!btn;g.textContent=btn||D.start;g.classList.toggle('stop',btn===D.X.stopW);}  // during rest START stays in place, greyed, so nothing jumps
function exRing(cls,time,lbl,cap){exBox.className='ringbox '+cls;$('exTime').textContent=time||'';$('exLbl').textContent=lbl||'';$('exCap').innerHTML=cap||'';}
function exStopTimers(){cancelAnimationFrame(EX.raf);clearInterval(EX.restT);EX.restT=0;}
function exReady(){exStopTimers();EX.state='ready';exDots();exPrg.style.transition='';exPrg.style.stroke=acc();exPrg.style.strokeDashoffset=C;
  if(EX.set===1){exCard(D.X.set+' 1 '+D.X.of,EX.short?D.X.short:D.X.m1T,D.start);exRing('idle ready','','',EX.short?D.X.shortCap:D.X.m1+'<small>'+D.X.m1Sub+'</small>');}
  else if(EX.set<=3){exCard(D.X.set+' '+EX.set+' '+D.X.of,X('setT',{t:EX.goal}),D.start);exRing('idle ready','','',X('goal',{t:EX.goal}));}
  else{exCard(D.X.ctrl,EX.short?D.X.short:D.X.ctrlT,D.start);exRing('idle ready','','',EX.short?D.X.shortCap:D.X.ctrlCap+'<small>'+D.X.ctrlSub+'</small>');}}
function exRest(sec,txt,pill,inh,head){exStopTimers();EX.state='rest';exDots();exCard(head||(EX.set<=3?D.X.set+' '+EX.set+' '+D.X.of:D.X.ctrl),txt,'');
  var end=Date.now()+sec*1000,warned=false;exPrg.style.stroke=acc();
  var paint=function(){var left=Math.max(0,Math.ceil((end-Date.now())/1000));exRing('idle rest',mmss(left),left>10?pill:(left>0?(inh?D.X.soonIn:D.restSoon):(inh?D.X.goIn:D.restGo)),'');exPrg.style.strokeDashoffset=C*(1-left/sec);
    if(left<=10&&!warned){warned=true;beep(520);}
    if(left<=0){clearInterval(EX.restT);EX.restT=0;beep(880);setTimeout(function(){beep(880);},250);exReady();}};
  paint();EX.restT=setInterval(paint,250);}
function exHoldTick(){var s=(performance.now()-EX.t0)/1000;
  if(EX.set===1){exPrg.style.strokeDashoffset=C*(1-(s%full('exhale'))/full('exhale'));$('exTime').textContent=Math.floor(s);}
  else if(EX.set<=3){exPrg.style.strokeDashoffset=C*(1-Math.min(s/EX.goal,1));$('exTime').textContent=Math.floor(s);
    if(s>=EX.goal){exEnd(true);return;}}
  else{exPrg.style.strokeDashoffset=C*(1-(s%full('exhale'))/full('exhale'));exBox.style.setProperty('--puff',Math.min(s/50,1).toFixed(3));}
  EX.raf=requestAnimationFrame(exHoldTick);}
function exStart(){EX.state='hold';EX.short=false;EX.t0=performance.now();beep(660);awake(true);exPrg.style.stroke=acc();
  if(EX.set===1){exCard(D.X.set+' 1 '+D.X.of,D.holdT,D.X.stopW);exRing('exhold','0',D.X.m1Pill,'');}
  else if(EX.set<=3){exCard(D.X.set+' '+EX.set+' '+D.X.of,D.X.holdT,D.X.stopW);exRing('exhold','0',X('goal',{t:EX.goal}),'');}
  else{exCard(D.X.ctrl,D.holdT,D.X.stopW);exRing('hold','','',D.X.going);}
  EX.raf=requestAnimationFrame(exHoldTick);
  if(EX.set>1&&EX.set<=3)EX.tmo=setTimeout(function(){if(EX.state==='hold'&&EX.set>1&&EX.set<=3)exEnd(true);},EX.goal*1000+400);}  // the goal is reached even if frames pause
function exEnd(full){clearTimeout(EX.tmo);cancelAnimationFrame(EX.raf);var s=(performance.now()-EX.t0)/1000;exBox.style.setProperty('--puff',0);
  if(EX.set===1){beep(330);if(s<5){EX.short=true;track('ex_m1_short');exReady();return;}
    track('ex_m1_done');EX.goal=Math.round(s)+5;EX.state='breathe';exCard(D.X.set+' 1 '+D.X.of,D.X.afterM,'');exRing('idle','','',X('got',{t:Math.round(s)}));
    EX.set=2;var rm=X('restM',{t:Math.round(s),g:EX.goal});setTimeout(function(){if(EX.on)exRest(30,rm,D.restCalm);},1500);return;}
  if(EX.set<=3){track(full?'ex_set_full':'ex_set_early');exPrg.style.strokeDashoffset=full?0:exPrg.style.strokeDashoffset;
    if(full){beep(880);setTimeout(function(){beep(880);},250);}else beep(330);
    EX.state='breathe';exCard(D.X.set+' '+EX.set+' '+D.X.of,full?D.X.afterFull:D.X.afterEarly,'');exRing('idle','','',full?D.X.done:D.X.early);
    EX.set++;if(EX.set===3)EX.goal+=5;  // ladder: +5 s more on the norm, whether or not set 2 reached it
    setTimeout(function(){if(!EX.on)return;if(EX.set<=3)exRest(30,D.X.restT,D.restCalm);else exRest(30,D.X.restLongT,D.X.restLong,true);},1500);return;}
  beep(330);
  if(s<5){EX.short=true;track('ex_ctrl_short');exReady();return;}
  track('ex_ctrl_done');awake(false);exResult(s);}
function exResult(s){EX.state='res';exDots();var a=Math.round(EX.base),b=Math.round(s),up=b>a,d=Math.max(1,Math.round((b-a)/a*100));  // control is an inhale hold, compared with step 1 of the test, gain in percent
  var h=history[0];if(h&&h.d===EX.hd){h.ex=b;store.set('history',history);}
  exCard('',up?X('up',{p:d}):D.X.flat,'');
  var r=$('exRes');r.innerHTML='';var ln=document.createElement('div');ln.className='exline'+(up?' up':'');ln.textContent=X('line',{a:a,b:b}).replace(/(\d) /g,'$1\u00a0').replace(' →','\u00a0→');r.appendChild(ln);r.hidden=false;
  exRing('idle done '+(up?'lv2':'lv1'),'',up?D.X.win:'','');exPrg.style.transition='stroke .4s, stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)';exPrg.style.stroke=up?col(2):'var(--muted)';exPrg.style.strokeDashoffset=up?0:C;
  $('exBtns').hidden=false;payRender();$('exQuit').hidden=true;$('exNote').hidden=true;$('scrEx').classList.add('res');}
function exOpen(){if(!history[0]||!(ts.exhale>=5))return;track('ex_open');
  EX={on:true,base:ts.inhale,goal:0,set:1,state:'',hd:history[0].d};  // goal comes from set 1; control is an inhale, like step 1
  $('exTtl').textContent=D.X.ttl;$('exNote').textContent=D.X.note;$('exQuit').textContent=D.X.quit;$('exMail').textContent=D.cta;$('exHome').textContent=D.X.home;
  $('exRes').hidden=true;$('exBtns').hidden=true;$('exQuit').hidden=false;$('exNote').hidden=false;$('scrEx').classList.remove('res');go('scrEx');exRest(30,D.X.howT,D.X.firstPill,false,D.X.howH);}  // 30 s to catch the breath after the squats, with what comes next
function exClose(){exStopTimers();clearTimeout(EX.tmo);EX.on=false;EX.state='';awake(false);go('scrTest');}
$('exGo').addEventListener('click',function(){if(EX.state==='ready')exStart();else if(EX.state==='hold')exEnd(false);});
$('exQuit').addEventListener('click',function(){track('ex_quit');exClose();});
$('exHome').addEventListener('click',exClose);
$('exMail').addEventListener('click',openEmail);


/* ---------- «Уровень 1»: yearly subscription (billing.js), Google Play build only ---------- */
var PAY=window.RT_PAY,payAsk='';
function payPrice(){return PAY.price||'$3.99';}
function payRender(){var T=D.PAY,show=PAY.available&&!PAY.owned&&EX.state==='res';
  $('exPay').hidden=!show;$('exPay').textContent=T.btn.replace('{p}',payPrice());$('exMail').className=show?'again':'cta';$('exHome').className=show?'exquit':'again';  // three buttons do not fit a small screen, home becomes a link
  $('payH').textContent=T.h;$('payList').innerHTML='';T.list.forEach(function(t){var li=document.createElement('li');li.textContent=t;$('payList').appendChild(li);});
  $('payPrice').textContent=T.price.replace('{p}',payPrice());$('payRenew').textContent=T.renew;$('payRestore').textContent=T.restore;$('payManage').textContent=T.manage;
  var g=$('payGo');g.textContent=PAY.busy?T.busy:T.go;g.disabled=PAY.busy;g.hidden=PAY.owned;
  var m=$('payMsg');m.textContent=PAY.owned?T.ok:(PAY.err?T.err:(payAsk==='restore'&&!PAY.busy?T.none:''));m.className='msg'+(PAY.owned?' ok':(m.textContent?' err':''));}
window.payRender=payRender;
function openPay(){track('pay_open');payAsk='';PAY.err='';payRender();$('payModal').hidden=false;document.body.classList.add('lock');}
function closePay(){$('payModal').hidden=true;document.body.classList.remove('lock');}
PAY.on(function(){payRender();});
$('exPay').addEventListener('click',openPay);
$('payClose').addEventListener('click',closePay);
$('payModal').addEventListener('click',function(e){if(e.target===this)closePay();});
$('payGo').addEventListener('click',function(){if(PAY.busy||PAY.owned)return;track('pay_buy');payAsk='buy';PAY.buy();});
$('payRestore').addEventListener('click',function(){if(PAY.busy)return;track('pay_restore');payAsk='restore';PAY.err='';PAY.restore();});
/* ---------- start ---------- */
$('warnOk').addEventListener('change',function(){$('warnGo').classList.toggle('off',!this.checked);$('warnOk').parentNode.classList.remove('need');});
$('warnGo').addEventListener('click',function(){if(!$('warnOk').checked){var c=$('warnOk').parentNode;c.classList.remove('need');void c.offsetWidth;c.classList.add('need');return;}S.warned=true;saveS();go('scrTest');});
// Short overview of the 3 steps: shown once before the first test, then on the link under the headline
function openHow(){track('how_open');$('howModal').hidden=false;document.body.classList.add('lock');}
function closeHow(){$('howModal').hidden=true;document.body.classList.remove('lock');if(!S.howSeen){S.howSeen=true;saveS();}}
$('howBtn').addEventListener('click',openHow);$('howOk').addEventListener('click',function(){closeHow();setTimeout(startTour,250);});
$('howModal').addEventListener('click',function(e){if(e.target===this)closeHow();});
// Tour: highlight each button with a short note (circle, current card, next steps, tabs)
var tourI=-1;
function tourTargets(){return [$('box'),document.querySelector('#bars .row.act'),document.querySelector('#bars .row.locked')||$('bars'),$('tabs')];}
function startTour(){if(run||finished)return;track('tour_start');tourI=0;$('tour').hidden=false;showTour();}
function endTour(){$('tour').hidden=true;tourI=-1;window.scrollTo(0,0);}  // back to the headline and step 1
function showTour(){var el=tourTargets()[tourI];if(!el){endTour();return;}
  el.scrollIntoView({block:'nearest'});
  var r=el.getBoundingClientRect(),pad=8,hole=$('tourHole'),tip=$('tourTip');
  if(el!==$('tabs')){var lim=$('tabs').getBoundingClientRect().top-pad-4;if(r.bottom>lim)r={left:r.left,top:r.top,width:r.width,height:Math.max(40,lim-r.top),bottom:lim};}  // keep the box above the tab bar
  hole.style.left=(r.left-pad)+'px';hole.style.top=(r.top-pad)+'px';hole.style.width=(r.width+pad*2)+'px';hole.style.height=(r.height+pad*2)+'px';
  hole.style.borderRadius=el===$('box')?'50%':'18px';
  $('tourText').textContent=D.tour[tourI];
  var last=tourI===D.tour.length-1;$('tourNext').textContent=last?D.tourDone:D.tourNext;$('tourSkip').hidden=last;
  var below=r.top+r.height/2<window.innerHeight/2;
  tip.style.top=below?(r.bottom+pad+14)+'px':'';tip.style.bottom=below?'':(window.innerHeight-r.top+pad+14)+'px';}
$('tourTip').addEventListener('click',function(e){if(e.target.closest('#tourSkip,#tourNext'))return;$('tourNext').click();});  // the whole hint works as a button
$('tourNext').addEventListener('click',function(){tourI++;if(tourI>=D.tour.length)endTour();else showTour();});
$('tourSkip').addEventListener('click',function(){track('tour_skip');endTour();});
window.addEventListener('resize',function(){if(tourI>=0)showTour();});
Promise.all([store.get('settings'),store.get('history')]).then(function(r){
  if(r[0])for(var k in r[0])S[k]=r[0][k];
  history=Array.isArray(r[1])?r[1]:[];
  lang=S.lang||pickLang();D=L[lang];
  $('sSnd').checked=S.snd;$('sVib').checked=S.vib;$('sRem').checked=S.rem;$('sTime').value=S.remTime;$('remWhen').hidden=!S.rem;
  applyTexts();newTest();
  go(S.warned?'scrTest':'scrWarn');
});
})();
