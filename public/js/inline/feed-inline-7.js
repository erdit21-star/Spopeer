document.addEventListener('DOMContentLoaded', function() {
  if (window.sharedUi && typeof window.sharedUi.setupSocialFeedRuntime === 'function') {
    window.sharedUi.setupSocialFeedRuntime({ basePath: '', statusId: 'runtimeStatus' });
  }
});
