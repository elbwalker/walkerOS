var p={config:{},init(t){let i=window,n=t.custom||{};return!n.appId||!n.url?!1:(i._paq=i._paq||[],t.loadScript&&(c(n.url),i._paq.push(["setTrackerUrl",n.url+"ppms.php"]),i._paq.push(["setSiteId",n.appId])),n.linkTracking!==!1&&i._paq.push(["enableLinkTracking"]),!0)},push(t,i,n={}){if((i.custom||{}).pageview!==!1&&t.entity==="page"&&t.action==="view"){window._paq.push(["trackPageView",o(t,"data.title")]);return}let a=n.custom||{},r,u;if(a&&(a.name&&(r=o(t,a.name)),a.value&&(u=o(t,a.value))),window._paq.push(["trackEvent",t.entity,t.action,r,u]),a.goalId){let s=a.goalValue?o(t,a.goalValue):void 0;window._paq.push(["trackGoal",a.goalId,s])}}};function c(t){let i=document.createElement("script");i.type="text/javascript",i.src=t+"ppms.js",i.async=!0,i.defer=!0,document.head.appendChild(i)}function o(t,i){return i.split(".").reduce((e,a)=>e[a],t)}var l=p;export{l as default,p as destinationPiwikPro};
