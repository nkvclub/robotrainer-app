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
var S={lang:null,snd:true,vib:true,warned:false,rem:false,remDay:1,remTime:'09:00'};
var history=[];

/* ---------- language ---------- */
var lang='ru',D=L.ru;
function pickLang(){var n=(navigator.language||'ru').toLowerCase();return n.indexOf('ru')===0||n.indexOf('uk')===0||n.indexOf('be')===0||n.indexOf('kk')===0?'ru':'en';}
function applyTexts(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-t]').forEach(function(el){var v=D[el.getAttribute('data-t')];if(typeof v==='string')el.textContent=v;});
  $('warnList').innerHTML='';D.warnL.forEach(function(t){var li=document.createElement('li');li.textContent=t;$('warnList').appendChild(li);});
  $('lru').setAttribute('aria-pressed',lang==='ru');$('len').setAttribute('aria-pressed',lang==='en');
  $('privLink').href=CFG.PRIVACY_URL[lang];$('consentLink').href=CFG.PRIVACY_URL[lang];$('siteLink').href=CFG.SITE_URL[lang];
  $('ver').textContent=D.ver+' '+CFG.version;
  var sd=$('sDay');sd.innerHTML='';[1,2,3,4,5,6,0].forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=D.days[d];sd.appendChild(o);});sd.value=S.remDay;
}

/* ---------- feedback: sound + vibration ---------- */
var ac=null;
function beep(f){
  if(S.snd){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();var o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;g.gain.setValueAtTime(.15,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.25);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.25);}catch(e){}}
  if(S.vib){if(P.Haptics){P.Haptics.impact({style:'MEDIUM'}).catch(function(){});}else{try{navigator.vibrate&&navigator.vibrate(60);}catch(e){}}}
}

/* ---------- screens ---------- */
function go(id){
  ['scrWarn','scrTest','scrHist','scrSet'].forEach(function(s){$(s).hidden=s!==id;});
  $('tabs').hidden=id==='scrWarn';
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
function level(s,m){if(m==='inhale')return s>=50?2:(s>=40?1:0);if(m==='exhale')return s>70?2:(s>=25?1:0);var p=s/rest*100;return p>50?2:(p>=30?1:0);}
function full(m){return m==='inhale'?60:(m==='exhale'?80:rest*0.6);}
function fmt(s){var t=s.toFixed(1);return lang==='ru'?t.replace('.',','):t;}
function name(m){return D.N[m];}
function paintRow(m,s){var r=rows[m],l=level(s,m),c=col(l);r.fill.style.background=c;r.fill.style.width=Math.round(Math.min(s/full(m),1)*100)+'%';r.wd.style.color=c;r.wd.textContent=Math.round(s)+' '+D.sec+' · '+D.W[m][l];}
function show(){
  ORDER.forEach(function(m,i){var ok=ts[m]!==undefined,r=rows[m];
    r.row.classList.toggle('act',m===mode&&!ok);r.row.classList.toggle('ok',ok);r.row.classList.toggle('locked',!ok&&m!==mode);
    if(finished)return;
    if(!run){r.wd.style.color='';r.wd.textContent=ok?D.doneT:(m===mode?D.yourT:'');}
    r.rl.textContent=(!ok&&m!==mode)?D.stepT+' '+(i+1):name(m);
    r.num.innerHTML=ok?'✓':((m!==mode)?LOCK:String(i+1));
    r.rd.textContent=(m===mode&&!ok)?D.T[m]+' '+D.press:'';});
}
function resetRing(){prg.style.transition='';prg.style.stroke='';box.className='ringbox idle showface';box.style.setProperty('--puff',0);prg.style.strokeDashoffset=C;$('time').textContent=fmt(0);$('lbl').textContent=D.start;}
function pick(m){if(run)return;mode=m;resetRing();show();}
ORDER.forEach(function(m){var row=document.createElement('div');row.className='row';row.innerHTML='<div class="num"></div><div class="rl"></div><div class="rw"></div><div class="rd"></div><div class="bar"><div class="fill"></div></div>';$('bars').appendChild(row);rows[m]={row:row,fill:row.querySelector('.fill'),wd:row.querySelector('.rw'),rl:row.querySelector('.rl'),rd:row.querySelector('.rd'),num:row.querySelector('.num')};});
function newTest(){ts={};lv={};rest=0;finished=false;$('bars').classList.remove('results');$('out').hidden=true;$('againBtn').hidden=true;ORDER.forEach(function(m){rows[m].fill.style.width='0';});pick('inhale');}
function tick(){var s=(performance.now()-t0)/1000;box.style.setProperty('--puff',Math.min(s/full(mode),1).toFixed(3));prg.style.stroke=acc();prg.style.strokeDashoffset=C*(1-Math.min(s/full(mode),1));rows[mode].wd.textContent=D.going;raf=requestAnimationFrame(tick);}
function overall(){var a=(lv.inhale+lv.exhale+lv.load)/3;return a>=1.5?2:(a>=.6?1:0);}
function buildResult(o){
  var out=$('out');out.innerHTML='';out.classList.remove('reveal');
  var hd=document.createElement('div');hd.className='sumh';hd.textContent=D.sumH;out.appendChild(hd);
  var b=document.createElement('div');b.className='badge';b.textContent=D.B[o];b.style.background=col(o);out.appendChild(b);
  var t=document.createElement('div');t.textContent=D.M[o];out.appendChild(t);
  if(lv.inhale>lv.exhale){var c2=document.createElement('div');c2.className='co2';c2.textContent=D.co2;out.appendChild(c2);}
  var bx=document.createElement('div');bx.className='ctabox';
  [['ctah',D.ctaH],['ctasub',D.ctaSub]].forEach(function(p){var e=document.createElement('div');e.className=p[0];e.textContent=p[1];bx.appendChild(e);});
  var c=document.createElement('button');c.type='button';c.className='cta';c.textContent=D.cta;c.addEventListener('click',openEmail);bx.appendChild(c);out.appendChild(bx);
}
function ringReveal(o){box.className='ringbox idle done lv'+o;prg.style.transition='stroke .4s, stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)';prg.style.stroke=col(o);prg.style.strokeDashoffset=0;$('lbl').textContent=D.B[o];}
function summary(anim){
  var o=overall();finished=true;$('bars').classList.add('results');
  ORDER.forEach(function(k,i){var r=rows[k];r.row.classList.remove('act','ok','locked');r.rl.textContent=name(k);r.num.textContent=String(i+1);r.rd.textContent='';
    if(anim){r.fill.style.width='0';r.wd.textContent='';setTimeout(function(){paintRow(k,ts[k]);},1500+i*450);}else paintRow(k,ts[k]);});
  buildResult(o);
  if(anim){$('out').hidden=true;$('lbl').textContent=D.calc;box.className='ringbox showface';
    setTimeout(function(){ringReveal(o);},1300);
    setTimeout(function(){$('out').hidden=false;$('out').classList.add('reveal');$('againBtn').hidden=false;$('out').scrollIntoView({behavior:'smooth',block:'nearest'});},2050+3*450);}
  else{$('out').hidden=false;$('againBtn').hidden=false;ringReveal(o);}
}
function saveResult(){
  history.unshift({d:Date.now(),ts:{inhale:ts.inhale,exhale:ts.exhale,load:ts.load},o:overall()});
  history=history.slice(0,200);store.set('history',history);
}
$('btn').addEventListener('click',function(){
  if(finished){newTest();window.scrollTo({top:0,behavior:'smooth'});return;}  // tap the face again = new test
  if(!run){
    run=true;t0=performance.now();box.className='ringbox hold';$('lbl').textContent=D.stop;beep(660);raf=requestAnimationFrame(tick);
    if(P.KeepAwake)P.KeepAwake.keepAwake().catch(function(){});
  }else{
    run=false;cancelAnimationFrame(raf);var s=(performance.now()-t0)/1000,m=mode;
    box.className='ringbox idle done '+(s<5?'lvx':'mid');box.style.setProperty('--puff',0);prg.style.strokeDashoffset=C;beep(330);
    if(s<5){rows[m].wd.textContent=D.short;rows[m].wd.style.color='';$('lbl').textContent=D.again;return;}
    if(m==='inhale')rest=s;
    ts[m]=s;lv[m]=level(s,m);rows[m].wd.textContent=D.doneT;
    var next=ORDER.filter(function(k){return ts[k]===undefined;})[0];
    if(next){$('lbl').textContent=D.nextT;show();setTimeout(function(){pick(next);},800);}
    else{saveResult();summary(true);}
  }
});
$('againBtn').addEventListener('click',function(){newTest();window.scrollTo({top:0,behavior:'smooth'});});

/* ---------- history ---------- */
function renderHistory(){
  var box2=$('histList');box2.innerHTML='';
  if(!history.length){var e=document.createElement('div');e.className='empty';e.textContent=D.histEmpty;box2.appendChild(e);return;}
  var wrap=document.createElement('div');wrap.style.display='flex';wrap.style.flexDirection='column';wrap.style.gap='12px';
  history.forEach(function(h){
    var c=document.createElement('div');c.className='card';
    var top=document.createElement('div');top.className='hist-top';
    var dt=document.createElement('div');dt.className='hist-date';dt.textContent=new Date(h.d).toLocaleDateString(lang==='ru'?'ru-RU':'en-US',{day:'numeric',month:'long',year:'numeric'});
    var b=document.createElement('div');b.className='badge';b.textContent=D.B[h.o];b.style.background=col(h.o);
    top.appendChild(dt);top.appendChild(b);c.appendChild(top);
    var saved=rest;rest=h.ts.inhale;
    ORDER.forEach(function(m){var s=h.ts[m],l=level(s,m);
      var g=document.createElement('div');g.className='hb';
      var n=document.createElement('div');n.textContent=name(m);
      var v=document.createElement('div');v.className='v';v.textContent=Math.round(s)+' '+D.sec;v.style.color=col(l);
      var bar=document.createElement('div');bar.className='bar';var f=document.createElement('div');f.className='fill';f.style.transition='none';f.style.background=col(l);f.style.width=Math.round(Math.min(s/full(m),1)*100)+'%';bar.appendChild(f);
      g.appendChild(n);g.appendChild(v);g.appendChild(bar);c.appendChild(g);});
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
function openEmail(){$('emailMsg').textContent='';$('emailMsg').className='msg';$('emailModal').hidden=false;}
function closeEmail(){$('emailModal').hidden=true;}
$('emailClose').addEventListener('click',closeEmail);
$('emailModal').addEventListener('click',function(e){if(e.target===this)closeEmail();});
function checkForm(){$('emailSend').disabled=!($('consent').checked&&$('email').value.trim());}
$('consent').addEventListener('change',checkForm);$('email').addEventListener('input',checkForm);
$('emailForm').addEventListener('submit',function(e){
  e.preventDefault();
  var email=$('email').value.trim(),msg=$('emailMsg');
  if(!reEmail.test(email)){msg.textContent=D.badEmail;msg.className='msg err';return;}
  var url=CFG.EMAIL_ENDPOINT[lang];
  if(!url){msg.textContent=D.sendOff;msg.className='msg ok';setTimeout(closeEmail,2500);return;}
  var last=history[0]||{};
  $('emailSend').disabled=true;
  var ac=window.AbortController?new AbortController():null;if(ac)setTimeout(function(){ac.abort();},15000);
  fetch(url,{method:'POST',signal:ac?ac.signal:undefined,headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,consent:true,lang:lang,source:'app',
    results:{inhale:Math.round(last.ts&&last.ts.inhale||0),exhale:Math.round(last.ts&&last.ts.exhale||0),load:Math.round(last.ts&&last.ts.load||0),level:last.o}})})
  .then(function(r){if(!r.ok)throw new Error(r.status);msg.textContent=D.sent;msg.className='msg ok';store.set('emailSent',true);})
  .catch(function(){msg.textContent=D.sendErr;msg.className='msg err';$('emailSend').disabled=false;});
});

/* ---------- Android back button ---------- */
if(P.App&&P.App.addListener){P.App.addListener('backButton',function(){
  if(!$('emailModal').hidden){closeEmail();return;}
  if($('scrTest').hidden&&S.warned){go('scrTest');return;}
  P.App.minimizeApp();
});}

/* ---------- start ---------- */
$('warnOk').addEventListener('change',function(){$('warnGo').disabled=!this.checked;});
$('warnGo').addEventListener('click',function(){S.warned=true;saveS();go('scrTest');});
Promise.all([store.get('settings'),store.get('history')]).then(function(r){
  if(r[0])for(var k in r[0])S[k]=r[0][k];
  history=Array.isArray(r[1])?r[1]:[];
  lang=S.lang||pickLang();D=L[lang];
  $('sSnd').checked=S.snd;$('sVib').checked=S.vib;$('sRem').checked=S.rem;$('sTime').value=S.remTime;$('remWhen').hidden=!S.rem;
  applyTexts();newTest();
  go(S.warned?'scrTest':'scrWarn');
});
})();
