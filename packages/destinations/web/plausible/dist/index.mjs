var e={type:"plausible",config:{},init(t){let i=window,s=t.custom||{};return t.loadScript&&n(s.domain),i.plausible=i.plausible||function(){(i.plausible.q=i.plausible.q||[]).push(arguments)},!0},push(t){window.plausible(`${t.event}`,{props:t.data})}};function n(t,i="https://plausible.io/js/script.manual.js"){let s=document.createElement("script");s.src=i,t&&(s.dataset.domain=t),document.head.appendChild(s)}var a=e;export{a as default,e as destinationPlausible};