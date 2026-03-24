(function initDeferredFeatures() {
  const run = function runDeferred() {
    const deferred = window.LaMiuDeferredInit;
    if (!deferred) return;
    deferred.setupGlobalSearch();
    deferred.setupQuickPreview();
    deferred.setupSpaceCarousel();
    deferred.setupMobileQuickActions();
    deferred.setupBackgroundAudio();
  };

  if (window.LaMiuDeferredInit && typeof window.LaMiuDeferredInit.deferNonCriticalInit === 'function') {
    window.LaMiuDeferredInit.deferNonCriticalInit(run);
    return;
  }

  if (document.readyState === 'complete') {
    window.setTimeout(run, 320);
    return;
  }

  window.addEventListener('load', function onLoad() {
    window.setTimeout(run, 320);
  }, { once: true });
}());
