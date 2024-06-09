export function getLanguage(navigatorRef: Navigator): string | undefined {
  return navigatorRef.language;
}

export function getTimezone(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getScreenSize(windowRef: Window): string {
  return `${windowRef.screen.width}x${windowRef.screen.height}`;
}
