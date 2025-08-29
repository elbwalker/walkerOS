export function setupWalkerJS(): HTMLScriptElement {
  const script = document.createElement('script');
  script.src =
    'https://cdn.jsdelivr.net/npm/@walkeros/walker.js@latest/dist/index.browser.js';
  script.async = true;
  document.head.appendChild(script);
  return script;
}

export function initWalkerJS(): void {
  const script = setupWalkerJS();
  script.onload = () => {
    console.log('Walker.js loaded');
  };
}
