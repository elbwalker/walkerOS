// Walker.js bundle includes browser source by default
export async function setupWalkerWithSources(): Promise<unknown> {
  // Load walker.js bundle from CDN
  await new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src =
      'https://cdn.jsdelivr.net/npm/@walkerOS/walker.js@latest/dist/index.browser.js';
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });

  // Walker.js automatically initializes with browser source
  // which tracks DOM elements with data-elb attributes
  return (window as Record<string, unknown>).elb;
}

export async function trackWithWalkerSources(elb: unknown): Promise<void> {
  // Type the elb function safely
  const elbFn = elb as (
    command: string,
    config: Record<string, unknown>,
  ) => Promise<void>;

  // Configure browser source to track specific attributes
  await elbFn('walker config', {
    source: {
      browser: {
        // Track elements with data-track attributes
        dataLayer: true,
        // Enable click tracking
        click: true,
        // Enable view tracking (intersection observer)
        view: true,
      },
    },
  });

  // Add a destination to see the events
  await elbFn('walker destination', {
    push: (event: Record<string, unknown>) => {
      console.log('Walker.js Event:', {
        event: event.event,
        data: event.data,
        trigger: event.trigger,
      });
    },
  });

  // Trigger a custom event
  await elbFn('button click', {
    label: 'Sign Up',
    position: 'header',
  });
}
