(function(){
  var box=document.getElementById('box'),lbl=document.getElementById('lbl'),bars=document.getElementById('bars');
  var cap=document.createElement('div');cap.id='vbcap';box.appendChild(cap);
  var cb=document.createElement('div');cb.className='cbtn';
  function step(){var a=document.querySelector('#bars .row.act');if(!a)return 0;return Array.prototype.indexOf.call(bars.children,a)+1;}
  var busy=false;
  function sync(){if(busy)return;busy=true;
    var c=box.classList,a=document.querySelector('#bars .row.act'),n=step(),ru=(document.documentElement.lang||'ru').indexOf('en')!==0;
    var calc=!document.getElementById('calcBtn').hidden&&!bars.classList.contains('results');
    var hold=c.contains('hold'),rest=c.contains('rest'),done=c.contains('done')&&!c.contains('mid')&&!c.contains('lvx');
    var h='';if(hold)h=(ru?'Замер идёт':'Measuring')+'<small>'+(ru?'жми СТОП, когда захочешь вдохнуть':'tap STOP when you want to breathe')+'</small>';
    else if(c.contains('lvx')&&a){h=(ru?'Слишком коротко':'Too short')+'<small>'+(ru?'держи дольше 5 секунд':'hold longer than 5 seconds')+'</small>';
      var tr=ru?'Слишком коротко, так не считается. Задержи дыхание дольше 5 секунд и жми СТАРТ.':'Too short to count. Hold your breath longer than 5 seconds and tap START.',rd=a.querySelector('.rd');if(rd&&rd.textContent!==tr)rd.textContent=tr;}  // a hold under 5 s does not count: say so instead of silently showing START again
    else if(rest||done||bars.classList.contains('results'))h='';
    else if(calc)h=(ru?'Готово!':'Done!')+'<small>'+(ru?'жми «Рассчитать результат»':'tap «Calculate result»')+'</small>';
    else if(n){var sqNum=document.getElementById('sqNum'),hint;
      if(n===3&&!sqNum.value)hint=ru?'сначала 20 приседаний':'first, 20 squats';
      else if(n===3)hint=ru?'сядь, вдохни и жми СТАРТ':'sit, breathe in, tap START';
      else hint=n===2?(ru?'выдохни и жми СТАРТ':'breathe out, tap START'):(ru?'вдохни и жми СТАРТ':'breathe in, tap START');
      h=(ru?'Шаг ':'Step ')+n+(ru?' из 3':' of 3')+'<small>'+hint+'</small>';}
    if(cap.innerHTML!==h)cap.innerHTML=h;
    if(document.body.classList.contains('vbcap-on')!==!!h)document.body.classList.toggle('vbcap-on',!!h);  // caption replaces the small label, no overlap
    var needNum=a&&a.querySelector('.sqin')&&!a.querySelector('.sqin').hidden&&!document.getElementById('sqNum').value;
    var show=!!(a&&!rest&&!needNum&&!bars.classList.contains('results'));
    if(calc){var last=bars.lastElementChild;if(last.classList.contains('calcrow')!==true)last.classList.add('calcrow');if(cb.parentNode!==last){last.appendChild(cb);setTimeout(function(){last.scrollIntoView({behavior:'smooth',block:'nearest'});},300);}
      var tc=ru?'РАССЧИТАТЬ РЕЗУЛЬТАТ':'CALCULATE RESULT';if(cb.textContent!==tc)cb.textContent=tc;if(cb.classList.contains('stop'))cb.classList.remove('stop');if(!cb.classList.contains('calc'))cb.classList.add('calc');show=true;}
    else{if(cb.classList.contains('calc'))cb.classList.remove('calc');var cr=bars.querySelector('.calcrow');if(cr)cr.classList.remove('calcrow');}
    if(show&&!calc){if(cb.parentNode!==a)a.appendChild(cb);var t=hold?(ru?'СТОП':'STOP'):(ru?'СТАРТ':'START');if(cb.textContent!==t)cb.textContent=t;if(cb.classList.contains('stop')!==hold)cb.classList.toggle('stop',hold);}
    if(cb.hidden===show)cb.hidden=!show;
    var key=show?step()+cb.textContent+(cb.parentNode&&cb.parentNode.className):'';
    var key2=key+'|'+(document.querySelector('#bars .row.act .sqin:not([hidden])')?1:0)+(bars.classList.contains('results')?'r':'');
    if(key2!==lastKey){lastKey=key2;setTimeout(fit,60);}
    busy=false;}
  // any screen size: shrink the circle so the circle and the whole current step card fit above the bottom menu
  var lastKey='';
  function tabsTop(){var t=document.getElementById('tabs');return t&&!t.hidden&&getComputedStyle(t).display!=='none'?t.getBoundingClientRect().top:innerHeight;}
  function fit(){
    if(bars.classList.contains('results')){box.style.width='';return;}
    var a=document.querySelector('#bars .row.act')||(cb.parentNode&&cb.parentNode.classList&&cb.parentNode.classList.contains('row')?cb.parentNode:null);if(!a)return;
    box.style.width='';  // start from the CSS size
    var maxW=box.getBoundingClientRect().width,sy=window.scrollY;
    var need=a.getBoundingClientRect().bottom+sy+12-tabsTop();  // how far the card bottom sits below the menu when the page is at the top
    var w=Math.max(150,Math.min(maxW,maxW-need));
    if(w<maxW-1)box.style.width=w+'px';
    var r=a.getBoundingClientRect(),d=r.bottom+12-tabsTop();
    if(d>0)window.scrollBy({top:d,behavior:'smooth'});           // still too tall (tiny screen): scroll just enough
    else if(window.scrollY>0&&a.getBoundingClientRect().bottom+window.scrollY+12<=tabsTop())window.scrollTo({top:0,behavior:'smooth'});  // fits from the top: show the circle again
  }
  cb.addEventListener('click',function(e){if(cb.classList.contains('calc')){e.stopPropagation();document.getElementById('calcBtn').click();}});  // step 3: START -> STOP -> CALCULATE on one button
  window.addEventListener('resize',function(){lastKey='';});
  new MutationObserver(sync).observe(box,{attributes:true,attributeFilter:['class']});
  new MutationObserver(sync).observe(lbl,{childList:true,characterData:true,subtree:true});
  new MutationObserver(sync).observe(bars,{attributes:true,subtree:true,attributeFilter:['class','hidden']});
  document.addEventListener('input',sync);setInterval(function(){sync();var a=document.querySelector('#bars .row.act')||bars.querySelector('.calcrow');if(a&&!bars.classList.contains('results')&&!document.getElementById('tour').offsetParent&&a.getBoundingClientRect().bottom>tabsTop()+1)fit();},500);sync();
})();
