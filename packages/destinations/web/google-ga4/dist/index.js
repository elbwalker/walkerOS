"use strict";var m=Object.defineProperty;var G=Object.getOwnPropertyDescriptor;var b=Object.getOwnPropertyNames;var y=Object.prototype.hasOwnProperty;var h=(e,t)=>{for(var n in t)m(e,n,{get:t[n],enumerable:!0})},k=(e,t,n,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let a of b(t))!y.call(e,a)&&a!==n&&m(e,a,{get:()=>t[a],enumerable:!(r=G(t,a))||r.enumerable});return e};var A=e=>k(m({},"__esModule",{value:!0}),e);var E={};h(E,{default:()=>j});module.exports=A(E);var D={type:"google-ga4",config:{custom:{measurementId:""}},init(e){let t=window,n=e.custom||{},r={};return n.measurementId?(n.transport_url&&(r.transport_url=n.transport_url),n.pageview===!1&&(r.send_page_view=!1),e.loadScript&&I(n.measurementId),t.dataLayer=t.dataLayer||[],t.gtag||(t.gtag=function(){t.dataLayer.push(arguments)},t.gtag("js",new Date)),t.gtag("config",n.measurementId,r),!0):!1},push(e,t,n={}){let r=t.custom,a=n.custom||{};if(!r||!r.measurementId)return;let o={},s=a.include||r.include||["data"];s.includes("all")&&(s=["context","data","event","globals","source","user","version"]),s.forEach(i=>{let d=e[i];i=="event"&&(d={id:e.id,timing:e.timing,trigger:e.trigger,entity:e.entity,action:e.action,group:e.group,count:e.count}),Object.entries(d).forEach(([w,c])=>{i=="context"&&(c=c[0]),o[`${i}_${w}`]=c})}),Object.assign(o,f({...r.params,...a.params},e));let l=[];for(var u=0,p=e.nested.length||1;u<p;u++){let i=f({...r.items&&r.items.params,...a.items&&a.items.params},e,u);i&&l.push(i)}l.length&&(o.items=l);let g=e.event;!n.name&&r.snakeCase!==!1&&(g=g.replace(" ","_").toLowerCase()),o.send_to=r.measurementId,r.debug&&(o.debug_mode=!0),window.gtag("event",g,o)}};function I(e,t="https://www.googletagmanager.com/gtag/js?id="){let n=document.createElement("script");n.src=t+e,document.head.appendChild(n)}function f(e,t,n=0){let r={};return Object.entries(e).forEach(([a,o])=>{let s,l;typeof o=="string"?s=o:(s=o.key,l=o.default);let u=P(t,s,n)||l;u&&(r[a]=u)}),Object.keys(r).length?r:!1}function P(e,t,n){return t.split(".").reduce((a,o)=>{if(o=="*"&&(o=String(n)),a instanceof Object)return a[o]},e)}var j=D;