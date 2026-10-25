/* «Уровень 1»: yearly auto-renewing subscription through Google Play Billing (cordova-plugin-purchase).
   Only in the Google Play build (com.robotrainerpro.app). In RuStore, iOS and a browser it stays off and the app shows no pay button.
   No server: the purchase is checked by Google Play on the phone, the app keeps a local "owned" flag and re-reads it from Play on start. */
(function(){
'use strict';
var PRODUCT='level1_year', PLAY_ID='com.robotrainerpro.app';
var Cap=window.Capacitor, P=(Cap&&Cap.Plugins)||{};
var subs=[];
// Nov 2026-10-25: a dollar price is always written $3.99 (Google Play gives «3,99 $» on Russian phones)
function usd(o){if(o.currency==='USD'&&o.priceMicros)return '$'+(o.priceMicros/1e6).toFixed(2);return String(o.price||'').replace(/^\s*(\d+)[,.](\d\d)\s*(\$|US\$|USD)\s*$/,'$$$1.$2');}
var PAY=window.RT_PAY={store:false,available:false,owned:false,until:0,renew:true,price:'',busy:false,err:'',
  on:function(f){subs.push(f);},
  buy:function(){},restore:function(){}};
function emit(){subs.forEach(function(f){try{f(PAY);}catch(e){}});}
PAY._emit=emit;
try{localStorage.removeItem('rt_l1');}catch(e){}  // Nov 2026-10-25: Level 1 opens only when Google Play says the subscription is active now; an old flag (restored from a phone backup) must not open it
function setOwned(v){PAY.checked=true;if(PAY.owned===v){emit();return;}PAY.owned=v;emit();}

function start(){
  var C=window.CdvPurchase;if(!C||!C.store)return;
  var st=C.store,G=C.Platform.GOOGLE_PLAY;
  st.verbosity=C.LogLevel.WARNING;
  st.register([{id:PRODUCT,type:C.ProductType.PAID_SUBSCRIPTION,platform:G}]);
  st.when()
    .productUpdated(function(){var p=st.get(PRODUCT,G);if(p){var o=p.pricing||(p.offers[0]&&p.offers[0].pricingPhases[0]);PAY.price=o?usd(o):'';PAY.available=true;}emit();})
    .approved(function(t){t.verify();})
    .verified(function(r){r.finish();})
    .finished(function(){check();})
    .receiptUpdated(function(){check();});
  st.error(function(e){PAY.busy=false;PAY.err=(e&&e.message)||'';emit();});
  function check(){var own=!!st.owned(PRODUCT);subDate(own);setOwned(own);PAY.busy=false;emit();}
  // the end of the paid year: Play gives the first purchase day, the year renews on the same day; without auto-renew it ends that day
  function subDate(own){PAY.until=0;PAY.renew=true;if(!own)return;try{var p=st.get(PRODUCT,G),t=p&&st.findInLocalReceipts&&st.findInLocalReceipts(p);if(!t)return;
    PAY.renew=t.renewalIntent!=='Lapse';if(t.expirationDate){PAY.until=+new Date(t.expirationDate);return;}
    if(!t.purchaseDate)return;var d=new Date(t.purchaseDate),now=Date.now();while(+d<=now)d.setFullYear(d.getFullYear()+1);PAY.until=+d;}catch(e){}}
  st.initialize([G]).then(function(){check();});
  PAY.buy=function(){var p=st.get(PRODUCT,G);var o=p&&p.getOffer();if(!o)return;PAY.busy=true;PAY.err='';emit();
    o.order().then(function(r){PAY.busy=false;if(r&&r.isError&&r.code!==C.ErrorCode.PAYMENT_CANCELLED)PAY.err=r.message||'';emit();});};
  PAY.restore=function(){PAY.busy=true;emit();st.restorePurchases().then(function(){check();});};
}

if(!(Cap&&Cap.getPlatform&&Cap.getPlatform()==='android'))return;
var appInfo=P.App&&P.App.getInfo?P.App.getInfo():Promise.resolve({});
appInfo.then(function(i){if(i.id!==PLAY_ID)return;  // RuStore build has its own id and no Google billing
  PAY.store=true;emit();  // the offer is shown at once, even before Play answers (no network, slow start)
  if(window.CdvPurchase)start();else document.addEventListener('deviceready',start,false);}).catch(function(){});
})();
