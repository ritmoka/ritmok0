/* =========================================================
   RitmoK - painel do professor (admin)
   ========================================================= */

(() => {
  const { qs, el, esc, toast, confirmBox } = UI;
  const S = window.Store;

  const TABS = [
    { id: 'resumo', label: 'Visão geral' },
    { id: 'cursos', label: 'Cursos' },
    { id: 'aulas', label: 'Aulas' },
    { id: 'alunos', label: 'Alunos' },
    { id: 'pagamentos', label: 'Pagamentos' },
    { id: 'progresso', label: 'Progresso' },
    { id: 'config', label: 'Configurações' }
  ];

  let tab = 'resumo';
  let filterCourse = '';

  /* ============================ PORTÃO ============================ */

  const emailBox = () => qs('#gate-email');
  const passBox = () => qs('#gate-pass');

  function showGate() {
    qs('#gate').style.display = 'grid';
    qs('#shell').style.display = 'none';
    setTimeout(() => {
      const n = S.isCloud() ? emailBox() : passBox();
      if (n) n.focus();
    }, 80);
  }

  function showPanel() {
    qs('#gate').style.display = 'none';
    qs('#shell').style.display = 'block';
    qs('#top-name').textContent = 'Painel do Professor — ' + (S.settings().brandName || 'RitmoK');
    renderTabs();
    render();
  }

  qs('#gate-form').addEventListener('submit', async e => {
    e.preventDefault();
    const box = qs('#gate-error');
    const btn = qs('#gate-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando…'; }

    const email = S.isCloud() && emailBox() ? emailBox().value : '';
    const pass = passBox().value;

    const r = await S.adminLogin(email, pass);
    if (r.ok) {
      await S.ready();
      showPanel();
    } else {
      box.textContent = r.error || 'Não foi possível entrar.';
      box.classList.add('show');
    }
    if (btn) { btn.disabled = false; btn.textContent = S.isCloud() ? 'Entrar no painel' : 'Entrar no painel'; }
  });

  qs('#btn-logout').onclick = async () => { await S.logout(); showGate(); };

  /* ============================ NAVEGAÇÃO ============================ */

  function renderTabs() {
    const host = qs('#tabs');
    host.innerHTML = '';
    TABS.forEach(t => {
      const b = el('button', { class: tab === t.id ? 'active' : '', text: t.label, onclick: () => { tab = t.id; renderTabs(); render(); } });
      host.appendChild(b);
    });
  }

  function render() {
    const v = qs('#view');
    v.innerHTML = '';
    ({
      resumo: viewResumo, cursos: viewCursos, aulas: viewAulas,
      alunos: viewAlunos, pagamentos: viewPagamentos,
      progresso: viewProgresso, config: viewConfig
    }[tab] || viewResumo)(v);
  }

  /* ---------- helpers ---------- */

  function field(label, node, hint, full) {
    return el('div', { class: 'field' + (full ? ' full' : '') }, [
      el('label', { text: label }), node,
      hint ? el('div', { class: 'hint', text: hint }) : null
    ]);
  }
  function input(attrs) { return el('input', Object.assign({ class: 'input' }, attrs)); }
  function area(attrs) { return el('textarea', Object.assign({ class: 'input' }, attrs)); }
  function select(attrs, options) {
    const s = el('select', Object.assign({ class: 'input' }, attrs));
    options.forEach(o => s.appendChild(el('option', { value: o.value, selected: o.value === attrs.value || undefined }, o.label)));
    return s;
  }
  function box(title, subtitle, children) {
    return el('section', { class: 'card-box' }, [
      title ? el('h3', {}, [title, subtitle ? el('small', { text: subtitle }) : null]) : null
    ].concat(children));
  }
  function statusBadge(student) {
    const s = S.statusOf(student);
    return el('span', { class: 'badge badge-' + s.key, text: s.label });
  }
  function emptyState(text) {
    return el('div', { class: 'empty' }, [el('div', { html: UI.icons.empty }), el('p', { text })]);
  }

  /* ============================ VISÃO GERAL ============================ */

  function viewResumo(host) {
    const courses = S.allCourses();
    const eps = S.allEpisodes();
    const students = S.allStudents();
    const pending = S.allPayments().filter(p => p.status === 'pendente');
    const active = students.filter(s => S.statusOf(s).key === 'ativo');
    const doneProgress = S.allProgress().filter(p => p.completed);

    const minutes = doneProgress.reduce((acc, p) => acc + Math.round((p.duration || p.seconds || 0) / 60), 0);

    host.appendChild(el('div', { class: 'stat-row' }, [
      stat(courses.length, 'Cursos cadastrados'),
      stat(eps.length, 'Aulas publicadas'),
      stat(students.length, 'Alunos cadastrados'),
      stat(active.length, 'Alunos com acesso ativo'),
      stat(pending.length, 'Pagamentos pendentes', pending.length ? 'var(--yellow)' : ''),
      stat(Math.floor(minutes / 60) + 'h', 'Horas de aula concluídas')
    ]));

    //últimos pagamentos
    const pays = S.allPayments().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
    const pBox = box('Últimos pagamentos', null, []);
    if (!pays.length) pBox.appendChild(emptyState('Nenhum pagamento registrado ainda.'));
    else {
      const t = el('table', { class: 'data' });
      t.appendChild(el('thead', {}, el('tr', {}, [
        el('th', { text: 'Aluno' }), el('th', { text: 'Plano' }), el('th', { text: 'Valor' }),
        el('th', { text: 'Forma' }), el('th', { text: 'Situação' }), el('th', { text: 'Data' }), el('th', { text: '' })
      ])));
      const tb = el('tbody');
      pays.forEach(p => {
        const st = p.status === 'aprovado' ? 'ativo' : p.status === 'pendente' ? 'pendente' : 'vencido';
        tb.appendChild(el('tr', {}, [
          el('td', {}, [el('strong', { text: p.studentName || p.email }), el('br'), el('small', { style: { color: 'var(--muted)' }, text: p.email })]),
          el('td', { text: p.planName }),
          el('td', { text: money(p.amount) }),
          el('td', { text: p.methodName }),
          el('td', {}, el('span', { class: 'badge badge-' + st, text: p.status })),
          el('td', { text: UI.dateBR(p.createdAt) }),
          el('td', {}, p.status === 'pendente'
            ? el('div', { class: 'row-actions' }, [
                el('button', { class: 'mini ok', text: 'Aprovar', onclick: () => { S.approvePayment(p.id); toast('Pagamento aprovado e acesso liberado.', 'ok'); render(); } }),
                el('button', { class: 'mini danger', text: 'Recusar', onclick: () => { S.rejectPayment(p.id); render(); } })
              ])
            : el('small', { style: { color: 'var(--muted)' }, text: p.approvedAt ? 'ok' : '—' }))
        ]));
      });
      t.appendChild(tb);
      pBox.appendChild(t);
    }
    host.appendChild(pBox);

    // cursos mais acessados
    const counts = {};
    S.allProgress().forEach(p => { if (p.courseId) counts[p.courseId] = (counts[p.courseId] || 0) + 1; });
    const top = Object.entries(counts).map(([id, n]) => ({ c: S.course(id), n })).filter(x => x.c)
      .sort((a, b) => b.n - a.n).slice(0, 8);

    const tBox = box('Cursos mais estudados', 'Conta cada progresso salvo pelos alunos', []);
    if (!top.length) tBox.appendChild(emptyState('Ainda não há progresso registrado.'));
    else top.forEach(x => {
      const pct = S.courseProgress(x.c.id);
      tBox.appendChild(el('div', { style: { marginBottom: '.9rem' } }, [
        el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '.88rem', marginBottom: '.25rem' } }, [
          el('strong', { text: x.c.title }),
          el('span', { style: { color: 'var(--muted)' }, text: `${pct}% concluído · ${x.n} registro(s)` })
        ]),
        el('div', { class: 'bar', style: { margin: 0 } }, el('i', { style: { width: pct + '%' } }))
      ]));
    });
    host.appendChild(tBox);
  }

  function stat(v, label, color) {
    return el('div', { class: 'stat' }, [
      el('div', { class: 'v', text: String(v), style: color ? { color } : {} }),
      el('div', { class: 'l', text: label })
    ]);
  }

  const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  /* ============================ CURSOS ============================ */

  function viewCursos(host) {
    const editing = { id: null };
    const form = courseForm(editing);
    host.appendChild(form.wrap);

    const courses = S.allCourses();
    const list = box('Cursos cadastrados', `${courses.length} curso(s) — marque um como "Destaque" para ele abrir a home`, []);

    if (!courses.length) {
      list.appendChild(emptyState('Nenhum curso ainda. Use o formulário acima para criar o primeiro.'));
    } else {
      const table = el('table', { class: 'data' });
      table.appendChild(el('thead', {}, el('tr', {}, ['Capa', 'Curso', 'Aulas', 'Progresso', 'Restrito', 'Ações'].map(h => el('th', { text: h })))));
      table.appendChild(el('tbody', {}, courseRows(courses)));
      list.appendChild(table);
    }
    host.appendChild(list);
  }

  function courseRows(courses) {
    return courses.map(c => {
      const eps = S.episodesOf(c.id);
      return el('tr', {}, [
        el('td', {}, el('img', { class: 'thumb poster', src: Art.posterOf(c), alt: '' })),
        el('td', {}, [
          el('strong', { text: c.title }),
          c.featured ? el('span', { class: 'badge badge-ativo', style: { marginLeft: '.4rem' }, text: 'Destaque' }) : null,
          c.trending ? el('span', { class: 'badge badge-pendente', style: { marginLeft: '.4rem' }, text: 'Em alta' }) : null,
          el('br'), el('small', { style: { color: 'var(--muted)' }, text: `${c.instructor || 'sem instrutor'} · ${c.category || 'geral'}` })
        ]),
        el('td', { text: String(eps.length) }),
        el('td', { text: S.courseProgress(c.id) + '%' }),
        el('td', { text: c.code ? 'sim' : 'livre' }),
        el('td', {}, el('div', { class: 'row-actions' }, [
          el('button', { class: 'mini', text: 'Editar', onclick: () => courseFormRef.load(c) }),
          el('button', { class: 'mini', text: 'Aulas', onclick: () => { filterCourse = c.id; tab = 'aulas'; renderTabs(); render(); } }),
          el('button', { class: 'mini danger', text: 'Excluir', onclick: () => {
            if (!confirmBox(`Excluir "${c.title}" e suas ${eps.length} aula(s)? Essa ação não pode ser desfeita.`)) return;
            S.save(d => { d.courses = d.courses.filter(x => x.id !== c.id); d.episodes = d.episodes.filter(e => e.courseId !== c.id); });
            toast('Curso excluído.');
            render();
          } })
        ]))
      ]);
    });
  }

  let courseFormRef = null;

  function courseForm(editing) {
    const f = {
      title: input({ placeholder: 'Ex.: Matemática do Zero ao Avançado' }),
      tagline: input({ placeholder: 'Frase curta que aparece no destaque' }),
      instructor: input({ placeholder: 'Nome do professor' }),
      category: input({ placeholder: 'Exatas, Tecnologia, Idiomas…' }),
      level: input({ placeholder: 'Iniciante, Intermediário…' }),
      year: input({ type: 'number', placeholder: '2026' }),
      rating: input({ type: 'number', step: '0.1', min: '0', max: '5', placeholder: '4.8' }),
      code: input({ placeholder: 'Deixe vazio = acesso livre' }),
      cover: input({ placeholder: 'URL da imagem 16:9 (opcional)' }),
      poster: input({ placeholder: 'URL do pôster 2:3 (opcional)' }),
      description: area({ placeholder: 'Descrição completa que aparece na página do curso' })
    };
    const feat = el('input', { type: 'checkbox' });
    const trend = el('input', { type: 'checkbox' });
    const imgPrev = el('img', { style: { width: '150px', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '6px', marginTop: '.4rem' } });

    const preview = () => {
      const seed = f.title.value || 'novo';
      imgPrev.src = f.cover.value || Art.wide(seed, f.title.value);
    };
    f.title.addEventListener('input', preview);
    f.cover.addEventListener('input', preview);

    const title = el('h3', { text: 'Novo curso' });

    function reset() {
      editing.id = null;
      title.textContent = 'Novo curso';
      Object.values(f).forEach(n => { n.value = ''; });
      feat.checked = false; trend.checked = false;
      preview();
    }

    const save = () => {
      const t = f.title.value.trim();
      if (!t) { toast('Informe o título do curso.', ''); return; }
      const data = {
        title: t,
        tagline: f.tagline.value.trim(),
        instructor: f.instructor.value.trim(),
        category: f.category.value.trim() || 'Geral',
        level: f.level.value.trim(),
        year: Number(f.year.value) || new Date().getFullYear(),
        rating: Number(f.rating.value) || 4.5,
        code: f.code.value.trim(),
        cover: f.cover.value.trim(),
        poster: f.poster.value.trim(),
        description: f.description.value.trim(),
        featured: feat.checked,
        trending: trend.checked
      };
      if (editing.id) {
        S.save(d => { const c = d.courses.find(x => x.id === editing.id); if (c) Object.assign(c, data); });
        toast('Curso atualizado.', 'ok');
        reset();
      } else {
        S.save(d => { d.courses.push(Object.assign({ id: UI.uid('c'), createdAt: new Date().toISOString() }, data)); });
        toast('Curso criado! Agora cadastre as aulas.', 'ok');
        reset();
      }
      render();
    };

    const wrap = box(null, null, [
      title,
      el('div', { class: 'form-grid' }, [
        field('Título do curso *', f.title, null, true),
        field('Frase de destaque', f.tagline, null, true),
        field('Professor / instrutor', f.instructor),
        field('Categoria', f.category),
        field('Nível', f.level),
        field('Ano', f.year),
        field('Nota (0 a 5)', f.rating),
        field('Código de acesso', f.code, 'Se preencher, o aluno precisa digitar este código para assistir.', true),
        field('Imagem de capa (URL)', f.cover, 'Deixe vazio para gerar uma capa automática.', true),
        field('Pôster vertical (URL)', f.poster, null, true),
        field('Descrição', f.description, 'Explique o que o aluno vai aprender.', true),
        el('div', { class: 'field' }, [
          el('label', { text: 'Destaques' }),
          el('label', { style: { display: 'flex', gap: '.5rem', alignItems: 'center', fontSize: '.9rem', textTransform: 'none', letterSpacing: 0, color: 'var(--text)', fontWeight: '400' } }, [feat, document.createTextNode('Exibir em destaque na home')]),
          el('label', { style: { display: 'flex', gap: '.5rem', alignItems: 'center', fontSize: '.9rem', textTransform: 'none', letterSpacing: 0, color: 'var(--text)', fontWeight: '400', marginTop: '.4rem' } }, [trend, document.createTextNode('Marcar como "Em alta"')]),
          imgPrev
        ])
      ]),
      el('div', { style: { display: 'flex', gap: '.6rem', marginTop: '.4rem' } }, [
        el('button', { class: 'btn btn-primary', text: 'Salvar curso', onclick: save }),
        el('button', { class: 'btn btn-outline', text: 'Limpar campos', onclick: reset })
      ])
    ]);

    const api = {
      wrap,
      load(c) {
        editing.id = c.id;
        title.textContent = 'Editando: ' + c.title;
        f.title.value = c.title || ''; f.tagline.value = c.tagline || '';
        f.instructor.value = c.instructor || ''; f.category.value = c.category || '';
        f.level.value = c.level || ''; f.year.value = c.year || ''; f.rating.value = c.rating || '';
        f.code.value = c.code || ''; f.cover.value = c.cover || ''; f.poster.value = c.poster || '';
        f.description.value = c.description || '';
        feat.checked = !!c.featured; trend.checked = !!c.trending;
        preview();
        wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    courseFormRef = api;
    preview();
    return api;
  }

  /* ============================ AULAS ============================ */

  function viewAulas(host) {
    const courses = S.allCourses();
    if (!courses.length) {
      host.appendChild(box(null, null, [emptyState('Cadastre um curso primeiro para poder adicionar aulas.')]));
      return;
    }
    if (!filterCourse || !S.course(filterCourse)) filterCourse = courses[0].id;
    const course = S.course(filterCourse);

    // filtro por curso
    const chips = el('div', { class: 'chip-list' });
    courses.forEach(c => {
      chips.appendChild(el('div', {
        class: 'chip' + (c.id === filterCourse ? ' active' : ''), text: `${c.title} (${S.episodesOf(c.id).length})`,
        onclick: () => { filterCourse = c.id; render(); }
      }));
    });
    host.appendChild(box('Selecione o curso', null, [chips]));

    const editing = { id: null };
    const f = {
      number: input({ type: 'number', min: '1', value: '' }),
      title: input({ placeholder: 'Título da aula' }),
      duration: input({ placeholder: '00:22 (opcional)' }),
      videoUrl: input({ placeholder: 'https://…/aula.mp4  ou  https://youtu.be/…' }),
      description: area({ placeholder: 'Resumo da aula' })
    };
    const typeHint = el('div', { class: 'hint' });
    const check = () => {
      const t = UI.videoType(f.videoUrl.value);
      typeHint.textContent = t === 'youtube' ? 'Detectado: YouTube (será exibido com o player embutido).'
        : t === 'html5' ? 'Detectado: stream HLS (.m3u8).'
        : f.videoUrl.value ? 'Detectado: vídeo MP4 direto (recomendado).' : '';
    };
    f.videoUrl.addEventListener('input', check);

    const title = el('h3', { text: 'Nova aula' });

    const wrap = box(null, null, [
      title,
      el('div', { class: 'form-grid' }, [
        field('Número da aula', f.number, null, false),
        field('Duração', f.duration, 'mm:ss', false),
        field('Título da aula *', f.title, null, true),
        field('Link do vídeo *', f.videoUrl, 'Aceita link de MP4 ou link do YouTube.', true),
        el('div', { class: 'full' }, [field('Descrição', f.description)]),
        el('div', { class: 'full' }, typeHint)
      ]),
      el('div', { style: { display: 'flex', gap: '.6rem', marginTop: '.3rem' } }, [
        el('button', { class: 'btn btn-primary', text: 'Salvar aula', onclick: save }),
        el('button', { class: 'btn btn-outline', text: 'Limpar', onclick: () => { editing.id = null; title.textContent = 'Nova aula'; reset(); } })
      ])
    ]);
    host.appendChild(wrap);

    function reset() {
      f.number.value = ''; f.title.value = ''; f.duration.value = ''; f.videoUrl.value = ''; f.description.value = '';
      typeHint.textContent = '';
    }

    function save() {
      if (!f.title.value.trim()) { toast('Informe o título da aula.', ''); return; }
      if (!f.videoUrl.value.trim()) { toast('Informe o link do vídeo.', ''); return; }
      const num = Number(f.number.value) || (S.episodesOf(filterCourse).length + 1);
      const data = {
        courseId: filterCourse,
        number: num,
        title: f.title.value.trim(),
        duration: f.duration.value.trim(),
        videoUrl: f.videoUrl.value.trim(),
        description: f.description.value.trim()
      };
      if (editing.id) {
        S.save(d => { const e = d.episodes.find(x => x.id === editing.id); if (e) Object.assign(e, data); });
        toast('Aula atualizada.', 'ok');
      } else {
        S.save(d => { d.episodes.push(Object.assign({ id: UI.uid('e'), createdAt: new Date().toISOString() }, data)); });
        toast('Aula salva e publicada!', 'ok');
      }
      reset();
      render();
    }

    // lista de aulas do curso
    const list = box('Aulas de ' + course.title, `${S.episodesOf(course.id).length} aulas`, []);
    const eps = S.episodesOf(course.id);
    if (!eps.length) list.appendChild(emptyState('Nenhuma aula neste curso ainda.'));

    if (eps.length) {
      const t = el('table', { class: 'data' });
      t.appendChild(el('thead', {}, el('tr', {}, ['#', 'Capa', 'Aula', 'Vídeo', 'Progresso', 'Ações'].map(h => el('th', { text: h })))));
      const tb = el('tbody');
      eps.forEach(e => {
        const type = UI.videoType(e.videoUrl);
        const p = S.allProgress().filter(x => x.episodeId === e.id);
        const doneCount = p.filter(x => x.completed).length;
        tb.appendChild(el('tr', {}, [
          el('td', { text: String(e.number) }),
          el('td', {}, el('img', { class: 'thumb', src: Art.episodeThumb(e.id + e.title, e.number), alt: '' })),
          el('td', {}, [
            el('strong', { text: e.title }),
            el('br'), el('small', { style: { color: 'var(--muted)' }, text: (e.description || '').slice(0, 70) })
          ]),
          el('td', {}, [
            el('span', { class: 'badge badge-neutro', text: type === 'youtube' ? 'YouTube' : type === 'html5' ? 'HLS' : 'MP4' }),
            el('br'), el('small', { style: { color: 'var(--muted)' }, text: e.duration || '--:--' })
          ]),
          el('td', { text: `${doneCount} aluno(s)` }),
          el('td', {}, el('div', { class: 'row-actions' }, [
            el('button', { class: 'mini', text: 'Editar', onclick: () => {
              editing.id = e.id; title.textContent = 'Editando aula ' + e.number;
              f.number.value = e.number; f.title.value = e.title || ''; f.duration.value = e.duration || '';
              f.videoUrl.value = e.videoUrl || ''; f.description.value = e.description || '';
              check(); wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } }),
            el('button', { class: 'mini', text: '↑', title: 'Mover para cima', onclick: () => move(e, -1) }),
            el('button', { class: 'mini', text: '↓', title: 'Mover para baixo', onclick: () => move(e, 1) }),
            el('button', { class: 'mini danger', text: 'Excluir', onclick: () => {
              if (!confirmBox('Excluir a aula "' + e.title + '"?')) return;
              S.save(d => { d.episodes = d.episodes.filter(x => x.id !== e.id); d.progress = d.progress.filter(x => x.episodeId !== e.id); });
              toast('Aula excluída.'); render();
            } })
          ]))
        ]));
      });
      t.appendChild(tb);
      list.appendChild(t);
    }
    host.appendChild(list);
  }

  function move(ep, dir) {
    const list = S.episodesOf(ep.courseId);
    const i = list.findIndex(x => x.id === ep.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    S.save(d => {
      const a = d.episodes.find(x => x.id === list[i].id);
      const b = d.episodes.find(x => x.id === list[j].id);
      const t = a.number; a.number = b.number; b.number = t;
    });
    render();
  }

  /* ============================ ALUNOS ============================ */

  function viewAlunos(host) {
    const list = box('Alunos', 'Cadastre manualmente, altere o plano ou libere acessos', []);
    const table = el('table', { class: 'data' });
    const stu = S.allStudents();

    const add = box('Cadastrar aluno', 'Útil para turmas presenciais, cortesias ou testes', []);
    const af = { name: input({ placeholder: 'Nome' }), email: input({ type: 'email', placeholder: 'email@dominio.com' }), password: input({ placeholder: 'senha inicial' }), plan: select({}, S.PLANS.map(p => ({ value: p.id, label: p.name }))), days: input({ type: 'number', value: '30' }) };
    add.appendChild(el('div', { class: 'form-grid' }, [
      field('Nome', af.name), field('E-mail', af.email), field('Senha', af.password),
      field('Plano', af.plan), field('Dias de acesso', af.days),
      el('div', { class: 'field', style: { display: 'flex', alignItems: 'flex-end' } },
        el('button', { class: 'btn btn-primary', text: 'Cadastrar aluno', onclick: () => {
          try {
            S.signUp({ name: af.name.value, email: af.email.value, password: af.password.value || '1234', planId: af.plan.value });
            const st = S.student(af.email.value);
            S.setStudent(st.id, { expiresAt: UI.addDays(new Date().toISOString(), Number(af.days.value) || 30), status: 'ativo' });
            toast('Aluno cadastrado com acesso liberado.', 'ok');
            render();
          } catch (err) { toast(err.message, ''); }
        } })
      )
    ]));
    host.appendChild(add);

    table.appendChild(el('thead', {}, el('tr', {}, ['Aluno', 'Plano', 'Situação', 'Vence em', 'Último acesso', 'Ações'].map(h => el('th', { text: h })))));
    const tb = el('tbody');
    if (!stu.length) tb.appendChild(el('tr', {}, el('td', { colspan: '6' }, emptyState('Nenhum aluno cadastrado.'))));

    stu.forEach(s => {
      tb.appendChild(el('tr', {}, [
        el('td', {}, [
          el('div', { style: { display: 'flex', gap: '.6rem', alignItems: 'center' } }, [
            el('img', { src: Art.avatar(s.name), style: { width: '34px', height: '34px', borderRadius: '50%' }, alt: '' }),
            el('div', {}, [el('strong', { text: s.name || '—' }), el('br'), el('small', { style: { color: 'var(--muted)' }, text: s.email })])
          ])
        ]),
        el('td', { text: (S.PLANS.find(p => p.id === s.planId) || {}).name || '—' }),
        el('td', {}, statusBadge(s)),
        el('td', { text: s.planId === 'vitalicio' ? 'Vitalício' : UI.dateBR(s.expiresAt) }),
        el('td', { text: s.lastLogin ? UI.dateBR(s.lastLogin) : 'nunca' }),
        el('td', {}, el('div', { class: 'row-actions' }, [
          el('button', { class: 'mini ok', text: '+30 dias', onclick: () => { S.extendStudent(s.id, 30); toast('30 dias adicionados.', 'ok'); render(); } }),
          el('button', { class: 'mini', text: s.blocked ? 'Desbloquear' : 'Bloquear', onclick: () => { S.setStudent(s.id, { blocked: !s.blocked }); render(); } }),
          el('button', { class: 'mini', text: 'Editar', onclick: () => editStudent(s) }),
          el('button', { class: 'mini danger', text: 'Excluir', onclick: () => {
            if (!confirmBox('Excluir o aluno ' + s.name + '? O progresso dele também será removido.')) return;
            S.deleteStudent(s.id); toast('Aluno excluído.'); render();
          } })
        ]))
      ]));
    });
    table.appendChild(tb);
    list.appendChild(table);
    host.appendChild(list);

    function editStudent(s) {
      const name = input({ value: s.name || '' });
      const pass = input({ placeholder: 'nova senha (opcional)' });
      const plan = select({ value: s.planId }, S.PLANS.map(p => ({ value: p.id, label: p.name })));
      const exp = input({ type: 'date', value: (s.expiresAt || '').slice(0, 10) });
      const dlg = el('div', { class: 'overlay open' }, el('div', { class: 'modal', style: { maxWidth: '520px' } }, [
        el('div', { class: 'modal-body', style: { paddingTop: '1.6rem' } }, [
          el('h2', { text: 'Editar aluno', style: { fontSize: '1.4rem' } }),
          el('div', { class: 'form-grid two' }, [
            field('Nome', name, null, true),
            field('Nova senha', pass, null, true),
            field('Plano', plan, null, true),
            field('Vencimento', exp, null, true)
          ]),
          el('div', { style: { display: 'flex', gap: '.6rem', marginTop: '.6rem' } }, [
            el('button', { class: 'btn btn-primary', text: 'Salvar', onclick: () => {
              const patch = { name: name.value.trim(), planId: plan.value };
              if (pass.value) patch.password = pass.value;
              if (exp.value) patch.expiresAt = new Date(exp.value + 'T23:59:59').toISOString();
              S.setStudent(s.id, patch);
              dlg.remove(); toast('Aluno atualizado.', 'ok'); render();
            } }),
            el('button', { class: 'btn btn-outline', text: 'Cancelar', onclick: () => dlg.remove() })
          ])
        ])
      ]));
      document.body.appendChild(dlg);
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.remove(); });
    }
  }

  /* ============================ PAGAMENTOS ============================ */

  function viewPagamentos(host) {
    const pays = S.allPayments().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const pending = pays.filter(p => p.status === 'pendente');
    const approved = pays.filter(p => p.status === 'aprovado');
    const revenue = approved.reduce((a, p) => a + Number(p.amount || 0), 0);

    host.appendChild(el('div', { class: 'stat-row' }, [
      stat(pending.length, 'Aguardando aprovação', pending.length ? 'var(--yellow)' : ''),
      stat(approved.length, 'Pagamentos aprovados'),
      stat(money(revenue), 'Total recebido')
    ]));

    if (!pays.length) {
      host.appendChild(box(null, null, [emptyState('Nenhum pagamento ainda. Quando um aluno solicitar a assinatura, ele aparece aqui.')]));
      return;
    }

    const t = el('table', { class: 'data' });
    t.appendChild(el('thead', {}, el('tr', {}, ['Aluno', 'Plano', 'Valor', 'Forma', 'Referência', 'Recebido em', 'Situação', 'Ações'].map(h => el('th', { text: h })))));
    const tb = el('tbody');
    pays.forEach(p => {
      const st = p.status === 'aprovado' ? 'ativo' : p.status === 'pendente' ? 'pendente' : 'vencido';
      tb.appendChild(el('tr', {}, [
        el('td', {}, [el('strong', { text: p.studentName || p.email }), el('br'), el('small', { style: { color: 'var(--muted)' }, text: p.email })]),
        el('td', { text: p.planName }),
        el('td', { text: money(p.amount) }),
        el('td', { text: p.methodName }),
        el('td', {}, el('span', { class: 'code-box', text: p.reference })),
        el('td', { text: UI.dateBR(p.createdAt) }),
        el('td', {}, el('span', { class: 'badge badge-' + st, text: p.status })),
        el('td', {}, p.status === 'pendente'
          ? el('div', { class: 'row-actions' }, [
              el('button', { class: 'mini ok', text: 'Aprovar', onclick: () => { S.approvePayment(p.id); toast('Aprovado! Acesso do aluno liberado.', 'ok'); render(); } }),
              el('button', { class: 'mini danger', text: 'Recusar', onclick: () => { S.rejectPayment(p.id); render(); } })
            ])
          : el('small', { style: { color: 'var(--muted)' }, text: p.approvedAt ? 'liberado' : '—' }))
      ]));
    });
    t.appendChild(tb);
    host.appendChild(box('Histórico de pagamentos', 'Aprovar um pagamento libera o acesso do aluno automaticamente', [t]));
  }

  /* ============================ PROGRESSO ============================ */

  function viewProgresso(host) {
    const data = S.allProgress().slice().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    if (!data.length) {
      host.appendChild(box(null, null, [emptyState('Nenhum progresso registrado. Assim que os alunos assistirem, aparece aqui.')]));
      return;
    }
    const t = el('table', { class: 'data' });
    t.appendChild(el('thead', {}, el('tr', {}, ['Aluno', 'Aula', 'Curso', 'Posição', 'Situação', 'Atualizado em'].map(h => el('th', { text: h })))));
    const tb = el('tbody');
    data.forEach(p => {
      const ep = S.episode(p.episodeId);
      const c = S.course(p.courseId || (ep || {}).courseId);
      const stu = S.student(p.email);
      const pct = p.duration ? Math.min(100, Math.round((p.seconds / p.duration) * 100)) : 0;
      tb.appendChild(el('tr', {}, [
        el('td', { text: stu ? stu.name : p.email }),
        el('td', { text: ep ? ep.title : '(aula removida)' }),
        el('td', {}, el('small', { style: { color: 'var(--muted)' }, text: c ? c.title : '—' })),
        el('td', { text: UI.timecode(p.seconds) + (p.duration ? ' / ' + UI.timecode(p.duration) : '') }),
        el('td', {}, el('span', { class: 'badge badge-' + (p.completed ? 'ativo' : 'pendente'), text: p.completed ? 'concluída' : pct + '%' })),
        el('td', { text: UI.dateTimeBR(p.updatedAt) })
      ]));
    });
    t.appendChild(tb);
    host.appendChild(box('Progresso dos alunos', 'Quem parou, quanto assistiu e quando voltou pela última vez', [t]));
  }

  /* ============================ CONFIGURAÇÕES ============================ */

  function viewConfig(host) {
    const st = S.settings();

    const brand = input({ value: st.brandName || 'RitmoK' });
    const tagline = input({ value: st.tagline || '' });
    const contact = input({ value: st.contactEmail || '' });
    const adminMail = input({ value: st.adminEmail || '' });
    const newPass = input({ type: 'password', placeholder: 'Nova senha do professor' });
    const newPass2 = input({ type: 'password', placeholder: 'Repita a nova senha' });
    const rot = el('input', { type: 'checkbox' });
    rot.checked = st.heroRotation !== false;

    const fBox = box('Identidade da plataforma', 'Nome que aparece no topo do site e nas telas de login', [
      el('div', { class: 'form-grid' }, [
        field('Nome da plataforma', brand),
        field('Frase de apresentação', tagline),
        field('E-mail de contato', contact, null, true),
        field('E-mail do professor', adminMail, null, true)
      ]),
      el('div', { style: { display: 'flex', gap: '.6rem', marginTop: '.4rem' } }, [
        el('button', { class: 'btn btn-primary', text: 'Salvar identidade', onclick: () => {
          S.save(d => {
            d.settings.brandName = brand.value.trim() || 'RitmoK';
            d.settings.tagline = tagline.value.trim();
            d.settings.contactEmail = contact.value.trim();
            d.settings.adminEmail = adminMail.value.trim();
          });
          toast('Identidade atualizada. Reabra as outras abas para ver.', 'ok');
        } }),
        el('label', { style: { display: 'flex', gap: '.5rem', alignItems: 'center', fontSize: '.9rem' } }, [rot, document.createTextNode('Alternar banner de destaque automaticamente')]),
        el('button', { class: 'btn btn-outline', text: 'Salvar rotação', onclick: () => { S.save(d => { d.settings.heroRotation = rot.checked; }); toast('Preferência salva.', 'ok'); } })
      ])
    ]);
    host.appendChild(fBox);

    const pBox = box('Senha do professor',
      S.isCloud()
        ? 'Use o mesmo e-mail do professor. A nova senha vale em todos os aparelhos.'
        : 'Use uma senha forte — ela protege o cadastro de aulas e alunos',
      [el('div', { class: 'form-grid' }, [
        field('Nova senha', newPass, 'Mínimo de 6 caracteres', true),
        S.isCloud() ? field('Repita a nova senha', newPass2, null, true) : null
      ])]);
    pBox.appendChild(el('button', { class: 'btn btn-primary', text: 'Alterar senha', onclick: async () => {
      if (!newPass.value || newPass.value.length < 6) { toast('A senha precisa ter ao menos 6 caracteres.', ''); return; }
      if (S.isCloud() && newPass.value !== newPass2.value) { toast('As senhas não conferem.', ''); return; }
      try {
        await S.changePassword(newPass.value);
        newPass.value = ''; newPass2.value = '';
        toast('Senha alterada com sucesso.', 'ok');
      } catch (e) {
        toast(e.message || 'Não foi possível alterar a senha.', '');
      }
    } }));
    host.appendChild(pBox);

    // planos
    const plansBox = box('Planos e preços', 'Edite valores e duração de acesso', []);
    const pt = el('table', { class: 'data' });
    pt.appendChild(el('thead', {}, el('tr', {}, ['Plano', 'Preço (R$)', 'Dias de acesso', ''].map(h => el('th', { text: h })))));
    const ptb = el('tbody');
    S.PLANS.forEach(p => {
      const price = input({ type: 'number', step: '0.01', value: p.price, style: { maxWidth: '130px' } });
      const days = input({ type: 'number', value: p.days, style: { maxWidth: '130px' } });
      ptb.appendChild(el('tr', {}, [
        el('td', {}, el('strong', { text: p.name })),
        el('td', {}, price),
        el('td', {}, days),
        el('td', {}, el('button', { class: 'mini', text: 'Salvar', onclick: () => {
          S.save(d => {
            const t = d.plans.find(x => x.id === p.id);
            if (t) { t.price = Number(price.value) || 0; t.days = Number(days.value) || 30; }
          });
          toast('Plano atualizado.', 'ok');
        } }))
      ]));
    });
    pt.appendChild(ptb);
    plansBox.appendChild(pt);
    host.appendChild(plansBox);

    // backup
    const bBox = box('Backup dos dados', 'Tudo fica salvo neste navegador. Faça backups periódicos.', []);
    bBox.appendChild(el('div', { style: { display: 'flex', gap: '.6rem', flexWrap: 'wrap' } }, [
      el('button', { class: 'btn btn-primary', text: '⬇ Baixar backup (.json)', onclick: () => {
        const blob = new Blob([S.exportJSON()], { type: 'application/json' });
        const a = el('a', { href: URL.createObjectURL(blob), download: 'ritmok-backup-' + new Date().toISOString().slice(0, 10) + '.json' });
        document.body.appendChild(a); a.click(); a.remove();
        toast('Backup baixado.', 'ok');
      } }),
      el('button', { class: 'btn btn-outline', text: '⬆ Restaurar backup', onclick: () => fileInput.click() }),
      el('button', { class: 'btn btn-danger', text: 'Apagar tudo e recomeçar', onclick: () => {
        if (!confirmBox('Isso apaga TODOS os cursos, aulas, alunos e progresso deste navegador. Continuar?')) return;
        if (!confirmBox('Tem certeza? Essa ação não pode ser desfeita.')) return;
        S.resetAll(); toast('Dados restaurados para o padrão.', 'ok'); render();
      } })
    ]));
    const fileInput = el('input', { type: 'file', accept: '.json', style: { display: 'none' } });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { S.importJSON(reader.result); toast('Backup restaurado!', 'ok'); render(); }
        catch (err) { toast('Arquivo inválido: ' + err.message, ''); }
      };
      reader.readAsText(file);
    });
    bBox.appendChild(fileInput);
    host.appendChild(bBox);

    host.appendChild(box('Onde os dados ficam salvos', null, [
      el('p', { style: { color: 'var(--muted)', lineHeight: '1.7', margin: 0, fontSize: '.9rem' } }, [
        'Este painel usa o armazenamento local do navegador (localStorage). ',
        'Isso significa que: os dados ficam apenas neste computador e neste navegador; limpar o histórico do navegador apaga tudo; ',
        'para usar em outros dispositivos, publique o projeto em uma hospedagem e integre um banco de dados real.'
      ])
    ]));
  }

  /* ============================ BOOT ============================ */

  function boot() {
    qs('#gate-logo').innerHTML = UI.logo;
    qs('#top-logo').innerHTML = UI.logo;

    if (S.isCloud()) {
      // modo nuvem: e-mail + senha do professor
      const wrap = qs('#gate-email-wrap');
      if (wrap) wrap.style.display = '';
      const email = emailBox();
      if (email && !email.value) email.value = window.ADMIN_EMAIL || '';

      const hint = qs('#gate-hint');
      if (hint) {
        hint.innerHTML = '<b>Primeira vez?</b> Crie sua conta de professor em '
          + '<a href="login.html">Entrar → Criar conta</a> usando o e-mail '
          + '<b>' + UI.esc(window.ADMIN_EMAIL || '') + '</b>. Depois volte aqui e entre com esse mesmo e-mail e senha.';
      }
    }

    S.sessaoPronta().then(() => {
      if (S.adminSession()) showPanel(); else showGate();
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
