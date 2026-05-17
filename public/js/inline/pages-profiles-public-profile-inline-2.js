if (window.sharedUi && window.sharedUi.setupSocialFeedRuntime) {
    var hasSession = localStorage.getItem('spopeer_loggedIn') === 'true' && !!(localStorage.getItem('spopeer_user') || localStorage.getItem('user'));
    if (hasSession) {
      window.sharedUi.setupSocialFeedRuntime({ basePath: '../../' });
    }
  }
