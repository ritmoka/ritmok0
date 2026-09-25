/* =========================================================
   RitmoK - geração de capas artwork (SVG inline, 100% offline)
   Se o professor cadastrar uma URL de imagem, ela tem prioridade.
   ========================================================= */

const Art = (() => {

  const PALETTES = [
    ['#e50914', '#7f1d1d', '#0b0b0d'],
    ['#2563eb', '#1e3a8a', '#0b0b0d'],
    ['#059669', '#064e3b', '#0b0b0d'],
    ['#7c3aed', '#4c1d95', '#0b0b0d'],
    ['#f59e0b', '#78350f', '#0b0b0d'],
    ['#0ea5e9', '#0c4a6e', '#0b0b0d'],
    ['#db2777', '#831843', '#0b0b0d'],
    ['#14b8a6', '#134e4a', '#0b0b0d'],
    ['#ef4444', '#7f1d1d', '#1c1917'],
    ['#6366f1', '#312e81', '#0b0b0d']
  ];

  function hash(str) {
    let h = 0;
    const s = String(str ?? '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function paletteFor(seed) {
    return PALETTES[hash(seed) % PALETTES.length];
  }

  function svgUri(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/\s{2,}/g, ' '));
  }

  /** Formas geométricas determinísticas a partir de uma seed */
  function shapes(seed, w, h, count = 7) {
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const out = [];
    for (let i = 0; i < count; i++) {
      const x = rnd() * w, y = rnd() * h;
      const r = (0.08 + rnd() * 0.35) * Math.min(w, h);
      const rot = Math.floor(rnd() * 90);
      const op = (0.06 + rnd() * 0.18).toFixed(2);
      if (i % 3 === 0) {
        out.push(`<rect x="${(x - r).toFixed(0)}" y="${(y - r).toFixed(0)}" width="${(r * 2).toFixed(0)}" height="${(r * 2).toFixed(0)}" rx="${(r * .18).toFixed(0)}" fill="#fff" opacity="${op}" transform="rotate(${rot} ${x.toFixed(0)} ${y.toFixed(0)})"/>`);
      } else if (i % 3 === 1) {
        out.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="#fff" opacity="${op}"/>`);
      } else {
        out.push(`<polygon points="${x.toFixed(0)},${(y - r).toFixed(0)} ${(x + r).toFixed(0)},${(y + r).toFixed(0)} ${(x - r).toFixed(0)},${(y + r).toFixed(0)}" fill="#fff" opacity="${op}"/>`);
      }
    }
    return out.join('');
  }

  /** Arte de fundo panorâmica (16:9 / backdrop do hero) */
  function backdrop(seed, title = '') {
    const [c1, c2, c3] = paletteFor(seed);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c1}"/>
          <stop offset="0.55" stop-color="${c2}"/>
          <stop offset="1" stop-color="${c3}"/>
        </linearGradient>
        <radialGradient id="r" cx="0.75" cy="0.2" r="0.8">
          <stop offset="0" stop-color="#fff" stop-opacity="0.22"/>
          <stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#g)"/>
      ${shapes(hash(seed), 1600, 900, 12)}
      <rect width="1600" height="900" fill="url(#r)"/>
      <rect x="0" y="640" width="1600" height="260" fill="#000" opacity="0.45"/>
    </svg>`;
    return svgUri(svg);
  }

  /** Capa 16:9 usada nos cards horizontais */
  function wide(seed, title = '') {
    const [c1, c2, c3] = paletteFor(seed);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="0.6" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/>
      </linearGradient></defs>
      <rect width="640" height="360" fill="url(#g)"/>
      ${shapes(hash(seed), 640, 360, 8)}
      <rect x="0" y="250" width="640" height="110" fill="#000" opacity="0.4"/>
    </svg>`;
    return svgUri(svg);
  }

  /** Capa vertical 2:3 estilo pôster */
  function poster(seed, title = '') {
    const [c1, c2, c3] = paletteFor(seed);
    const words = String(title || '').split(/\s+/).slice(0, 4);
    const lines = words.map((w, i) =>
      `<text x="36" y="${170 + i * 44}" font-family="Segoe UI, Arial, sans-serif" font-size="38" font-weight="800" fill="#fff" opacity="0.95">${w.replace(/[<>&]/g, '')}</text>`
    ).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0.7" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="0.65" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/>
      </linearGradient></defs>
      <rect width="400" height="600" fill="url(#g)"/>
      ${shapes(hash(seed), 400, 600, 9)}
      <rect y="120" width="400" height="330" fill="#000" opacity="0.25"/>
      <rect x="0" y="440" width="400" height="160" fill="#000" opacity="0.55"/>
      <rect x="30" y="140" width="52" height="5" fill="#fff" opacity="0.9"/>
      ${lines}
    </svg>`;
    return svgUri(svg);
  }

  /** Miniatura de aula (16:9) */
  function episodeThumb(seed, number) {
    const [c1, c2, c3] = paletteFor(seed);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/>
      </linearGradient></defs>
      <rect width="320" height="180" fill="url(#g)"/>
      ${shapes(hash(seed), 320, 180, 5)}
      <rect width="320" height="180" fill="#000" opacity="0.35"/>
      <text x="160" y="108" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="54" font-weight="800" fill="#fff" opacity="0.9">${String(number || 1).padStart(2, '0')}</text>
    </svg>`;
    return svgUri(svg);
  }

  /** Avatar do aluno */
  function avatar(name = '') {
    const seed = hash(name);
    const [c1, c2] = paletteFor(seed);
    const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient></defs>
      <rect width="96" height="96" rx="48" fill="url(#g)"/>
      <text x="48" y="62" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="800" fill="#fff">${initial.replace(/[<>&]/g, '')}</text>
    </svg>`;
    return svgUri(svg);
  }

  /* Resolvedores: prioriza imagem cadastrada pelo professor */
  const cover = (course) => (course && (course.cover || course.backdrop)) || wide(course ? course.id + course.title : 'x');
  const posterOf = (course) => (course && course.poster) || poster(course ? course.id + course.title : 'x');
  const heroOf = (course) => (course && (course.backdrop || course.cover)) || backdrop(course ? course.id + course.title : 'x');

  return { wide, poster, backdrop, episodeThumb, avatar, cover, posterOf, heroOf, paletteFor, hash };
})();
