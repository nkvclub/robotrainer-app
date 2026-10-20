/* «Уровень 1»: yearly auto-renewing subscription through Google Play Billing (cordova-plugin-purchase).
   Only in the Google Play build (com.robotrainerpro.app). In RuStore, iOS and a browser it stays off and the app shows no pay button.
   No server: the purchase is checked by Google Play on the phone, the app keeps a local "owned" flag and re-reads it from Play on start. */
(function(){
'use strict';
var PRODUCT='level1_year', PLAY_ID='com.robotrainerpro.app';
var Cap=window.Capacitor, P=(Cap&&Cap.Plugins)||{};
var subs=[];
var PAY=window.RT_PAY={available:false,owned:false,price:'',busy:false,err:'',
  on:function(f){subs.push(f);},
  buy:function(){},restore:function(){}};
function emit(){subs.forEach(function(f){try{f(PAY);}catch(e){}});}
try{PAY.owned=localStorage.getItem('rt_l1')==='1';}catch(e){}
function setOwned(v){if(PAY.owned===v)return;PAY.owned=v;try{localStorage.setItem('rt_l1',v?'1':'0');}catch(e){}emit();}

function start(){
  var C=window.CdvPurchase;if(!C||!C.store)return;
  var st=C.store,G=C.Platform.GOOGLE_PLAY;
  st.verbosity=C.LogLevel.WARNING;
  st.register([{id:PRODUCT,type:C.ProductType.PAID_SUBSCRIPTION,platform:G}]);
  st.when()
    .productUpdated(function(){var p=st.get(PRODUCT,G);if(p){var o=p.pricing||(p.offers[0]&&p.offers[0].pricingPhases[0]);PAY.price=o?o.price:'';PAY.available=true;}emit();})
    .approved(function(t){t.verify();})
    .verified(function(r){r.finish();})
    .finished(function(){check();})
    .receiptUpdated(function(){check();});
  st.error(function(e){PAY.busy=false;PAY.err=(e&&e.message)||'';emit();});
  function check(){setOwned(!!st.owned(PRODUCT));PAY.busy=false;emit();}
  st.initialize([G]).then(function(){check();});
  PAY.buy=function(){var p=st.get(PRODUCT,G);var o=p&&p.getOffer();if(!o)return;PAY.busy=true;PAY.err='';emit();
    o.order().then(function(r){PAY.busy=false;if(r&&r.isError&&r.code!==C.ErrorCode.PAYMENT_CANCELLED)PAY.err=r.message||'';emit();});};
  PAY.restore=function(){PAY.busy=true;emit();st.restorePurchases().then(function(){check();});};
}

if(!(Cap&&Cap.getPlatform&&Cap.getPlatform()==='android'))return;
var appInfo=P.App&&P.App.getInfo?P.App.getInfo():Promise.resolve({});
appInfo.then(function(i){if(i.id!==PLAY_ID)return;  // RuStore build has its own id and no Google billing
  if(window.CdvPurchase)start();else document.addEventListener('deviceready',start,false);}).catch(function(){});
})();
