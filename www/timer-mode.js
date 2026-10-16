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
    else if(rest||done||bars.classList.contains('results'))h='';
    else if(calc)h=(ru?'Готово!':'Done!')+'<small>'+(ru?'жми «Рассчитать» на карточке':'tap «Calculate» on the card')+'</small>';
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
      var tc=ru?'РАССЧИТАТЬ':'CALCULATE';if(cb.textContent!==tc)cb.textContent=tc;if(cb.classList.contains('stop'))cb.classList.remove('stop');if(!cb.classList.contains('calc'))cb.classList.add('calc');show=true;}
    else{if(cb.classList.contains('calc'))cb.classList.remove('calc');var cr=bars.querySelector('.calcrow');if(cr)cr.classList.remove('calcrow');}
    if(show&&!calc){if(cb.parentNode!==a)a.appendChild(cb);var t=hold?(ru?'СТОП':'STOP'):(ru?'СТАРТ':'START');if(cb.textContent!==t)cb.textContent=t;if(cb.classList.contains('stop')!==hold)cb.classList.toggle('stop',hold);}
    if(cb.hidden===show)cb.hidden=!show;
    var key=show?step()+cb.textContent+(cb.parentNode&&cb.parentNode.className):'';
    if(key!==lastKey){lastKey=key;if(show)setTimeout(reveal,350);}
    busy=false;}
  // small screens / big system font: if the card button hides under the bottom menu, scroll just enough (once per state)
  var lastKey='';
  function reveal(){if(cb.hidden||!cb.parentNode)return;var t=document.getElementById('tabs'),lim=t&&!t.hidden&&getComputedStyle(t).display!=="none"?t.getBoundingClientRect().top:innerHeight;var r=cb.getBoundingClientRect(),d=r.bottom+14-lim;if(d>0)window.scrollBy({top:d,behavior:'smooth'});}
  cb.addEventListener('click',function(e){if(cb.classList.contains('calc')){e.stopPropagation();document.getElementById('calcBtn').click();}});  // step 3: START -> STOP -> CALCULATE on one button
  new MutationObserver(sync).observe(box,{attributes:true,attributeFilter:['class']});
  new MutationObserver(sync).observe(lbl,{childList:true,characterData:true,subtree:true});
  new MutationObserver(sync).observe(bars,{attributes:true,subtree:true,attributeFilter:['class','hidden']});
  document.addEventListener('input',sync);setInterval(sync,500);sync();
})();
