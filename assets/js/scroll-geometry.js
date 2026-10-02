/* Scroll effects measure layout, never their own animated visual position. */
(() => {
  'use strict';
  window.portfolioScrollGeometry = el => {
    let top = el.offsetTop;
    for (let parent = el.offsetParent; parent; parent = parent.offsetParent) {
      top += parent.offsetTop + parent.clientTop;
    }
    return {top: top - window.scrollY, height: el.offsetHeight};
  };
})();
