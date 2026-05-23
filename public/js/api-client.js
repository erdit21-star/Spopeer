(function () {
  var root = (window.Spopeer = window.Spopeer || {});

  function ensureApi() {
    if (!window.SpopeerAPI || typeof window.SpopeerAPI.request !== "function") {
      throw new Error("SpopeerAPI.request is not available");
    }
    return window.SpopeerAPI;
  }

  function get(path, options) {
    var api = ensureApi();
    return api.request(path, Object.assign({ method: "GET" }, options || {}));
  }

  function post(path, body, options) {
    var api = ensureApi();
    return api.request(path, Object.assign({
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined
    }, options || {}));
  }

  function put(path, body, options) {
    var api = ensureApi();
    return api.request(path, Object.assign({
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined
    }, options || {}));
  }

  function patch(path, body, options) {
    var api = ensureApi();
    return api.request(path, Object.assign({
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined
    }, options || {}));
  }

  function del(path, options) {
    var api = ensureApi();
    return api.request(path, Object.assign({ method: "DELETE" }, options || {}));
  }

  function upload(path, formData, options) {
    var api = ensureApi();
    return api.request(path, Object.assign({ method: "POST", body: formData }, options || {}));
  }

  root.api = {
    get: get,
    post: post,
    put: put,
    patch: patch,
    delete: del,
    upload: upload
  };
})();
