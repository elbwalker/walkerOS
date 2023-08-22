!function(){"use strict";function e(e,t={}){return Object.entries(t).forEach((([n,o])=>{const r=e[n];Array.isArray(r)&&Array.isArray(o)&&(t[n]=o.reduce(((e,t)=>e.includes(t)?e:[...e,t]),[...r]))})),{...e,...t}}function t(e){if("true"===e)return!0;if("false"===e)return!1;const t=Number(e);return e==t&&""!==e?t:String(e)}function n(e,t){return e.getAttribute(t)||""}function o(e=6){for(var t="";t.length<e;)t+=(36*Math.random()|0).toString(36);return t}function r(e,t){return typeof e==typeof t}function i(e){const t=getComputedStyle(e);if("none"===t.display)return!1;if("visible"!==t.visibility)return!1;if(t.opacity&&Number(t.opacity)<.1)return!1;let n;const o=window.innerHeight,r=e.getBoundingClientRect(),i=r.height,c=r.y,u=c+i,s={x:r.x+e.offsetWidth/2,y:r.y+e.offsetHeight/2};if(i<=o){if(e.offsetWidth+r.width===0||e.offsetHeight+r.height===0)return!1;if(s.x<0)return!1;if(s.x>(document.documentElement.clientWidth||window.innerWidth))return!1;if(s.y<0)return!1;if(s.y>(document.documentElement.clientHeight||window.innerHeight))return!1;n=document.elementFromPoint(s.x,s.y)}else{const e=o/2;if(c<0&&u<e)return!1;if(u>o&&c>e)return!1;n=document.elementFromPoint(s.x,o/2)}if(n)do{if(n===e)return!0}while(n=n.parentElement);return!1}function c(e){return e?e.trim().replace(/^'|'$/g,"").trim():""}function u(e,t){return function(...n){try{return e(...n)}catch(e){return void(t&&t(e)||console.error(e))}}}function s(e,t,n){return function(...o){let r;const i="post"+t,c=n["pre"+t],u=n[i];return r=c?c({fn:e},...o):e(...o),u&&(r=u({fn:e,result:r},...o)),r}}function a(e,t,n=!0){return e+(null!=t?(n?"-":"")+t:"")}function f(e,o,r,i=!0){return w(n(o,a(e,r,i))||"").reduce(((e,n)=>{let[r,i]=y(n);if(!r)return e;if(i||(":"===r.charAt(r.length-1)&&(r=r.slice(0,-1)),i=""),"#"===i.charAt(0)){i=i.substring(1);try{let e=o[i];e||"selected"!==i||(e=o.options[o.selectedIndex].text),e&&(i=e)}catch(e){i=""}}return"[]"===r.slice(-2)?(r=r.slice(0,-2),Array.isArray(e[r])||(e[r]=[]),e[r].push(t(i))):e[r]=t(i),e}),{})}function l(t){const n=`[${a(t,"globals",!1)}]`;let o={};return document.querySelectorAll(n).forEach((n=>{o=e(o,f(t,n,"globals",!1))})),o}function d(e){const t={};return w(e).forEach((e=>{let[n,o]=y(e);const[r,i]=b(n);if(!r)return;let[c,u]=b(o||"");c=c||r,t[r]||(t[r]=[]),t[r].push({trigger:r,triggerParams:i,action:c,actionParams:u})})),t}function h(e,t,n){const o=[];let r=t;for(n=0!==Object.keys(n||{}).length?n:void 0;r;){const i=g(e,r,t);!i||n&&!n[i.type]||o.push(i),r=p(e,r)}return o}function g(t,o,r){const i=n(o,a(t));if(!i)return null;const c=[o],u=`[${a(t,i)}],[${a(t,"")}]`,s=a(t,"link",!1);let[l,d]=m(r||o,u,t,i);o.querySelectorAll(`[${s}]`).forEach((e=>{let[t,o]=y(n(e,s));"parent"===o&&document.querySelectorAll(`[${s}="${t}:child"]`).forEach((t=>{t!==e&&c.push(t)}))}));let h=[];c.forEach((e=>{e.matches(u)&&h.push(e),e.querySelectorAll(u).forEach((e=>{h.push(e)}))}));let p={},w={};h.forEach((n=>{w=e(w,f(t,n,"")),p=e(p,f(t,n,i))})),p=e(l,e(w,p));const b=[];return o.querySelectorAll(`[${a(t)}]`).forEach((e=>{const n=g(t,e);n&&b.push(n)})),{type:i,data:p,context:d,nested:b}}function p(e,t){const o=a(e,"link",!1);if(t.matches(`[${o}]`)){let[e,r]=y(n(t,o));if("child"===r)return document.querySelector(`[${o}="${e}:parent"]`)}return t.parentElement}function m(t,n,o,r){let i={},c={},u=t;const s=`[${a(o,"context",!1)}]`;let l=0;for(;u;)u.matches(n)&&(i=e(f(o,u,""),i),i=e(f(o,u,r),i)),u.matches(s)&&(Object.entries(f(o,u,"context",!1)).forEach((([e,t])=>{c[e]||(c[e]=[t,l])})),++l),u=p(o,u);return[i,c]}function w(e,t=";"){if(!e)return[];const n=new RegExp(`(?:[^${t}']+|'[^']*')+`,"ig");return e.match(n)||[]}function y(e){const[t,n]=e.split(/:(.+)/,2);return[c(t),c(n)]}function b(e){const[t,n]=e.split("(",2);return[t,n?n.slice(0,-1):""]}let v,E,k=[];function x(e,t){const n=()=>{e(t)};"loading"!==document.readyState?n():document.addEventListener("DOMContentLoaded",n)}function A(e){e.config.pageview&&function(e){const t=window.location,n={domain:t.hostname,title:document.title,referrer:document.referrer};t.search&&(n.search=t.search),t.hash&&(n.hash=t.hash),e.config.elbLayer.push("page view",n,"load")}(e),q(e)}function L(e){document.addEventListener("click",u((function(t){O.call(this,e,t)}))),document.addEventListener("submit",u((function(t){P.call(this,e,t)})))}function q(e,t=document){k=[],v=v||u(H)(e,1e3);const n=a(e.config.prefix,"action",!1);t===document?v&&v.disconnect():S(e,t,n),t.querySelectorAll(`[${n}]`).forEach((t=>S(e,t,n))),k.length&&function(e){const t=(e,t)=>e.filter((([e,n])=>{const o=window.scrollY+window.innerHeight,r=e.offsetTop;if(o<r)return!0;const i=e.clientHeight;return!(100*(1-(r+i-o)/(i||1))>=n&&($(t,e,"scroll"),1))}));E||(E=function(e,t=1e3){let n;return function(...o){if(!n)return n=setTimeout((()=>{n=0}),t),e(...o)}}((function(){k=t.call(document,k,e)})),document.addEventListener("scroll",E))}(e)}function $(e,t,o){(function(e,t,o="data-elb"){const r=[],i=function(e,t,o){let r=t;for(;r;){const t=d(n(r,a(e,"action",!1)));if(t[o]||"click"!==o)return t[o];r=p(e,r)}return[]}(o,e,t);return i?(i.forEach((n=>{const i=w(n.actionParams||"",",").reduce(((e,t)=>(e[t]=!0,e)),{}),c=h(o,e,i);if(!c.length){const t="page",n=`[${a(o,t)}]`;let[r,i]=m(e,n,o,t);c.push({type:t,data:r,nested:[],context:i})}c.forEach((e=>{r.push({entity:e.type,action:n.action,data:e.data,trigger:t,context:e.context,nested:e.nested})}))})),r):r})(t,o,e.config.prefix).forEach((t=>{e.config.elbLayer.push(`${t.entity} ${t.action}`,t.data,o,t.context,t.nested)}))}function S(e,t,o){const r=n(t,o);r&&Object.values(d(r)).forEach((n=>n.forEach((n=>{switch(n.trigger){case"hover":!function(e,t){t.addEventListener("mouseenter",u((function(t){t.target instanceof Element&&$(e,t.target,"hover")})))}(e,t);break;case"load":!function(e,t){$(e,t,"load")}(e,t);break;case"pulse":!function(e,t,n=""){setInterval((()=>{document.hidden||$(e,t,"pulse")}),parseInt(n||"")||15e3)}(e,t,n.triggerParams);break;case"scroll":!function(e,t=""){let n=parseInt(t||"")||50;n<0||n>100||k.push([e,n])}(t,n.triggerParams);break;case"visible":!function(e,t){t&&t.observe(e)}(t,v);break;case"wait":!function(e,t,n=""){setTimeout((()=>$(e,t,"wait")),parseInt(n||"")||15e3)}(e,t,n.triggerParams)}}))))}function O(e,t){$(e,t.target,"click")}function P(e,t){$(e,t.target,"submit")}function H(e,t=1e3){if(window.IntersectionObserver)return new window.IntersectionObserver((n=>{n.forEach((n=>{const o=n.target,r="elbTimerId";let c=Number(o.dataset[r]);if(n.intersectionRatio>0&&(o.offsetHeight>window.innerHeight&&i(o)||n.intersectionRatio>=.5))return c=c||window.setTimeout((function(){i(o)&&($(e,o,"visible"),delete o.dataset[r],v&&v.unobserve(o))}),t),void(o.dataset[r]=String(c));c&&(clearTimeout(c),delete o.dataset[r])}))}),{rootMargin:"0px",threshold:[0,.1,.2,.3,.4,.5]})}let I,j;const T=document.querySelector("script.elbwalker");T&&(I=!!n(T,"data-default"),j=parseInt(n(T,"data-version")||"1"));const M=function(t={}){const n="walker run",i=t.globals||{},c=d(t),a={push:s((function(e,t,o="",i={},c=[]){if(!e||!r(e,""))return;const u=a.config;if(!u.allowed&&e!=n)return;const[s,l]=e.split(" ");if(!s||!l)return;if("walker"===s)return void function(e,t,n,o){switch(t){case"config":m(n)&&(e.config=d(n,e.config));break;case"consent":m(n)&&function(e,t){const n=e.config;let o=!1;Object.entries(t).forEach((([e,t])=>{const r=!!t;n.consent[e]=r,o=o||r})),o&&Object.values(n.destinations).forEach((t=>{let o=t.queue||[];t.queue=o.filter((o=>(o.consent=n.consent,o.globals=n.globals,o.user=n.user,!w(e,t,o,!1))))}))}(e,n);break;case"destination":m(n)&&f(e,n,o);break;case"hook":r(n,"")&&r(o,r)&&function(e,t,n){e.hooks[t]=n}(e.config,n,o);break;case"init":(Array.isArray(n)?n:[n||document]).forEach((t=>{p(t)&&q(e,t)}));break;case"run":x(y,e);break;case"user":m(n)&&function(e,t){const n=e.config.user;t.id&&(n.id=t.id),t.device&&(n.device=t.device),t.session&&(n.session=t.session)}(e,n)}}(a,l,t,o);let g,b=!1;if(p(t)?(g=t,b=!0):p(i)&&(g=i),g){const e=h(u.prefix,g).find((e=>e.type==s));e&&(t=b?e.data:t,i=e.context)}t=t||{},"page"===s&&(t.id=t.id||window.location.pathname),++u.count;const v=Date.now(),E=Math.round((performance.now()-u.timing)/10)/100,k=`${v}-${u.group}-${u.count}`,A={type:1,id:window.location.href,previous_id:document.referrer},L={event:e,data:t,context:i,globals:u.globals,user:u.user,nested:c,consent:u.consent,id:k,trigger:o,entity:s,action:l,timestamp:v,timing:E,group:u.group,count:u.count,version:{config:u.version,walker:1.6},source:A};u.queue.push(L),Object.values(u.destinations).forEach((e=>{w(a,e,L)}))}),"Push",c.hooks),config:c};function f(e,t,n){if(!t.push)return;const r=n||t.config||{init:!1},i={init:t.init,push:t.push,config:r,type:t.type};!1!==r.queue&&e.config.queue.forEach((t=>{w(e,i,t)}));let c=r.id;if(!c)do{c=o(4)}while(e.config.destinations[c]);e.config.destinations[c]=i}function d(t,n={}){return{allowed:t.allowed||n.allowed||!1,consent:t.consent||n.consent||{},count:t.count||n.count||0,destinations:t.destinations||n.destinations||{},elbLayer:t.elbLayer||n.elbLayer||(window.elbLayer=window.elbLayer||[]),globals:e(i,e(n.globals||{},t.globals||{})),group:t.group||n.group||"",hooks:t.hooks||n.hooks||{},pageview:"pageview"in t?!!t.pageview:n.pageview||!0,prefix:t.prefix||n.prefix||"data-elb",queue:t.queue||n.queue||[],round:t.round||n.round||0,timing:t.timing||n.timing||0,user:t.user||n.user||{},version:t.version||n.version||0}}function g(e){return{}.hasOwnProperty.call(e,"callee")}function p(e){return e===document||e instanceof HTMLElement}function m(e){return r(e,{})&&!Array.isArray(e)&&null!==e}function w(e,t,n,o=!0){if(n=JSON.parse(JSON.stringify(n)),!function(e,t){let n=!0;const o=t.config.consent;if(o){n=!1;const t=e.config.consent;Object.keys(o).forEach((e=>{t[e]&&(n=!0)}))}return n}(e,t))return o&&(t.queue=t.queue||[],t.queue.push(n)),!1;let r;const i=t.config.mapping;if(i){const e=i[n.entity]||i["*"]||{};if(r=e[n.action]||e["*"],r){if(r.ignore)return!1;r.name&&(n.event=r.name)}if(!r)return!1}return!!u((()=>{if(t.init&&!t.config.init){const e=s(t.init,"DestinationInit",c.hooks)(t.config);if(t.config.init=e,!e)return!1}return s(t.push,"DestinationPush",c.hooks)(n,t.config,r,e.config),!0}))()}function y(t){t.config=e(t.config,{allowed:!0,count:0,globals:e(i,l(t.config.prefix)),group:o()}),t.config.queue=[],Object.values(t.config.destinations).forEach((e=>{e.queue=[]})),1==++t.config.round?function(e){const t=[],o=[];let i=!0;e.config.elbLayer.map((e=>{let[c,u,s,a,f]=[...Array.from(e)];({}).hasOwnProperty.call(c,"callee")&&([c,u,s,a,f]=[...Array.from(c)]),r(c,"")&&(i&&c==n?i=!1:c.startsWith("walker ")?t.push([c,u,s,a,f]):o.push([c,u,s,a,f]))})),t.concat(o).map((t=>{const[n,o,r,i,c]=t;e.push(String(n),o,r,i,c)}))}(t):t.config.timing=performance.now(),u(A)(t)}return function(e){const t=e.config.elbLayer;t.push=function(t,n,o,r,i){g(t)&&([t,n,o,r,i]=[...Array.from(t)]);let c=Array.prototype.push.apply(this,[arguments]);return e.push(String(t),n,o,r,i),c},t.find((e=>(e=g(e)?e[0]:e)==n))&&x(y,e)}(a),t.default&&(window.dataLayer=window.dataLayer||[],f(a,{config:{},push:e=>{window.dataLayer.push({...e,walker:!0})},type:"dataLayer"}),x(y,a)),L(a),a}({default:I,version:j});window.elbwalker=M,window.elb=function(){(window.elbLayer=window.elbLayer||[]).push(arguments)}}();