/* «Уровень 1»: yearly auto-renewing subscription (cordova-plugin-purchase): Google Play Billing on Android, App Store on iOS.
   Only in the store builds with id com.robotrainerpro.app. In RuStore and a browser it stays off and the app shows no pay button.
   No server: the purchase is checked by the store on the phone, the app keeps a local "owned" flag and re-reads it from the store on start. */
(function(){
'use strict';
var PRODUCT='level1_year', PLAY_ID='com.robotrainerpro.app';
var Cap=window.Capacitor, P=(Cap&&Cap.Plugins)||{};
var subs=[];
// Nov 2026-10-25: a dollar price is always written $3.99 (Google Play gives «3,99 $» on Russian phones)
function usd(o){if(o.currency==='USD'&&o.priceMicros)return '$'+(o.priceMicros/1e6).toFixed(2);return String(o.price||'').replace(/^\s*(\d+)[,.](\d\d)\s*(\$|US\$|USD)\s*$/,'$$$1.$2');}
var PAY=window.RT_PAY={kind:'',manage:null,store:false,available:false,owned:false,until:0,renew:true,price:'',busy:false,err:'',
  on:function(f){subs.push(f);},
  buy:function(){},restore:function(){}};
function emit(){subs.forEach(function(f){try{f(PAY);}catch(e){}});}
PAY._emit=emit;
try{localStorage.removeItem('rt_l1');}catch(e){}  // Nov 2026-10-25: Level 1 opens only when Google Play says the subscription is active now; an old flag (restored from a phone backup) must not open it
function setOwned(v){PAY.checked=true;if(PAY.owned===v){emit();return;}PAY.owned=v;emit();}

function start(){
  var C=window.CdvPurchase;if(!C||!C.store)return;
  var st=C.store,G=Cap.getPlatform()==='ios'?C.Platform.APPLE_APPSTORE:C.Platform.GOOGLE_PLAY;
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

/* RuStore build (ru.robotrainer.app): the same yearly «Уровень 1» through RuStore Pay (native plugin RuStorePay, 299 ₽).
   Google billing stays off here. Level 1 opens only when RuStore says the subscription is active;
   if RuStore cannot be asked (no internet) the end date of the paid year from its last answer is used. */
var RS_ID='ru.robotrainer.app',RS_PRODUCT='level1_year';
function startRS(RS){
  PAY.kind='rustore';
  PAY.manage=function(){RS.openStore().catch(function(){});};
  function keep(t){try{if(t)localStorage.setItem('rt_rs_until',String(t));else localStorage.removeItem('rt_rs_until');}catch(e){}}
  function check(){return RS.purchases().then(function(r){var now=Date.now(),best=null;
      (r.items||[]).forEach(function(x){if(x.id!==RS_PRODUCT)return;var on=x.status==='ACTIVE'||x.status==='PAUSED'||(x.status==='CLOSED'&&x.until>now);if(on&&(!best||x.until>best.until))best=x;});
      PAY.until=best?best.until:0;PAY.renew=!!best&&best.status!=='CLOSED';keep(PAY.until);setOwned(!!best);PAY.busy=false;emit();})
    .catch(function(){var t=0;try{t=Number(localStorage.getItem('rt_rs_until'))||0;}catch(e){}PAY.until=t>Date.now()?t:0;setOwned(!!PAY.until);PAY.busy=false;emit();});}
  RS.available().then(function(a){if(!a||!a.available){check();return;}  // payments off in RuStore Console: no offer, like before
    PAY.store=true;emit();
    RS.product({id:RS_PRODUCT}).then(function(p){if(p&&p.price){PAY.price=p.price;PAY.available=true;}emit();}).catch(function(){});
    check();}).catch(function(){check();});
  PAY.buy=function(){PAY.busy=true;PAY.err='';emit();
    RS.buy({id:RS_PRODUCT}).then(function(r){if(r&&!r.ok&&!r.cancelled)PAY.err=r.error||'';return check();}).catch(function(e){PAY.busy=false;PAY.err=(e&&e.message)||'';emit();});};
  PAY.restore=function(){PAY.busy=true;emit();check();};
}

var plat=Cap&&Cap.getPlatform&&Cap.getPlatform();if(plat!=='android'&&plat!=='ios')return;  // iOS: App Store billing (same plugin, APPLE_APPSTORE)
var appInfo=P.App&&P.App.getInfo?P.App.getInfo():Promise.resolve({});
appInfo.then(function(i){
  if(i.id===RS_ID){if(P.RuStorePay)startRS(P.RuStorePay);return;}  // RuStore build: RuStore Pay, no Google billing
  if(i.id!==PLAY_ID)return;
  PAY.kind='play';
  PAY.store=true;emit();  // the offer is shown at once, even before Play answers (no network, slow start)
  if(window.CdvPurchase)start();else document.addEventListener('deviceready',start,false);}).catch(function(){});
})();
