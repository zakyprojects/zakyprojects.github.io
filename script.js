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

  // Ripples on the background: moving the mouse leaves soft rings that grow and fade, like water.
  // A click makes a bigger one. Desktop only, skipped for reduced motion. The loop sleeps when idle.
  var fx = document.querySelector('.bg-fx');
  if (fx && fx.getContext && window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
    var ctx = fx.getContext('2d');
    var ripples = [], lastX = -999, lastY = -999, raf = 0, dpr = 1, color = '#047857';
    var resize = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      fx.width = innerWidth * dpr; fx.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    var readColor = function () { color = getComputedStyle(root).getPropertyValue('--accent').trim() || color; };
    resize(); readColor();
    window.addEventListener('resize', resize);
    new MutationObserver(readColor).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    var add = function (x, y, size) {
      ripples.push({ x: x, y: y, t: performance.now(), max: size, life: size > 100 ? 1400 : 1000 });
      if (ripples.length > 40) ripples.shift();
      if (!raf) raf = requestAnimationFrame(draw);
    };
    var draw = function (now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.strokeStyle = color;
      ripples = ripples.filter(function (r) { return now - r.t < r.life; });
      ripples.forEach(function (r) {
        var p = (now - r.t) / r.life;              // 0 → 1
        var ease = 1 - Math.pow(1 - p, 3);          // fast start, slow end
        var fade = (1 - p) * 0.35;
        for (var k = 0; k < 2; k++) {               // two rings per ripple, like water
          var rad = r.max * Math.max(0, ease - k * 0.18);
          if (rad <= 0) continue;
          ctx.globalAlpha = fade * (k ? 0.5 : 1);
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
      raf = ripples.length ? requestAnimationFrame(draw) : 0;
    };
    window.addEventListener('pointermove', function (e) {
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (dx * dx + dy * dy > 70 * 70) { lastX = e.clientX; lastY = e.clientY; add(lastX, lastY, 70); }
    }, { passive: true });
    window.addEventListener('pointerdown', function (e) { add(e.clientX, e.clientY, 160); }, { passive: true });
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
