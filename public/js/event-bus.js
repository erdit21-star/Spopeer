(function () {
  var root = (window.Spopeer = window.Spopeer || {});

  function on(eventName, handler) {
    if (!eventName || typeof handler !== "function") return function () {};
    var wrapped = function (event) {
      handler((event && event.detail) || undefined, event);
    };
    document.addEventListener(eventName, wrapped);
    return function unsubscribe() {
      document.removeEventListener(eventName, wrapped);
    };
  }

  function once(eventName, handler) {
    var unsubscribe = on(eventName, function (detail, event) {
      unsubscribe();
      handler(detail, event);
    });
    return unsubscribe;
  }

  function emit(eventName, detail) {
    if (!eventName) return;
    document.dispatchEvent(new CustomEvent(eventName, { detail: detail || {} }));
  }

  root.events = {
    on: on,
    once: once,
    emit: emit
  };
})();
