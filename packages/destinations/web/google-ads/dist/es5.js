"use strict";var destination=function(){t=function(){e={type:"google-ads",config:{},init:function(t){var n=t.custom||{},e=window;return!!n.conversionId&&(n.currency=n.currency||"EUR",t.loadScript&&function(t,n){var n=1<arguments.length&&void 0!==n?n:"https://www.googletagmanager.com/gtag/js?id=",e=document.createElement("script");e.src=n+t,document.head.appendChild(e)}(n.conversionId),e.dataLayer=e.dataLayer||[],e.gtag||(e.gtag=function(){e.dataLayer.push(arguments)},e.gtag("js",new Date)),e.gtag("config",n.conversionId),!0)},push:function(t,n){var e,a=(2<arguments.length&&void 0!==arguments[2]?arguments[2]:{}).custom;a&&a.label&&(n=n.custom||{},e={send_to:"".concat(n.conversionId,"/").concat(a.label),currency:n.currency},a.value&&(e.value=t.data[a.value]),n.defaultValue&&!e.value&&(e.value=n.defaultValue),a.id&&(e.transaction_id=t.data[a.id]),window.gtag("event","conversion",e))}}};var e,t,n,a,o,c=function(){return n=t?t(t=0):n};return a=function(t,n){c(),n.exports=e},o||a((o={exports:{}}).exports,o),o.exports}();