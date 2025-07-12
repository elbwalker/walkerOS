export function isVisible(element: HTMLElement): boolean {
  // Check for hiding styles
  const style = getComputedStyle(element);
  if (style.display === 'none') return false;
  if (style.visibility !== 'visible') return false;
  if (style.opacity && Number(style.opacity) < 0.1) return false;

  // Window positions
  let pointContainer;
  const windowHeight = window.innerHeight; // Height of the viewport

  // Element positions
  const elemRectRel = element.getBoundingClientRect(); // Get the elements relative to the viewport
  const elementHeight = elemRectRel.height; // Height of the element
  const elementTopRel = elemRectRel.y; // Relative distance from window top to element top
  const elementBottomRel = elementTopRel + elementHeight; // Relative distance from window to to element bottom
  const elemCenterRel = {
    // Relative position on viewport of the elements center
    x: elemRectRel.x + element.offsetWidth / 2,
    y: elemRectRel.y + element.offsetHeight / 2,
  };

  // Differentiate between small and large elements
  if (elementHeight <= windowHeight) {
    // Smaller than the viewport

    // Must have a width and height
    if (
      element.offsetWidth + elemRectRel.width === 0 ||
      element.offsetHeight + elemRectRel.height === 0
    )
      return false;

    if (elemCenterRel.x < 0) return false;
    if (
      elemCenterRel.x >
      (document.documentElement.clientWidth || window.innerWidth)
    )
      return false;
    if (elemCenterRel.y < 0) return false;
    if (
      elemCenterRel.y >
      (document.documentElement.clientHeight || window.innerHeight)
    )
      return false;

    // Select the element that is at the center of the target
    pointContainer = document.elementFromPoint(
      elemCenterRel.x,
      elemCenterRel.y,
    );
  } else {
    // Bigger than the viewport

    // that are considered visible if they fill half of the screen
    const viewportCenter = windowHeight / 2;

    // Check if upper part is above the viewports center
    if (elementTopRel < 0 && elementBottomRel < viewportCenter) return false;

    // Check if lower part is below the viewports center
    if (elementBottomRel > windowHeight && elementTopRel > viewportCenter)
      return false;

    // Select the element that is in the middle of the screen
    pointContainer = document.elementFromPoint(
      elemCenterRel.x,
      windowHeight / 2,
    );
  }

  // Check for potential overlays
  if (pointContainer) {
    do {
      if (pointContainer === element) return true; // should be visible
    } while ((pointContainer = pointContainer.parentElement));
  }

  return false;
}
