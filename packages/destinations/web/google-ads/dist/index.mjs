var s={type:"google-ads",config:{},init(n){let e=n.custom||{},t=window;return e.conversionId?(e.currency=e.currency||"EUR",n.loadScript&&r(e.conversionId),t.dataLayer=t.dataLayer||[],t.gtag||(t.gtag=function(){t.dataLayer.push(arguments)},t.gtag("js",new Date)),t.gtag("config",e.conversionId),!0):!1},push(n,e,t={}){let o=t.custom;if(!o||!o.label)return;let i=e.custom||{},a={send_to:`${i.conversionId}/${o.label}`,currency:i.currency};o.value&&(a.value=n.data[o.value]),i.defaultValue&&!a.value&&(a.value=i.defaultValue),o.id&&(a.transaction_id=n.data[o.id]),window.gtag("event","conversion",a)}};function r(n,e="https://www.googletagmanager.com/gtag/js?id="){let t=document.createElement("script");t.src=e+n,document.head.appendChild(t)}var c=s;export{c as default,s as destinationGoogleAds};