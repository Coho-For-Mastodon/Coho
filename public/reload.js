(function () {
  var CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;

  function sanitizeTarget(target) {
    if (!target) {
      return '/';
    }

    var candidate = target.trim();

    if (
      !candidate.startsWith('/') ||
      candidate.startsWith('//') ||
      CONTROL_CHAR_PATTERN.test(candidate)
    ) {
      return '/';
    }

    try {
      var url = new URL(candidate, window.location.origin);
      if (url.origin !== window.location.origin) {
        return '/';
      }

      return '' + url.pathname + url.search + url.hash;
    } catch (_error) {
      return '/';
    }
  }

  var params = new URLSearchParams(window.location.search);
  var target = sanitizeTarget(params.get('target'));

  var reloadLink = document.getElementById('reload-link');
  if (reloadLink) {
    reloadLink.setAttribute('href', target);
  }

  window.location.replace(target);
})();
