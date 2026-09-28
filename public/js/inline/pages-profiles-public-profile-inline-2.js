if (window.sharedUi && window.sharedUi.setupSocialFeedRuntime) {
    var hasSession = !!(window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function' && window.CurrentUserStore.isLoggedIn());
    if (hasSession) {
      window.sharedUi.setupSocialFeedRuntime({ basePath: '../../' });
    }
  }
