(function () {
  function initMobileMenu() {
    var toggle = document.querySelector('[data-menu-toggle]');
    var panel = document.querySelector('[data-mobile-nav]');
    if (!(toggle instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) {
      return;
    }

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.hidden = !open;
      panel.classList.toggle('hidden', !open);
      toggle.textContent = open ? 'Close' : 'Menu';
    }

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      setOpen(open);
    });

    // Close before navigating so the open panel never covers the next page's form.
    panel.querySelectorAll('a[href]').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
  } else {
    initMobileMenu();
  }
})();
