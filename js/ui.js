/* =========================================================
   RitmoK - utilitários compartilhados
   ========================================================= */

const UI = (() => {

  /* ---------- DOM ---------- */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) {
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  /* ---------- Texto ---------- */
  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function slug(str) {
    return String(str ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function uid(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- Datas / números ---------- */
  const pad = n => String(n).padStart(2, '0');

  function timecode(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  function dateBR(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function dateTimeBR(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function addDays(iso, days) {
    const d = iso ? new Date(iso) : new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  function isExpired(iso) {
    if (!iso) return false;
    return new Date(iso) < new Date();
  }

  /* ---------- Vídeo ---------- */
  /** Extrai o ID do YouTube de vários formatos de URL. Retorna '' se não for YouTube. */
  function youtubeId(url) {
    if (!url) return '';
    const u = String(url).trim();
    if (/(^|\.)youtu\.?be/i.test(u) || /youtube\.com/i.test(u) || /youtube-nocookie\.com/i.test(u)) {
      const patterns = [
        /[?&]v=([\w-]{6,})/,
        /youtu\.be\/([\w-]{6,})/,
        /youtube\.com\/embed\/([\w-]{6,})/,
        /youtube\.com\/shorts\/([\w-]{6,})/,
        /youtube\.com\/live\/([\w-]{6,})/,
        /youtube\.com\/v\/([\w-]{6,})/
      ];
      for (const p of patterns) {
        const m = u.match(p);
        if (m) return m[1];
      }
    }
    return '';
  }

  /** 'mp4' | 'youtube' | 'html5' */
  function videoType(url) {
    const yt = youtubeId(url);
    if (yt) return 'youtube';
    if (/\.m3u8(\?|$)/i.test(url)) return 'html5';
    return 'mp4';
  }

  /** URL de embed pronta para <iframe> (YouTube) */
  function embedUrl(url, startSeconds = 0) {
    const id = youtubeId(url);
    if (!id) return '';
    const start = Math.max(0, Math.floor(startSeconds || 0));
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&autoplay=1`
      + (start > 0 ? `&start=${start}` : '');
  }

  /* ---------- Toast ---------- */
  let toastWrap = null;
  function toast(msg, kind = '') {
    if (!toastWrap) {
      toastWrap = el('div', { class: 'toast-wrap' });
      document.body.appendChild(toastWrap);
    }
    const t = el('div', { class: 'toast ' + kind, text: msg });
    toastWrap.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateX(20px)';
      setTimeout(() => t.remove(), 320);
    }, 3200);
  }

  /* ---------- Confirmação ---------- */
  function confirmBox(message) {
    return window.confirm(message);
  }

  /* ---------- Ícones ---------- */
  const icons = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2m-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0-12a4 4 0 0 1 4 4v2H8v-2a4 4 0 0 1 4-4"/></svg>',
    search: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5 1.5-1.5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14"/></svg>',
    empty: '<svg viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2m0 12H4V8h16z"/></svg>',
    logout: '<svg viewBox="0 0 24 24"><path d="M17 8l-1.4 1.4L17.2 11H9v2h8.2l-1.6 1.6L17 16l4-4zM5 5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7v-2H5z"/></svg>'
  };

  const logo = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h3.2l3.3 6.1L13.4 3H16l-4.9 9.2L17 21h-3.3l-3.5-6.4L6.6 21H4l5.5-9.3z"/></svg>';

  /* ---------- Navbar (comum a todas as páginas) ---------- */
  function renderNavbar(opts = {}) {
    const host = qs('#navbar');
    if (!host) return;
    const { active = '' } = opts;
    const s = window.Store;
    const session = s.session();
    const brand = s.settings().brandName || 'RitmoK';

    host.className = 'navbar';
    host.innerHTML = '';

    host.appendChild(el('a', { class: 'logo', href: 'index.html', html: logo + `<span>${esc(brand)}</span>` }));

    const links = el('nav', { class: 'nav-links' });
    links.appendChild(el('a', { href: 'index.html', class: active === 'inicio' ? 'active' : '', text: 'Início' }));
    links.appendChild(el('a', { href: 'index.html#catalogo', text: 'Catálogo' }));
    if (session && session.role === 'student') {
      links.appendChild(el('a', { href: 'index.html#progresso', text: 'Minha lista' }));
    }
    if (session && session.role === 'admin') {
      links.appendChild(el('a', { href: 'admin.html', text: 'Painel do professor' }));
    }
    host.appendChild(links);
    host.appendChild(el('div', { class: 'nav-spacer' }));

    const search = el('div', { class: 'search-box' });
    const input = el('input', { type: 'search', placeholder: 'Buscar aulas', 'aria-label': 'Buscar aulas' });
    input.value = (window.__search || '');
    const btn = el('button', { class: 'icon-btn', 'aria-label': 'Buscar', html: icons.search, onclick: () => {
      search.classList.toggle('open');
      if (search.classList.contains('open')) input.focus();
    } });
    input.addEventListener('keydown', e => {
      window.__search = input.value;
      if (e.key === 'Enter') { search.classList.remove('open'); location.href = 'index.html?q=' + encodeURIComponent(input.value); }
    });
    input.addEventListener('input', () => { window.__search = input.value; });
    search.append(btn, input);
    host.appendChild(search);

    if (session) {
      const chip = el('div', { class: 'user-chip' });
      const initial = (session.name || session.email || '?').trim().charAt(0).toUpperCase();
      const avatar = el('button', { class: 'avatar', text: initial, 'aria-label': initial + ' — minha conta', title: 'Minha conta' });
      const dd = el('div', { class: 'dropdown' });
      dd.appendChild(el('div', { class: 'who' }, [
        el('strong', { text: session.name || session.email }),
        el('small', { text: session.role === 'admin' ? 'Professor (admin)' : session.email })
      ]));
      if (session.role === 'student') {
        dd.appendChild(el('button', { text: 'Meus acessos', onclick: () => location.href = 'index.html#minha-conta' }));
        dd.appendChild(el('button', { text: 'Painel do professor', onclick: () => location.href = 'admin.html' }));
      }
      dd.appendChild(el('button', { text: 'Sair', onclick: () => { s.logout(); location.href = 'index.html'; } }));
      avatar.addEventListener('click', e => { e.stopPropagation(); dd.classList.toggle('open'); });
      chip.append(avatar, dd);
      document.addEventListener('click', () => dd.classList.remove('open'));
      host.appendChild(chip);
    } else {
      host.appendChild(el('a', { class: 'btn btn-primary btn-sm', href: 'login.html', text: 'Entrar' }));
    }

    window.addEventListener('scroll', () => {
      host.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  return { qs, qsa, el, esc, slug, uid, timecode, dateBR, dateTimeBR, addDays, isExpired, youtubeId, videoType, embedUrl, toast, confirmBox, icons, logo, renderNavbar };
})();
