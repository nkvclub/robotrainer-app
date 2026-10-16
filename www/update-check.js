/* Update check: on start, compare the installed build with latest.json in the repo.
   If a newer build exists, show a small bar with a button to the store. Sends nothing; silent on any error. */
(function(){
'use strict';
var URL_LATEST='https://raw.githubusercontent.com/nkvclub/robotrainer-app/main/latest.json';
var STORE={'com.robotrainerpro.app':'https://play.google.com/store/apps/details?id=com.robotrainerpro.app','ru.robotrainer.app':'https://www.rustore.ru/catalog/app/ru.robotrainer.app'};
var TXT={ru:{t:'Вышло обновление',b:'ОБНОВИТЬ',l:'ПОЗЖЕ'},en:{t:'An update is out',b:'UPDATE',l:'LATER'}};
var Cap=window.Capacitor,P=(Cap&&Cap.Plugins)||{};
if(!(Cap&&Cap.isNativePlatform&&Cap.isNativePlatform())||!P.App||!P.App.getInfo)return;
function show(url){
  var x=TXT[(document.documentElement.lang||'').indexOf('ru')===0?'ru':'en'];
  var bar=document.createElement('div');bar.className='upd';
  var s=document.createElement('span');s.textContent=x.t;
  var a=document.createElement('a');a.className='upd-go';a.href=url;a.target='_blank';a.rel='noopener';a.textContent=x.b;
  var c=document.createElement('button');c.type='button';c.className='upd-x';c.textContent=x.l;
  c.addEventListener('click',function(){bar.remove();});
  var row=document.createElement('div');row.className='upd-btns';row.appendChild(c);row.appendChild(a);
  bar.appendChild(s);bar.appendChild(row);document.body.appendChild(bar);
}
P.App.getInfo().then(function(i){
  var url=STORE[i.id],mine=parseInt(i.build,10);
  if(!url||!(mine>0))return;
  var ctl=window.AbortController?new AbortController():null;if(ctl)setTimeout(function(){ctl.abort();},8000);
  return fetch(URL_LATEST+'?t='+Date.now(),{cache:'no-store',signal:ctl?ctl.signal:undefined}).then(function(r){return r.ok?r.json():null;}).then(function(j){
    if(j&&parseInt(j.code,10)>mine)show(url);
  });
}).catch(function(){});
})();
