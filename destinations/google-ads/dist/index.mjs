var s={config:{},init(o){let n=o.custom||{},t=window;return n.conversionId?(n.currency=n.currency||"EUR",o.loadScript&&r(n.conversionId),t.dataLayer=t.dataLayer||[],t.gtag||(t.gtag=function(){t.dataLayer.push(arguments)},t.gtag("js",new Date)),t.gtag("config",n.conversionId),!0):!1},push(o,n,t={}){let e=t.custom;if(!e||!e.label)return;let i=n.custom||{},a={send_to:`${i.conversionId}/${e.label}`,currency:i.currency};e.value&&(a.value=o.data[e.value]),i.defaultValue&&!a.value&&(a.value=i.defaultValue),e.id&&(a.transaction_id=o.data[e.id]),window.gtag("event","conversion",a)}};function r(o,n="https://www.googletagmanager.com/gtag/js?id="){let t=document.createElement("script");t.src=n+o,document.head.appendChild(t)}var c=s;export{c as default,s as destinationGoogleAds};