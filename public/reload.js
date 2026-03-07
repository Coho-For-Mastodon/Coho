(function () {
  var params = new URLSearchParams(window.location.search);
  var target = params.get('target') || '/';

  if (
    !target.startsWith('/') ||
    target.startsWith('//') ||
    target.includes('\n') ||
    target.includes('\r')
  ) {
    target = '/';
  }

  var reloadLink = document.getElementById('reload-link');
  if (reloadLink) {
    reloadLink.setAttribute('href', target);
  }

  window.location.replace(target);
})();
