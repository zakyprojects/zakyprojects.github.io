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

  // Water background: the page sits on a dot grid that behaves like a water surface. The mouse moves
  // through it like a fish, leaving a wake that spreads and settles; a click drops a stone.
  // Small wave simulation on the grid nodes (two height buffers + damping). Desktop only, skipped
  // for reduced motion, and the loop sleeps once the water is calm.
  var fx = document.querySelector('.bg-fx');
  if (fx && fx.getContext && window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
    var ctx = fx.getContext('2d');
    var GAP = 24, DAMP = 0.98, C2 = 0.03, PUSH = 1.6;
    var cols = 0, rows = 0, cur = null, prev = null, raf = 0, dpr = 1, dotColor = '', waveColor = '';
    var lastX = null, lastY = null;
    root.classList.add('has-water');

    var readColors = function () {
      var cs = getComputedStyle(root);
      dotColor = cs.getPropertyValue('--line').trim() || '#d9d4c7';
      waveColor = cs.getPropertyValue('--accent').trim() || '#047857';
    };
    var resize = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      fx.width = innerWidth * dpr; fx.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(innerWidth / GAP) + 2; rows = Math.ceil(innerHeight / GAP) + 2;
      cur = new Float32Array(cols * rows); prev = new Float32Array(cols * rows);
      render();
    };
    var disturb = function (x, y, radius, amount) {
      var cx = Math.round(x / GAP), cy = Math.round(y / GAP);
      for (var j = -radius; j <= radius; j++) {
        for (var i = -radius; i <= radius; i++) {
          var gx = cx + i, gy = cy + j;
          if (gx < 1 || gy < 1 || gx >= cols - 1 || gy >= rows - 1) continue;
          var d = Math.sqrt(i * i + j * j);
          if (d > radius) continue;
          cur[gy * cols + gx] += amount * (1 - d / (radius + 1));
        }
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    var step = function () {
      var energy = 0;
      for (var y = 1; y < rows - 1; y++) {
        for (var x = 1; x < cols - 1; x++) {
          var k = y * cols + x;
          // Slow, soft waves: low wave speed (C2) so the wake spreads gently instead of racing out.
          var h0 = cur[k];
          var v = (2 * h0 - prev[k] + C2 * (cur[k - 1] + cur[k + 1] + cur[k - cols] + cur[k + cols] - 4 * h0)) * DAMP;
          prev[k] = v;
          energy += v < 0 ? -v : v;
        }
      }
      var t = cur; cur = prev; prev = t;
      return energy;
    };
    var render = function () {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      var calm = [], moving = [];
      for (var y = 1; y < rows - 1; y++) {
        for (var x = 1; x < cols - 1; x++) {
          var k = y * cols + x, h = cur[k];
          // The slope of the surface bends each dot, like light through water.
          var px = x * GAP + (cur[k + 1] - cur[k - 1]) * 0.9;
          var py = y * GAP + (cur[k + cols] - cur[k - cols]) * 0.9;
          var a = h < 0 ? -h : h;
          (a > 0.6 ? moving : calm).push(px, py, a);
        }
      }
      ctx.fillStyle = dotColor; ctx.globalAlpha = 1;
      ctx.beginPath();
      for (var i = 0; i < calm.length; i += 3) { ctx.moveTo(calm[i] + 1.3, calm[i + 1]); ctx.arc(calm[i], calm[i + 1], 1.3, 0, 6.2832); }
      ctx.fill();
      ctx.fillStyle = waveColor;
      for (var m = 0; m < moving.length; m += 3) {
        var s = Math.min(moving[m + 2] / 10, 1);
        ctx.globalAlpha = 0.15 + s * 0.4;
        ctx.beginPath(); ctx.arc(moving[m], moving[m + 1], 1.3 + s * 0.9, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    var tick = function () {
      var energy = step();
      render();
      raf = energy > 0.6 ? requestAnimationFrame(tick) : 0;
      if (!raf) { cur.fill(0); prev.fill(0); render(); }
    };

    readColors(); resize();
    window.addEventListener('resize', resize);
    new MutationObserver(function () { readColors(); render(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('pointermove', function (e) {
      // Faster movement makes a bigger wake, like a fish swimming quicker.
      var speed = lastX === null ? 0 : Math.min(Math.hypot(e.clientX - lastX, e.clientY - lastY), 40);
      lastX = e.clientX; lastY = e.clientY;
      disturb(e.clientX, e.clientY, 1, PUSH + speed * 0.06);
    }, { passive: true });
    window.addEventListener('pointerdown', function (e) { disturb(e.clientX, e.clientY, 2, 14); }, { passive: true });
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
