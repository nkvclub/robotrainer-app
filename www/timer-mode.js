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
    var h='';if(hold)h=(ru?'Замер идёт':'Measuring');  // what to do is already on the card
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
    var key2=key+'|'+(document.querySelector('#bars .row.act .sqin:not([hidden])')?1:0)+(bars.classList.contains('results')?'r':'')+(document.getElementById('scrTest').classList.contains('started')?'s':'');
    if(key2!==lastKey){lastKey=key2;setTimeout(fit,60);setTimeout(fit,700);}
    busy=false;}
  // any screen size: shrink the circle so the circle and the whole current step card fit above the bottom menu
  var lastKey='';
  function tabsTop(){var t=document.getElementById('tabs');return t&&!t.hidden&&getComputedStyle(t).display!=='none'?t.getBoundingClientRect().top:innerHeight;}
  function fit(){
    document.documentElement.style.setProperty('--tabsH',Math.max(0,innerHeight-tabsTop())+'px');
    box.style.width='';  // the circle keeps its size during the whole test
    bars.classList.remove('drum');
    if(bars.classList.contains('results'))return;
    var started=document.getElementById('scrTest').classList.contains('started');
    if(!started){  // before the test: headline whole and step 1 card with START above the menu, the circle gives way if needed
      if(window.scrollY>0)window.scrollTo(0,0);
      var a1=document.querySelector('#bars .row.act');if(a1){var o1=a1.getBoundingClientRect().bottom+8-tabsTop();if(o1>0)box.style.width=Math.max(150,box.getBoundingClientRect().width-o1)+'px';}
      return;}
    var z=bars.lastElementChild;if(!z)return;
    var over=function(){return z.getBoundingClientRect().bottom+window.scrollY+12-tabsTop();};
    if(over()>0)bars.classList.add('drum');  // all 3 steps do not fit: done and next steps shrink to an edge, like a drum
    var d=over();
    if(d>0){var bw=box.getBoundingClientRect().width;box.style.width=Math.max(150,bw-d)+'px';d=over();}  // rare tall card: the circle gives a little room instead of cutting the top
    if(d>0)window.scrollTo(0,d);           // tiny screen: scroll just enough
    else if(window.scrollY>0)window.scrollTo(0,0);
  }
  cb.addEventListener('click',function(e){if(cb.classList.contains('calc')){e.stopPropagation();document.getElementById('calcBtn').click();}});  // step 3: START -> STOP -> CALCULATE on one button
  window.addEventListener('resize',function(){lastKey='';});
  new MutationObserver(sync).observe(box,{attributes:true,attributeFilter:['class']});
  new MutationObserver(sync).observe(lbl,{childList:true,characterData:true,subtree:true});
  new MutationObserver(sync).observe(bars,{attributes:true,subtree:true,attributeFilter:['class','hidden']});
  document.addEventListener('input',sync);setInterval(function(){if(document.hidden)return;sync();var a=document.querySelector('#bars .row.act')||bars.querySelector('.calcrow');var st=document.getElementById('scrTest').classList.contains('started');if(a&&!bars.classList.contains('results')&&!document.getElementById('tour').offsetParent&&a.offsetParent&&(st?(bars.lastElementChild.getBoundingClientRect().bottom>tabsTop()+1||window.scrollY>2):a.getBoundingClientRect().bottom+8>tabsTop()+1))fit();},500);sync();
})();
