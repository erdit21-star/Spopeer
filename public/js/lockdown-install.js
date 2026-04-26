/*
 * Spopeer SES bootstrap.
 *
 * Notes:
 * - This file is safe to include even when SES is not loaded.
 * - Ads pages are intentionally excluded from lockdown by default.
 */
(function () {
  'use strict';

  var path = (window.location && window.location.pathname) || '';
  var isAdsPage = path.indexOf('/pages/ads/') !== -1 || path.indexOf('/ads/') !== -1;
  var sesDisabled = Boolean(window.__SES_DISABLED__) || isAdsPage;

  if (sesDisabled) {
    console.warn('[SES] Disabled for Ads Manager page.');
    window.__SPOPEER_SES_STATUS__ = 'disabled';
    return;
  }

  if (typeof globalThis.lockdown !== 'function') {
    console.warn('[SES] lockdown() is unavailable. Include SES before lockdown-install.js to enable hardening.');
    window.__SPOPEER_SES_STATUS__ = 'unavailable';
    return;
  }

  try {
    globalThis.lockdown({
      errorTaming: 'safe',
      overrideTaming: 'moderate',
      mathTaming: 'unsafe',
      dateTaming: 'unsafe',
      consoleTaming: 'unsafe',
      stackFiltering: 'verbose'
    });

    // Keep global hardening opt-in to avoid accidental regressions on existing pages.
    if (window.__SPOPEER_HARDEN_GLOBALS__ === true && typeof globalThis.harden === 'function') {
      globalThis.harden(globalThis);
    }

    window.__SPOPEER_SES_STATUS__ = 'active';
    console.info('[SES] Lockdown applied.');
  } catch (error) {
    console.error('[SES] Failed to apply lockdown:', error);
    window.__SPOPEER_SES_STATUS__ = 'error';
    return;
  }

  // Optional helper for explicitly sandboxing Ads code when needed.
  window.SpopeerLockdown = {
    createAdsManagerCompartment: function (extraGlobals) {
      if (typeof globalThis.Compartment !== 'function') {
        throw new Error('SES Compartment is unavailable.');
      }

      var defaults = {
        console: globalThis.console,
        fetch: globalThis.fetch,
        Request: globalThis.Request,
        Response: globalThis.Response,
        Headers: globalThis.Headers,
        URL: globalThis.URL,
        URLSearchParams: globalThis.URLSearchParams,
        document: globalThis.document,
        Element: globalThis.Element,
        HTMLElement: globalThis.HTMLElement,
        Node: globalThis.Node,
        Event: globalThis.Event,
        CustomEvent: globalThis.CustomEvent,
        EventTarget: globalThis.EventTarget,
        MutationObserver: globalThis.MutationObserver,
        IntersectionObserver: globalThis.IntersectionObserver,
        ResizeObserver: globalThis.ResizeObserver,
        requestAnimationFrame: globalThis.requestAnimationFrame,
        cancelAnimationFrame: globalThis.cancelAnimationFrame,
        requestIdleCallback: globalThis.requestIdleCallback,
        localStorage: globalThis.localStorage,
        sessionStorage: globalThis.sessionStorage,
        history: globalThis.history,
        location: globalThis.location,
        performance: globalThis.performance,
        PerformanceObserver: globalThis.PerformanceObserver,
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
        setInterval: globalThis.setInterval,
        clearInterval: globalThis.clearInterval,
        CanvasRenderingContext2D: globalThis.CanvasRenderingContext2D,
        HTMLCanvasElement: globalThis.HTMLCanvasElement,
        Image: globalThis.Image,
        ImageData: globalThis.ImageData,
        Chart: globalThis.Chart,
        google: globalThis.google,
        Plotly: globalThis.Plotly,
        d3: globalThis.d3,
        moment: globalThis.moment,
        lodash: globalThis._,
        React: globalThis.React,
        Vue: globalThis.Vue,
        angular: globalThis.angular,
        jQuery: globalThis.jQuery
      };

      var compartmentGlobals = Object.assign({}, defaults, extraGlobals || {});
      return new globalThis.Compartment(compartmentGlobals);
    }
  };
})();
