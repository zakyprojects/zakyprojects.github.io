// Small, dependency-free page behaviour: theme toggle, mobile menu, scroll reveal, footer year.
(function () {
  var root = document.documentElement;
  root.classList.add('js');

  // Theme: light by default; dark only when the visitor picks it (remembered).
  var themeBtn = document.querySelector('.theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function applyTheme(t) {
    if (t === 'dark') root.dataset.theme = 'dark'; else delete root.dataset.theme;
    if (themeMeta) themeMeta.content = t === 'dark' ? '#121210' : '#f6f3ea';
  }
  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // Mobile menu: open/close, close on link tap, Escape, or tap outside.
  var toggle = document.querySelector('.nav-toggle');
  var list = document.getElementById('nav-list');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    list.classList.toggle('is-open', open);
  }
  if (toggle && list) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    list.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav')) setMenu(false);
    });
  }

  // Reveal on scroll, every time: an element fades in when it enters the screen and resets when it
  // leaves, so it animates again from whichever side it comes back (below when scrolling down, above when up).
  var items = document.querySelectorAll('.section-head, .case, .card, .about, .panel, .cert, .contact-title, .more');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
        } else {
          el.classList.remove('is-visible');
          // Left through the top: next time it comes back from above.
          el.classList.toggle('from-above', entry.boundingClientRect.top < 0);
        }
      });
    }, { threshold: 0.08 });
    items.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  // Pointer spotlight on cards (desktop only).
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.card, .case').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  // Scroll progress line.
  var bar = document.querySelector('.progress');
  if (bar) {
    var ticking = false;
    var update = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
