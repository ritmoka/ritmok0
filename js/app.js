/* =========================================================
   RitmoK - catálogo / home
   ========================================================= */

(() => {
  const { qs, el, esc, timecode, icons, toast } = UI;
  const S = window.Store;

  const CHEVRON_LEFT = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>';
  const CHEVRON_RIGHT = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M8.6 7.4 10 6l6 6-6 6-1.4-1.4 4.6-4.6z"/></svg>';

  const state = { heroIndex: 0, timer: null };

  /* ========================= HERO ========================= */

  function featuredCourses() {
    const all = S.allCourses();
    const featured = all.filter(c => c.featured);
    const trending = all.filter(c => c.trending && !c.featured);
    const rest = all.filter(c => !c.featured && !c.trending);
    return [...featured, ...trending, ...rest].slice(0, 5);
  }

  function renderHero() {
    const list = featuredCourses();
    const host = qs('#hero');
    if (!list.length) { host.style.display = 'none'; return; }

    if (state.heroIndex >= list.length) state.heroIndex = 0;
    const c = list[state.heroIndex];
    const eps = S.episodesOf(c.id);

    qs('#hero-bg').style.backgroundImage = `url("${Art.heroOf(c)}")`;
    qs('#hero-tag').textContent = c.featured ? 'Destaque' : (c.trending ? 'Em alta' : 'Novo no catálogo');
    qs('#hero-title').textContent = c.title;

    const meta = qs('#hero-meta');
    meta.innerHTML = '';
    meta.append(
      el('span', { class: 'match', text: (c.rating || 4.5).toFixed(1) + ' ★' }),
      el('span', { text: String(c.year || '') }),
      el('span', { class: 'badge badge-neutro', text: c.level || 'Aula' }),
      el('span', { text: `${eps.length} aulas` }),
      el('span', { text: UI.timecode(S.totalDuration(c.id)) }),
      el('span', { class: 'badge badge-neutro', text: c.category || 'Geral' })
    );

    qs('#hero-desc').textContent = c.tagline || c.description || '';

    const dots = qs('#hero-dots');
    dots.innerHTML = '';
    list.forEach((_, i) => {
      dots.appendChild(el('button', {
        class: i === state.heroIndex ? 'active' : '', 'aria-label': `Destaque ${i + 1}`,
        onclick: () => { state.heroIndex = i; renderHero(); }
      }));
    });

    qs('#hero-play').onclick = () => playFirstEpisode(c);
    qs('#hero-info').onclick = () => openModal(c);
  }

  function startHeroRotation() {
    if (!S.settings().heroRotation) return;
    clearInterval(state.timer);
    state.timer = setInterval(() => {
      state.heroIndex = (state.heroIndex + 1) % featuredCourses().length;
      renderHero();
    }, 9000);
  }

  /* ============================ CARDS ============================ */

  function courseCard(c) {
    const eps = S.episodesOf(c.id);
    const pct = S.courseProgress(c.id);
    const art = Art.cover(c);

    const card = el('article', { class: 'card', tabindex: '0', role: 'button' });
    card.appendChild(el('div', { class: 'card-art' }, [
      el('img', { src: art, alt: 'Capa de ' + c.title, loading: 'lazy' }),
      el('div', { class: 'play-ico' }, el('span', { html: icons.play }))
    ]));
    const info = el('div', { class: 'card-info' });
    info.append(
      el('h3', { text: c.title }),
      el('small', { text: `${eps.length} aulas · ${(c.rating || 4.5).toFixed(1)} ★${c.level ? ' · ' + c.level : ''}` })
    );
    card.appendChild(info);

    if (pct > 0) {
      card.querySelector('.card-art').appendChild(
        el('div', { class: 'card-progress' }, el('i', { style: { width: pct + '%' } }))
      );
    }

    const open = () => openModal(c);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    return card;
  }

  function episodeCard(p) {
    const ep = p.episode;
    const c = S.course(ep.courseId);
    const total = p.duration || 3600;
    const pct = Math.min(100, Math.round((p.seconds / total) * 100));

    const card = el('article', { class: 'card card-ep', tabindex: '0', role: 'button' });
    card.appendChild(el('div', { class: 'card-art' }, [
      el('img', { src: Art.episodeThumb(ep.id + ep.title, ep.number), alt: '', loading: 'lazy' }),
      el('div', { class: 'play-ico' }, el('span', { html: icons.play }))
    ]));
    card.querySelector('.card-art').appendChild(
      el('div', { class: 'card-progress' }, el('i', { style: { width: pct + '%' } }))
    );
    const info = el('div', { class: 'card-info' });
    info.append(
      el('h3', { text: ep.title }),
      el('small', { text: `${c ? c.title : ''}${p.seconds ? ' · ' + timecode(p.seconds) : ''}` })
    );
    card.appendChild(info);
    card.addEventListener('click', () => goPlayer(ep.id));
    return card;
  }

  /* ============================ ROWS ============================ */

  function row(title, count, cards, opts = {}) {
    if (!cards.length) return null;
    const scroll = el('div', { class: 'row-scroll' });
    cards.forEach(c => scroll.appendChild(c));

    const wrap = el('div', { class: 'row-wrap' }, scroll);
    const left = el('button', { class: 'row-arrow left', 'aria-label': 'Ver anteriores', title: 'Anteriores', html: CHEVRON_LEFT });
    const right = el('button', { class: 'row-arrow right', 'aria-label': 'Ver próximas', title: 'Próximos', html: CHEVRON_RIGHT });
    const step = () => Math.max(280, scroll.clientWidth * 0.8);
    left.onclick = () => scroll.scrollBy({ left: -step() });
    right.onclick = () => scroll.scrollBy({ left: step() });
    wrap.append(left, right);

    return el('section', { class: 'row', id: opts.id || '' }, [
      el('div', { class: 'row-head' }, [
        el('h2', { text: title }),
        count ? el('span', { class: 'count', text: count }) : null
      ]),
      wrap
    ]);
  }

  /* ============================ CATÁLOGO ============================ */

  function renderCatalog() {
    const host = qs('#catalog');
    host.innerHTML = '';

    const term = new URLSearchParams(location.search).get('q') || window.__search || '';
    const session = S.session();
    const student = S.currentStudent();
    const studentEmail = student ? student.email : null;

    /* --- busca --- */
    if (term && String(term).trim()) {
      const found = S.search(term);
      host.appendChild(el('div', { class: 'row-head', style: { marginBottom: '.6rem' } }, [
        el('h2', { text: `Resultados para "${term}"` }),
        el('span', { class: 'count', text: `${found.length} curso(s)` })
      ]));
      if (!found.length) {
        host.appendChild(el('div', { class: 'empty' }, [
          el('div', { html: icons.empty }),
          el('p', { text: 'Nenhuma aula encontrada com esse termo.' })
        ]));
        return;
      }
      found.forEach(c => host.appendChild(row(c.title, null, [courseCard(c)])));
      return;
    }

    /* --- minha conta / acesso --- */
    if (location.hash === '#minha-conta' || location.hash === '#progresso') {
      host.appendChild(accountPanel());
      if (location.hash === '#progresso') return;
    }

    /* --- continuar assistindo --- */
    const cw = S.continueWatching(studentEmail);
    if (cw.length) {
      host.appendChild(row('Continuar assistindo', `${cw.length} em andamento`, cw.map(episodeCard), { id: 'progresso' }));
    }

    /* --- em alta --- */
    const trending = S.allCourses().filter(c => c.trending);
    if (trending.length) host.appendChild(row('Em alta agora', 'Os mais acessados', trending.map(courseCard), { id: 'catalogo' }));

    /* --- por categoria --- */
    S.categories().forEach(cat => {
      const list = S.allCourses().filter(c => c.category === cat);
      host.appendChild(row(cat, `${list.length} curso(s)`, list.map(courseCard)));
    });

    /* --- novos --- */
    const all = S.allCourses();
    if (all.length) {
      host.appendChild(row('Todos os cursos', `${all.length} disponíveis`, all.map(courseCard)));
    }
  }

  /* ---------- painel da conta do aluno ---------- */

  function accountPanel() {
    const box = el('section', { class: 'card-box', style: { background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.4rem', marginBottom: '2rem' } });
    const session = S.session();
    const st = S.currentStudent();

    if (!session || session.role !== 'student') {
      box.append(
        el('h2', { text: 'Minha lista', style: { margin: '0 0 .4rem' } }),
        el('p', { text: 'Entre com sua conta para salvar seu progresso e continuar de onde parou.', style: { color: 'var(--muted)', margin: '0 0 1rem' } }),
        el('a', { class: 'btn btn-primary', href: 'login.html', text: 'Entrar ou criar conta' })
      );
      return box;
    }

    const status = S.statusOf(st);
    box.append(
      el('h2', { text: 'Olá, ' + (st.name || '').split(' ')[0] + '!', style: { margin: '0 0 .2rem', fontSize: '1.3rem' } }),
      el('p', { style: { margin: '0 0 1rem', color: 'var(--muted)', fontSize: '.9rem' } }, [
        'Seu acesso: ',
        el('span', { class: 'badge badge-' + status.key, text: status.label })
      ])
    );

    if (status.key !== 'ativo') {
      box.append(
        el('div', { class: 'lock-note', html: icons.lock + ' <span>Renove sua assinatura para assistir às aulas e salvar seu progresso.</span>' }),
        el('button', { class: 'btn btn-primary', text: 'Renovar assinatura', onclick: () => { location.href = 'login.html#planos'; } })
      );
    } else {
      const mine = S.myCourses(st.email);
      const totalDone = S.allProgress().filter(p => String(p.email).toLowerCase() === st.email.toLowerCase() && p.completed).length;
      box.append(el('div', { class: 'stat-row', style: { margin: '0 0 1rem' } }, [
        el('div', { class: 'stat' }, [el('div', { class: 'v', text: String(mine.length) }), el('div', { class: 'l', text: 'Cursos iniciados' })]),
        el('div', { class: 'stat' }, [el('div', { class: 'v', text: String(totalDone) }), el('div', { class: 'l', text: 'Aulas concluídas' })]),
        el('div', { class: 'stat' }, [el('div', { class: 'v', text: String(S.continueWatching(st.email).length) }), el('div', { class: 'l', text: 'Em andamento' })])
      ]));
      if (mine.length) {
        box.appendChild(el('p', { style: { color: 'var(--muted)', fontSize: '.85rem', margin: '0' }, text: 'Continue de onde parou na fileira "Continuar assistindo" acima.' }));
      }
    }
    return box;
  }

  /* ============================ MODAL DO CURSO ============================ */

  let modalCourseId = null;

  function openModal(course) {
    const c = S.course(course) || course;
    if (!c) return;
    modalCourseId = c.id;

    const eps = S.episodesOf(c.id);
    const modal = qs('#modal');
    modal.innerHTML = '';

    const hero = el('div', { class: 'modal-hero' }, el('img', { src: Art.heroOf(c), alt: c.title }));
    hero.appendChild(el('button', {
      class: 'icon-btn modal-close', 'aria-label': 'Fechar detalhes', title: 'Fechar',
      html: '<svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
      onclick: closeModal
    }));

    const body = el('div', { class: 'modal-body' });
    body.appendChild(el('h2', { text: c.title }));

    const meta = el('div', { class: 'modal-meta' });
    meta.append(
      el('span', { class: 'match', style: { color: 'var(--green)', fontWeight: '700' }, text: (c.rating || 4.5).toFixed(1) + ' ★' }),
      el('span', { text: String(c.year || '') }),
      el('span', { class: 'badge badge-neutro', text: c.level || 'Aula' }),
      el('span', { text: `${eps.length} aulas` }),
      el('span', { text: UI.timecode(S.totalDuration(c.id)) })
    );
    body.appendChild(meta);

    const actions = el('div', { style: { display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '1.4rem' } });
    actions.append(
      el('button', { class: 'btn btn-primary', text: eps.length ? '▶  Começar a assistir' : 'Sem aulas ainda', onclick: () => playFirstEpisode(c) })
    );
    if (eps.length) {
      actions.appendChild(el('button', {
        class: 'btn btn-outline', text: '▶  Continuar de onde parei',
        onclick: () => {
          const res = S.continueWatching().find(x => x.episode.courseId === c.id);
          if (res) goPlayer(res.episodeId);
          else { toast('Você ainda não começou este curso.'); }
        }
      }));
    }
    body.appendChild(actions);

    const grid = el('div', { class: 'modal-grid' });
    const left = el('div');
    left.appendChild(el('p', { class: 'modal-desc', text: c.description || 'Sem descrição.' }));
    left.appendChild(el('h3', { class: 'section-title', text: `Aulas (${eps.length})` }));

    if (!eps.length) {
      left.appendChild(el('div', { class: 'empty', text: 'Este curso ainda não tem aulas cadastradas.' }));
    } else {
      const list = el('ul', { class: 'ep-list' });
      eps.forEach(ep => list.appendChild(epListItem(ep, c)));
      left.appendChild(list);
    }

    const right = el('div', { style: { fontSize: '.88rem' } });
    right.append(
      factRow('Instrutor', c.instructor || '—'),
      factRow('Categoria', c.category || '—'),
      factRow('Nível', c.level || '—'),
      factRow('Ano', c.year || '—'),
      factRow('Duração total', UI.timecode(S.totalDuration(c.id))),
      factRow('Progresso', S.courseProgress(c.id) + '%')
    );
    grid.append(left, right);
    body.appendChild(grid);

    modal.append(hero, body);
    openOverlay('#modal-overlay');
  }

  function factRow(label, value) {
    return el('div', { class: 'modal-facts' }, [el('b', { text: label + ': ' }), document.createTextNode(String(value))]);
  }

  function epListItem(ep, course) {
    const prog = S.progressFor(ep.id);
    const done = prog && prog.completed;

    const item = el('li', { class: 'ep-item', role: 'button', tabindex: '0' });
    const thumb = el('div', { class: 'ep-thumb' });
    thumb.append(el('img', { src: Art.episodeThumb(ep.id + ep.title, ep.number), alt: '', loading: 'lazy' }));
    thumb.appendChild(el('span', { class: 'num', text: String(ep.number) }));

    const bodyEl = el('div', { class: 'ep-body' });
    const h = el('h4');
    h.appendChild(document.createTextNode(`${ep.number}. ${ep.title}`));
    if (done) h.appendChild(el('span', { class: 'ep-done', title: 'Concluída', html: icons.check }));
    bodyEl.append(h, el('p', { text: ep.description || 'Sem descrição.' }));

    const meta = el('small', { style: { color: 'var(--muted)', fontSize: '.75rem' } });
    meta.textContent = `${ep.duration || '--:--'}${prog && prog.seconds ? ' · visto até ' + timecode(prog.seconds) : ''}`;
    bodyEl.appendChild(meta);

    item.append(thumb, bodyEl);
    const go = () => { closeModal(); goPlayer(ep.id); };
    item.addEventListener('click', go);
    item.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    return item;
  }

  /* ============================ NAVEGAÇÃO ============================ */

  function playFirstEpisode(course) {
    const eps = S.episodesOf(course.id);
    if (!eps.length) { toast('Este curso ainda não tem aulas.'); return; }
    const res = S.continueWatching().find(x => x.episode.courseId === course.id);
    goPlayer(res ? res.episodeId : eps[0].id);
  }

  function goPlayer(episodeId) {
    const gate = S.canWatch();
    if (!gate.ok) {
      toast(gate.reason, '');
      setTimeout(() => location.href = 'login.html?next=' + encodeURIComponent('player.html?id=' + episodeId), 900);
      return;
    }
    const ep = S.episode(episodeId);
    if (ep && ep.courseId && !S.hasCourseCode(ep.courseId)) {
      const c = S.course(ep.courseId);
      const answer = prompt(`"${c.title}" é um curso com código de acesso.\n\nDigite o código fornecido pelo professor:`);
      if (answer === null) return;
      if (!S.grantCourseCode(ep.courseId, answer)) {
        toast('Código incorreto.', '');
        return;
      }
      toast('Acesso liberado!', 'ok');
    }
    location.href = 'player.html?id=' + encodeURIComponent(episodeId);
  }

  /* ============================ OVERLAYS ============================ */

  function openOverlay(sel) {
    qs(sel).classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    qs('#modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  qs('#modal-overlay').addEventListener('click', e => { if (e.target.id === 'modal-overlay') closeModal(); });

  /* ============================ BOOT ============================ */

  function applyBrand() {
    const s = S.settings();
    const brand = s.brandName || 'RitmoK';
    document.title = 'Início — ' + brand;
    const fc = qs('#footer-contact');
    if (fc) fc.innerHTML = '';
    if (fc) fc.appendChild(el('li', { text: s.contactEmail || 'contato@ritmok.com' }));
    qs('#footer-brand').textContent = brand + ' — Prof. Kennedy';
  }

  async function init() {
    await S.ready();
    UI.renderNavbar({ active: 'inicio' });
    applyBrand();
    renderHero();
    startHeroRotation();
    renderCatalog();
    window.addEventListener('store:changed', () => { renderHero(); renderCatalog(); });
    window.addEventListener('hashchange', renderCatalog);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
