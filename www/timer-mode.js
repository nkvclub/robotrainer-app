(function(){
  var box=document.getElementById('box'),lbl=document.getElementById('lbl'),bars=document.getElementById('bars');
  var cap=document.createElement('div');cap.id='vbcap';box.appendChild(cap);
  var cb=document.createElement('div');cb.className='cbtn';
  function step(){var a=document.querySelector('#bars .row.act');if(!a)return 0;return Array.prototype.indexOf.call(bars.children,a)+1;}
  var busy=false;
  function sync(){if(busy)return;busy=true;
    var c=box.classList,a=document.querySelector('#bars .row.act'),n=step(),ru=(document.documentElement.lang||'ru').indexOf('en')!==0;
    var hold=c.contains('hold'),rest=c.contains('rest'),done=c.contains('done')&&!c.contains('mid')&&!c.contains('lvx');
    var h='';if(hold)h=(ru?'Замер идёт':'Measuring')+'<small>'+(ru?'жми СТОП, когда захочешь вдохнуть':'tap STOP when you want to breathe')+'</small>';
    else if(rest||done||bars.classList.contains('results'))h='';
    else if(!document.getElementById('calcBtn').hidden)h=(ru?'Готово!':'Done!')+'<small>'+(ru?'жми «Рассчитать тест» ниже':'tap «Calculate result» below')+'</small>';
    else if(n)h=(ru?'Шаг ':'Step ')+n+(ru?' из 3':' of 3');
    if(cap.innerHTML!==h)cap.innerHTML=h;
    if(document.body.classList.contains('vbcap-on')!==!!h)document.body.classList.toggle('vbcap-on',!!h);  // caption replaces the small label, no overlap
    var needNum=a&&a.querySelector('.sqin')&&!a.querySelector('.sqin').hidden&&!document.getElementById('sqNum').value;
    var show=!!(a&&!rest&&!needNum&&!bars.classList.contains('results'));
    if(show){if(cb.parentNode!==a)a.appendChild(cb);var t=hold?(ru?'СТОП':'STOP'):(ru?'СТАРТ':'START');if(cb.textContent!==t)cb.textContent=t;if(cb.classList.contains('stop')!==hold)cb.classList.toggle('stop',hold);}
    if(cb.hidden===show)cb.hidden=!show;
    busy=false;}
  new MutationObserver(sync).observe(box,{attributes:true,attributeFilter:['class']});
  new MutationObserver(sync).observe(lbl,{childList:true,characterData:true,subtree:true});
  new MutationObserver(sync).observe(bars,{attributes:true,subtree:true,attributeFilter:['class','hidden']});
  document.addEventListener('input',sync);setInterval(sync,500);sync();
})();
