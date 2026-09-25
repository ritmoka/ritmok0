/* =========================================================
   RitmoK - camada de dados
   ------------------------------------------------------------
   Funciona em DOIS modos automaticamente:

   1. MODO LOCAL  (padrao) - dados no navegador (localStorage)
   2. MODO FIREBASE - dados na nuvem, iguais para todos

   O modo e escolhido sozinho: basta preencher as chaves em
   js/firebase-config.js. A API publica (Store.xxx) e a mesma
   nos dois modos, entao o resto do site nao muda.
   ========================================================= */

window.Store = (() => {

  const KEY_DATA = 'ritmok.data.v1';
  const KEY_SESSION = 'ritmok.session.v1';

  /* ---------- configuracao ---------- */
  const CFG = window.FIREBASE_CONFIG || {};
  const FIREBASE_ON = !!(CFG.apiKey && CFG.apiKey.indexOf('COLE AQUI') === -1);
  const ADMIN_EMAIL = String(window.ADMIN_EMAIL || '').toLowerCase();

  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

  /* ---------- planos ---------- */
  const PLANS = [
    { id: 'mensal', name: 'Mensal', price: 49.9, days: 30, note: 'Cancele quando quiser' },
    { id: 'semestral', name: 'Semestral', price: 249.9, days: 180, note: 'R$ 41,65/mês · economize 17%' },
    { id: 'vitalicio', name: 'Vitalício', price: 497, days: 36500, note: 'Pagamento único · acesso para sempre' }
  ];

  const PAY_METHODS = [
    { id: 'pix', name: 'Pix', icon: '⚡' },
    { id: 'cartao', name: 'Cartão', icon: '💳' },
    { id: 'boleto', name: 'Boleto', icon: '🧾' }
  ];

  /* ---------- videos de demonstracao (troque pelos seus) ---------- */
  const SAMPLE = {
    bunny: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    blazes: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    escapes: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    fun: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    joyrides: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    meltdowns: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
  };

  /* =========================================================
     CONTEUDO PADRAO (usado quando o banco esta vazio)
     ========================================================= */
  function seed() {
    const now = new Date().toISOString();
    const d = window.DEFAULT_SETTINGS || {};

    const courses = [
      {
        id: 'c_sertanejo', title: 'Sertanejo do Zero ao Palco',
        tagline: 'Viola, sanfona e ritmo — o caminho completo até tocar com a banda',
        description: 'Curso completo de sertanejo para quem quer tocar de verdade. Começamos pelo zero: como segurar a viola, como afinar, primeiros acordes e o ritmo que sustenta a música. Depois entram sanfona, baixinho e percussão, harmonia aplicada para não errar na hora de trocar de acorde, um repertório com 10 músicas para tocar já no primeiro mês e, por último, a técnica de cantar e tocar ao mesmo tempo. Todas as aulas são comentadas nota a nota, com partitura na tela e exercícios práticos para você tocar junto.',
        category: 'Sertanejo', instructor: 'Prof. Kennedy', level: 'Do zero ao palco',
        year: 2026, rating: 4.9, featured: true, trending: true,
        cover: '', poster: '', backdrop: '', code: '', createdAt: now
      },
      {
        id: 'c_vaneira', title: 'Vaneira Universitário',
        tagline: 'O ritmo, a percussão e a coreografia para o seu grupo universitário montar a apresentação',
        description: 'Curso de vaneira para grupos universitários: a origem e a cultura do ritmo, percussão de base, coreografia em dupla e em roda, e como organizar um ensaio que chega pronto ao palco. Ideal para projetos de extensão, coletivos culturais, apresentações de fim de semestre e grupos de dança que se apresentam na universidade.',
        category: 'Vaneira', instructor: 'Prof. Kennedy', level: 'Todos os níveis',
        year: 2026, rating: 4.7, featured: false, trending: true,
        cover: '', poster: '', backdrop: '', code: '', createdAt: now
      }
    ];

    const episodes = [
      { id: 'e_s1', courseId: 'c_sertanejo', number: 1, title: 'Boas-vindas: o mapa do caminho até o palco', description: 'O que você vai dominar ao fim do curso, quais materiais precisa e como montar uma rotina de treino que funciona.', duration: '00:12', videoUrl: SAMPLE.fun, createdAt: now },
      { id: 'e_s2', courseId: 'c_sertanejo', number: 2, title: 'Conhecendo a viola: afinação, postura e o primeiro som', description: 'Como segurar o instrumento, onde ficam as notas, como afinar de ouvido e os 3 acordes que tocam metade do repertório.', duration: '00:15', videoUrl: SAMPLE.escapes, createdAt: now },
      { id: 'e_s3', courseId: 'c_sertanejo', number: 3, title: 'Acordes básicos: maior, menor e com sétima', description: 'Forma dos dedos, transições entre acordes e o truque para a mão não travar quando a música acelera.', duration: '00:14', videoUrl: SAMPLE.blazes, createdAt: now },
      { id: 'e_s4', courseId: 'c_sertanejo', number: 4, title: 'A batida do sertanejo: o ritmo que sustenta tudo', description: 'O ritmo base com palhetada, quando acelerar e quando aliviar a mão nas reprises.', duration: '00:18', videoUrl: SAMPLE.joyrides, createdAt: now },
      { id: 'e_s5', courseId: 'c_sertanejo', number: 5, title: 'Sanfona: teclas, gaita e o peso da mão', description: 'Como pressurizar o fole, a posição das mãos nas teclas e sair tocando com autonomia depois da quinta aula.', duration: '00:16', videoUrl: SAMPLE.meltdowns, createdAt: now },
      { id: 'e_s6', courseId: 'c_sertanejo', number: 6, title: 'Baixinho e percussão: a camada que dá profissionalidade', description: 'Linha de baixo, contrapontos simples e o toque de ganzá e pandeiro que prende a música no ritmo certo.', duration: '00:13', videoUrl: SAMPLE.bunny, createdAt: now },
      { id: 'e_s7', courseId: 'c_sertanejo', number: 7, title: 'Harmonia aplicada: quando usar aberto e quando usar fechado', description: 'Regras simples para escolher a afinação, parar os acordes no lugar errado e soar com a banda sem brigar.', duration: '00:15', videoUrl: SAMPLE.escapes, createdAt: now },
      { id: 'e_s8', courseId: 'c_sertanejo', number: 8, title: 'Repertório: 10 músicas para tocar já no primeiro mês', description: 'Arranjos comentados, do mais fácil ao mais difícil, com o ritmo e a força da mão já mapeados.', duration: '00:20', videoUrl: SAMPLE.meltdowns, createdAt: now },
      { id: 'e_s9', courseId: 'c_sertanejo', number: 9, title: 'Cantar e tocar ao mesmo tempo (sem travar)', description: 'Respiração, posição da viola e simplificação do que é tocado para deixar espaço para a voz.', duration: '00:17', videoUrl: SAMPLE.fun, createdAt: now },
      { id: 'e_s10', courseId: 'c_sertanejo', number: 10, title: 'Ensaio geral: a hora do show', description: 'Montagem do palco, passagem de som, contagem de entrada e a lista de conferência do dia da apresentação.', duration: '00:14', videoUrl: SAMPLE.blazes, createdAt: now },
      { id: 'e_v1', courseId: 'c_vaneira', number: 1, title: 'Boas-vindas: como formar e preparar seu grupo', description: 'Como montar a equipe, distribuir funções, escolher o repertório e organizar a agenda de ensaios.', duration: '00:11', videoUrl: SAMPLE.escapes, createdAt: now },
      { id: 'e_v2', courseId: 'c_vaneira', number: 2, title: 'O que é vaneira: origem, cultura e ritmo', description: 'A história do ritmo, o contexto de origem e por que ele virou palco nas universidades.', duration: '00:16', videoUrl: SAMPLE.joyrides, createdAt: now },
      { id: 'e_v3', courseId: 'c_vaneira', number: 3, title: 'Percussão de base: ganzá e pandeiro', description: 'A base rítmica que sustenta toda a música, com contagem e exercícios para tocar sozinho.', duration: '00:14', videoUrl: SAMPLE.meltdowns, createdAt: now },
      { id: 'e_v4', courseId: 'c_vaneira', number: 4, title: 'Coreografia básica: passos, giro e marcação', description: 'Os passos fundamentais, o giro, a dupla e a formação em roda. Tudo com contagem.', duration: '00:18', videoUrl: SAMPLE.bunny, createdAt: now },
      { id: 'e_v5', courseId: 'c_vaneira', number: 5, title: 'Arranjo para apresentação acadêmica', description: 'Adaptar a música ao tempo da apresentação, fazer as transições e saber o que cortar se o palco for pequeno.', duration: '00:13', videoUrl: SAMPLE.blazes, createdAt: now },
      { id: 'e_v6', courseId: 'c_vaneira', number: 6, title: 'Ensaio geral e dia da apresentação', description: 'Montagem, passagem de som, marcação de entrada e a lista de conferência para não ter susto no palco.', duration: '00:15', videoUrl: SAMPLE.fun, createdAt: now }
    ];

    return {
      version: 1,
      settings: {
        brandName: d.brandName || 'RitmoK',
        tagline: d.tagline || 'Cursos de música com o Prof. Kennedy',
        adminPassword: d.adminPassword || 'admin123',
        adminEmail: d.adminEmail || ADMIN_EMAIL,
        contactEmail: d.contactEmail || 'contato@ritmok.com',
        requireApproval: true,
        heroRotation: true
      },
      plans: PLANS,
      courses,
      episodes,
      students: [],
      payments: [],
      progress: [],
      accessCodes: {},
      createdAt: now
    };
  }

  /* =========================================================
     ESTADO
     ========================================================= */
  let cache = null;
  let booted = false;
  let pendentes = [];
  let mode = 'local';
  let fb = null;
  let firebaseUser = null;
  let lastSynced = null;
  let syncTimer = null;
  let semPermissao = false;
  let gravando = false;

  const empty = () => ({
    version: 1, settings: {}, plans: PLANS, courses: [], episodes: [],
    students: [], payments: [], progress: [], accessCodes: {}
  });

  const clone = o => JSON.parse(JSON.stringify(o || {}));

  /* =========================================================
     MODO LOCAL
     ========================================================= */
  function readLocal() {
    try {
      const raw = localStorage.getItem(KEY_DATA);
      if (raw) {
        const d = JSON.parse(raw);
        if (!d.settings) d.settings = seed().settings;
        if (!d.plans) d.plans = PLANS;
        if (!d.accessCodes) d.accessCodes = {};
        return d;
      }
    } catch (e) { console.warn('Dados locais corrompidos.', e); }
    const s = seed();
    try { localStorage.setItem(KEY_DATA, JSON.stringify(s)); } catch (e) { }
    return s;
  }

  function writeLocal() {
    try { localStorage.setItem(KEY_DATA, JSON.stringify(cache)); }
    catch (e) { UI.toast('Não foi possível salvar. Armazenamento do navegador cheio.', ''); }
  }

  /* =========================================================
     MODO FIREBASE
     ========================================================= */
  async function initFirebase() {
    const [appMod, authMod, fsMod] = await Promise.all([
      import(/* webpackIgnore: true */ SDK + 'firebase-app.js'),
      import(/* webpackIgnore: true */ SDK + 'firebase-auth.js'),
      import(/* webpackIgnore: true */ SDK + 'firebase-firestore.js')
    ]);

    const app = appMod.initializeApp(CFG);
    const auth = authMod.getAuth(app);
    try { await authMod.setPersistence(auth, authMod.browserLocalPersistence); } catch (e) { }
    const db = fsMod.getFirestore(app);

    return { appMod, authMod, fsMod, app, auth, db };
  }

  const ref = (coll, id) => fb.fsMod.doc(fb.db, coll, id);

  /** Le uma colecao inteira */
  async function fetchCollection(coll) {
    const snap = await fb.fsMod.getDocs(fb.fsMod.collection(fb.db, coll));
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  }

  const isAdminEmail = email => String(email || '').toLowerCase() === ADMIN_EMAIL;

  /** Garante que o banco tenha o conteudo inicial. So o professor grava. */
  async function seedIfEmpty() {
    if (!fb || fb.__seeded) return false;
    if (!firebaseUser || !isAdminEmail(firebaseUser.email)) return false;
    try {
      const [cursos, config] = await Promise.all([
        fb.fsMod.getDocs(fb.fsMod.collection(fb.db, 'courses')),
        fb.fsMod.getDoc(ref('settings', 'app'))
      ]);
      const temCursos = !cursos.empty;
      const temConfig = config.exists();
      if (temCursos && temConfig) { fb.__seeded = true; return false; }

      const s = seed();
      const batch = fb.fsMod.writeBatch(fb.db);
      if (!temCursos) {
        s.courses.forEach(c => batch.set(ref('courses', c.id), c));
        s.episodes.forEach(e => batch.set(ref('episodes', e.id), e));
      }
      if (!temConfig) {
        batch.set(ref('settings', 'app'), Object.assign({}, s.settings, { planos: PLANS }));
      }
      await batch.commit();
      fb.__seeded = true;
      return true;
    } catch (e) {
      console.warn('Nao foi possivel gravar o conteudo inicial.', e);
      return false;
    }
  }

  /** Progresso visivel para quem esta logado agora */
  async function carregarProgresso() {
    if (!fb) return [];
    try {
      if (firebaseUser && isAdminEmail(firebaseUser.email)) return await fetchCollection('progress');
      if (firebaseUser && firebaseUser.uid) {
        const q = fb.fsMod.query(
          fb.fsMod.collection(fb.db, 'progress'),
          fb.fsMod.where('uid', '==', firebaseUser.uid));
        const snap = await fb.fsMod.getDocs(q);
        return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
      }
    } catch (e) { /* sem permissao: segue sem progresso salvo */ }
    return [];
  }

  async function loadAll() {
    const testar = async (col) => {
      try { return await fetchCollection(col); }
      catch (e) {
        if (/permission-denied|permission_denied/i.test(e.code || '')) semPermissao = true;
        return [];
      }
    };

    // progresso: o professor ve tudo; o aluno so o proprio (com filtro)
    const testarMeuProgresso = () => carregarProgresso();

    const [courses, episodes, students, payments, progress, setDoc] = await Promise.all([
      testar('courses'),
      testar('episodes'),
      testar('students'),
      testar('payments'),
      testarMeuProgresso(),
      fb.fsMod.getDoc(ref('settings', 'app')).then(s => s.exists() ? s.data() : {}).catch(() => ({}))
    ]);

    const defaults = seed();
    const data = empty();
    const cfg = Object.assign({}, setDoc || {});
    const planos = cfg.planos;          // planos vem no mesmo doc, mas nao e uma configuracao
    delete cfg.planos;
    data.settings = Object.assign({}, defaults.settings, cfg);
    data.plans = (Array.isArray(planos) && planos.length) ? planos : PLANS;
    data.courses = courses.length ? courses : defaults.courses;
    data.episodes = episodes.length ? episodes : defaults.episodes;
    data.students = students;
    data.payments = payments;
    data.progress = progress;
    return data;
  }

  /** Sincronizacao automatica: qualquer mudanca vira atualizacao no Firestore */
  let unsubs = [];

  function detachListeners() {
    unsubs.forEach(u => { try { u(); } catch (e) { } });
    unsubs = [];
  }

  function attachListeners() {
    if (!fb) return;
    detachListeners();

    const ehProf = !!(firebaseUser && isAdminEmail(firebaseUser.email));
    const logado = !!firebaseUser;

    const ear = (alvo, aoGravar, nome) => {
      unsubs.push(fb.fsMod.onSnapshot(
        alvo,
        snap => {
          if (!cache) return;
          // Se ha uma gravacao em andamento, o snapshot e o de ANTES dela.
          // Aplicar agora sobrescreveria a alteracao local; o snapshot
          // correto chega logo em seguida, entao ignoramos este.
          if (gravando) return;
          aoGravar(snap);
          window.dispatchEvent(new CustomEvent('store:changed'));
        },
        err => {
          const cod = String(err && err.code || '');
          if (/permission-denied/i.test(cod)) {
            if (ehProf) console.warn('[RitmoK] Sem permissao para ler "' + nome + '". Verifique as regras do Firestore e o e-mail em isAdmin().');
            return;
          }
          console.warn('Falha ao sincronizar ' + nome, err);
        }
      ));
    };

    const colecao = c => fb.fsMod.collection(fb.db, c);
    const lista = snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data()));

    // marca o que ja existe na nuvem
    [colecao('courses'), colecao('episodes')].forEach(q => {
      unsubs.push(fb.fsMod.onSnapshot(q, s => { s.docs.forEach(d => existentes.add(q.id + '/' + d.id)); }));
    });

    // publicos
    ear(colecao('courses'), s => { cache.courses = lista(s); }, 'courses');
    ear(colecao('episodes'), s => { cache.episodes = lista(s); }, 'episodes');
    ear(ref('settings', 'app'), s => {
      if (s.exists() && cache) {
        existentes.add('settings/app');
        const d = s.data();
        const planos = d.planos;
        delete d.planos;
        cache.settings = Object.assign({}, seed().settings, d);
        if (Array.isArray(planos) && planos.length) cache.plans = planos;
      }
    }, 'settings');

    // dados sensiveis: so quem tem permissao assina o listener
    if (ehProf) {
      ear(colecao('students'), s => { cache.students = lista(s); s.docs.forEach(d => existentes.add('students/' + d.id)); }, 'students');
      ear(colecao('payments'), s => { cache.payments = lista(s); }, 'payments');
      ear(colecao('progress'), s => { cache.progress = lista(s); }, 'progress');
    } else if (logado) {
      // O proprio aluno: consulta filtrada pelo proprio uid.
      // Sem o filtro, o Firestore negaria a leitura da colecao inteira.
      const uid = firebaseUser.uid;
      const meus = fb.fsMod.query(colecao('progress'), fb.fsMod.where('uid', '==', uid));
      ear(meus, s => { cache.progress = lista(s); }, 'progress');
      unsubs.push(fb.fsMod.onSnapshot(
        ref('students', uid),
        s => {
          if (s.exists()) existentes.add('students/' + uid);
          else existentes.delete('students/' + uid);
          if (s.exists() && cache) {
            const doc = Object.assign({ id: uid }, s.data());
            const i = cache.students.findIndex(x => x.id === uid);
            if (i >= 0) cache.students[i] = doc; else cache.students.push(doc);
            window.dispatchEvent(new CustomEvent('store:changed'));
          }
        },
        () => { }
      ));
    }
  }

  /** Grava no Firestore apenas o que de fato mudou */
  /* Quem pode gravar o que (espelha as regras do Firestore).
     'total'    = pode gravar o documento inteiro
     'limitado' = so alguns campos (ex.: nome e ultimo acesso)
     'nao'      = nao pode mexer nesta colecao */
  function permissao(coll, id) {
    const uid = firebaseUser && firebaseUser.uid;
    if (firebaseUser && isAdminEmail(firebaseUser.email)) return 'total';   // professor: tudo
    if (!uid) return 'nao';                                                // visitante: nada
    if (coll === 'students') {
      if (id !== uid) return 'nao';
      return existentes.has(coll + '/' + id) ? 'limitado' : 'total';       // so o proprio cadastro
    }
    if (coll === 'payments') return String(id).indexOf(uid + '__') === 0 ? 'total' : 'nao';
    if (coll === 'progress') return String(id).indexOf(uid + '__') === 0 ? 'total' : 'nao';
    return 'nao';                                                          // cursos/aulas/config: so professor
  }
  const podeGravar = (coll, id) => permissao(coll, id) !== 'nao';

  /** Carrega (ou cria, na primeira vez) o cadastro do aluno logado */
  async function garantirPerfil(user) {
    if (!fb || !user || !cache) return null;
    try {
      const s = await fb.fsMod.getDoc(ref('students', user.uid));
      if (s.exists()) {
        existentes.add('students/' + user.uid);
        const doc = Object.assign({ id: user.uid }, s.data());
        const i = cache.students.findIndex(x => x.id === user.uid);
        if (i >= 0) cache.students[i] = doc; else cache.students.push(doc);
        return doc;
      }
      // ainda nao tem cadastro: criamos agora (permitido pelas regras)
      const novo = makeStudent(user.uid, user.displayName || user.email, user.email, 'mensal');
      save(d => { if (!d.students.find(x => x.id === user.uid)) d.students.push(novo); });
      return novo;
    } catch (e) {
      console.warn('Nao foi possivel carregar o cadastro do aluno.', e);
      return null;
    }
  }

  /* Documentos que ja existem na nuvem (a nuvem e a verdade) */
  const existentes = new Set();

  /* O Firestore nao preserva a ordem dos campos, entao comparar com
     JSON.stringify direto gera diferenca falso a cada leitura.
     Aqui normalizamos ordenando as chaves antes de comparar. */
  function canonico(v) {
    if (Array.isArray(v)) return v.map(canonico);
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).sort().forEach(k => { o[k] = canonico(v[k]); });
      return o;
    }
    return v === undefined ? null : v;
  }
  const igual = (a, b) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));

  function syncToCloud() {
    if (!fb || !cache) return;
    const cols = ['courses', 'episodes', 'students', 'payments', 'progress'];
    const batch = fb.fsMod.writeBatch(fb.db);
    let pending = 0;
    const escritas = [];

    cols.forEach(coll => {
      const agora = new Map((cache[coll] || []).map(x => [x.id, x]));
      const antes = new Map(((lastSynced && lastSynced[coll]) || []).map(x => [x.id, x]));

      antes.forEach((_v, id) => {
        if (!agora.has(id) && podeGravar(coll, id)) {
          batch.delete(ref(coll, id)); pending++; existentes.delete(coll + '/' + id);
          escritas.push(coll + '/' + id + ' (apagar)');
        }
      });
      agora.forEach((obj, id) => {
        const perm = permissao(coll, id);
        if (perm === 'nao') return;                                   // nao pode mexer aqui
        const velho = antes.get(id);
        if (velho && igual(velho, obj)) return;                       // nada mudou
        if (perm === 'limitado') {
          // o aluno so pode atualizar o proprio nome e ultimo acesso
          const parcial = {};
          if (!velho || !igual(velho.name, obj.name)) parcial.name = obj.name;
          if (!velho || !igual(velho.lastLogin, obj.lastLogin)) parcial.lastLogin = obj.lastLogin;
          if (!Object.keys(parcial).length) return;
          batch.set(ref(coll, id), parcial, { merge: true }); pending++;
          escritas.push(coll + '/' + id + ' (parcial)');
          return;
        }
        batch.set(ref(coll, id), obj); pending++;
        existentes.add(coll + '/' + id);
        escritas.push(coll + '/' + id + (velho ? ' (atualizar)' : ' (criar)'));
      });
    });

    // configuracoes + planos: so o professor
    if (lastSynced && podeGravar('settings', 'app') && !igual(
      { s: lastSynced.settings, p: lastSynced.plans },
      { s: cache.settings, p: cache.plans })) {
      batch.set(ref('settings', 'app'), Object.assign({}, cache.settings, { planos: cache.plans }));
      pending++;
      escritas.push('settings/app (atualizar)');
    }

    if (!pending) { fb.__sync = { pendentes: 0 }; return; }
    fb.__sync = { pendentes: pending, escritas: escritas };
    gravando = true;
    batch.commit()
      .then(() => { lastSynced = clone(cache); gravando = false; fb.__sync = { pendentes: 0, ok: true, escritas: escritas }; })
      .catch(err => { gravando = false; fb.__sync = { erro: err.code || '', mensagem: err.message || String(err), escritas: escritas }; console.warn('Erro ao gravar no banco:', err); });
  }

  const ultimoSync = () => (fb && fb.__sync) || null;

  /* =========================================================
     API DE LEITURA / ESCRITA (identica nos dois modos)
     ========================================================= */

  /** Nunca devolve nulo: enquanto o banco carrega, devolve
      uma estrutura vazia para a tela nao quebrar. */
  function read() {
    if (!cache) {
      const s = seed();
      cache = Object.assign(empty(), { settings: s.settings, plans: s.plans });
    }
    return cache;
  }

  function save(mutator) {
    // Antes do banco carregar, as alteracoes ficam na fila
    if (!booted) {
      if (typeof mutator === 'function') pendentes.push(mutator);
      return read();
    }
    if (typeof mutator === 'function') mutator(cache);
    if (mode === 'local') {
      writeLocal();
    } else {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(syncToCloud, 120);
    }
    window.dispatchEvent(new CustomEvent('store:changed'));
    return cache;
  }

  function flushQueue() {
    const lista = pendentes;
    pendentes = [];
    lista.forEach(fn => { try { fn(cache); } catch (e) { console.warn(e); } });
  }

  function resetAll() {
    const s = seed();
    if (mode === 'local') {
      cache = s;
      writeLocal();
      localStorage.removeItem(KEY_SESSION);
    } else {
      // No modo nuvem, "apagar tudo" nao e permitido pelas regras.
      // Restauramos apenas os dados publicos (cursos e aulas).
      save(d => {
        d.courses = s.courses;
        d.episodes = s.episodes;
        d.settings = s.settings;
        d.plans = PLANS;
      });
    }
  }

  /* =========================================================
     SESSAO
     ========================================================= */
  function session() {
    if (mode === 'firebase') {
      if (!firebaseUser) return null;
      const st = cache.students.find(s => s.id === firebaseUser.uid);
      const isAdminUser = String(firebaseUser.email || '').toLowerCase() === ADMIN_EMAIL;
      return {
        role: isAdminUser ? 'admin' : 'student',
        email: firebaseUser.email,
        name: st ? st.name : (isAdminUser ? 'Prof. Kennedy' : firebaseUser.email),
        uid: firebaseUser.uid
      };
    }
    try { return JSON.parse(localStorage.getItem(KEY_SESSION) || 'null'); }
    catch { return null; }
  }

  function setSession(s) {
    if (mode === 'local') {
      if (s) localStorage.setItem(KEY_SESSION, JSON.stringify(s));
      else localStorage.removeItem(KEY_SESSION);
    }
  }

  function logout() {
    if (mode === 'firebase') return fb.authMod.signOut(fb.auth);
    setSession(null);
    return Promise.resolve();
  }

  /* =========================================================
     ACESSO
     ========================================================= */
  function statusOf(student) {
    if (!student) return { key: 'pendente', label: 'Sem assinatura' };
    if (student.blocked) return { key: 'vencido', label: 'Bloqueado' };
    if (student.planId === 'vitalicio' && student.expiresAt) return { key: 'ativo', label: 'Vitalício' };
    if (!student.expiresAt) return { key: 'pendente', label: 'Aguardando pagamento' };
    if (UI.isExpired(student.expiresAt)) return { key: 'vencido', label: 'Acesso vencido em ' + UI.dateBR(student.expiresAt) };
    return { key: 'ativo', label: 'Ativo até ' + UI.dateBR(student.expiresAt) };
  }

  function adminAuth(password) {
    const st = read().settings;
    return String(password || '') === String(st.adminPassword || '');
  }

  function adminSession() {
    const s = session();
    return !!(s && s.role === 'admin');
  }

  function currentStudent() {
    const s = session();
    if (!s || s.role !== 'student') return null;
    if (s.uid) return read().students.find(x => x.id === s.uid) || null;
    return read().students.find(x => String(x.email).toLowerCase() === String(s.email).toLowerCase()) || null;
  }

  function canWatch(student = currentStudent()) {
    if (adminSession()) return { ok: true, reason: '' };
    if (!student) return { ok: false, reason: 'Faça login para assistir às aulas.' };
    const st = statusOf(student);
    if (st.key !== 'ativo') return { ok: false, reason: 'Seu acesso não está ativo. Renove sua assinatura para assistir.' };
    return { ok: true };
  }

  /* =========================================================
     CONSULTAS
     ========================================================= */
  const settings = () => read().settings;
  const allCourses = () => read().courses;
  const allEpisodes = () => read().episodes;
  const allStudents = () => read().students;
  const allPayments = () => read().payments;
  const allProgress = () => read().progress;

  const course = id => read().courses.find(c => c.id === id) || null;
  const episode = id => read().episodes.find(e => e.id === id) || null;
  const student = email => read().students.find(s =>
    String(s.email).toLowerCase() === String(email).toLowerCase()) || null;

  const episodesOf = courseId =>
    read().episodes.filter(e => e.courseId === courseId).sort((a, b) => a.number - b.number);

  const totalDuration = courseId => episodesOf(courseId).reduce((acc, e) => {
    const [m, s] = String(e.duration || '0:0').split(':').map(Number);
    return acc + (m * 60 + s);
  }, 0);

  const categories = () =>
    [...new Set(allCourses().map(c => c.category).filter(Boolean))].sort();

  function courseProgress(courseId, email) {
    const eps = episodesOf(courseId);
    if (!eps.length) return 0;
    const done = eps.filter(e => (progressFor(e.id, email) || {}).completed).length;
    return Math.round((done / eps.length) * 100);
  }

  function search(term) {
    const t = String(term || '').trim().toLowerCase();
    if (!t) return [];
    const words = t.split(/\s+/);
    return allCourses().filter(c => {
      const hay = `${c.title} ${c.tagline} ${c.description} ${c.instructor} ${c.category} ${c.level}`.toLowerCase();
      if (words.every(w => hay.includes(w))) return true;
      return episodesOf(c.id).some(e => words.every(w => e.title.toLowerCase().includes(w)));
    });
  }

  /* =========================================================
     PROGRESSO
     ========================================================= */
  function progressKey(episodeId, email) {
    const s = session();
    const uid = (s && s.uid) || String(email || (s || {}).email || '').toLowerCase();
    return uid + '__' + episodeId;
  }

  function progressFor(episodeId, email) {
    const s = session();
    if (!s && !email) return null;
    return read().progress.find(p => p.episodeId === episodeId && whoMatches(p, s, email)) || null;
  }

  function whoMatches(p, s, email) {
    if (s && s.uid && p.uid) return p.uid === s.uid;
    const alvo = String((s && s.email) || email || '').toLowerCase();
    return String(p.email || '').toLowerCase() === alvo;
  }

  function saveProgress(episodeId, seconds, duration, completed = false) {
    const s = session();
    if (!s || !episodeId) return;
    save(d => {
      const key = progressKey(episodeId);
      let p = d.progress.find(x => progressKeyOf(x) === key);
      if (!p) {
        p = { id: key, uid: s.uid || '', email: s.email, episodeId, courseId: (episode(episodeId) || {}).courseId, seconds: 0, duration: 0, completed: false, updatedAt: null };
        d.progress.push(p);
      }
      p.seconds = Math.floor(seconds || 0);
      p.duration = Math.floor(duration || 0);
      p.completed = completed || p.completed;
      p.updatedAt = new Date().toISOString();
    });
  }

  function progressKeyOf(p) {
    return (p.uid || String(p.email || '').toLowerCase()) + '__' + p.episodeId;
  }

  function markCompleted(episodeId, completed = true) {
    const s = session();
    if (!s) return;
    save(d => {
      const key = progressKey(episodeId);
      let p = d.progress.find(x => progressKeyOf(x) === key);
      if (!p) {
        const ep = episode(episodeId);
        p = { id: key, uid: s.uid || '', email: s.email, episodeId, courseId: ep ? ep.courseId : null, seconds: 0, duration: 0, completed, updatedAt: new Date().toISOString() };
        d.progress.push(p);
      }
      p.completed = completed;
      p.updatedAt = new Date().toISOString();
    });
  }

  function continueWatching(email) {
    const s = session();
    if (!s && !email) return [];
    return read().progress
      .filter(p => whoMatches(p, s, email) && !p.completed && p.seconds > 5)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .map(p => Object.assign({}, p, { episode: episode(p.episodeId) }))
      .filter(p => p.episode);
  }

  function lastCourse(email) {
    const s = session();
    const items = read().progress
      .filter(p => whoMatches(p, s, email))
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    if (!items.length) return null;
    return course(items[0].courseId);
  }

  function myCourses(email) {
    const s = session();
    const ids = new Set(read().progress.filter(p => whoMatches(p, s, email)).map(p => p.courseId));
    return allCourses().filter(c => ids.has(c.id));
  }

  /* =========================================================
     CODIGO DE ACESSO POR CURSO
     ========================================================= */
  function hasCourseCode(courseId, email) {
    const c = course(courseId);
    if (!c || !c.code) return true;
    const s = session();
    const codes = read().accessCodes || {};
    const mine = codes[String((s && s.email) || email || '').toLowerCase()];
    return !!(mine && mine[courseId] === c.code);
  }

  function grantCourseCode(courseId, code, email) {
    const c = course(courseId);
    const s = session();
    const who = String((s && s.email) || email || '').toLowerCase();
    if (!who || !c || !c.code || c.code !== String(code || '').trim()) return false;
    save(d => {
      if (!d.accessCodes) d.accessCodes = {};
      if (!d.accessCodes[who]) d.accessCodes[who] = {};
      d.accessCodes[who][courseId] = c.code;
    });
    return true;
  }

  /* =========================================================
     CONTAS
     ========================================================= */
  function validateSignup(name, email, password) {
    const mail = String(email || '').trim().toLowerCase();
    if (!mail || !/.+@.+\..+/.test(mail)) throw new Error('Informe um e-mail válido.');
    if (!password || password.length < 4) throw new Error('A senha precisa ter pelo menos 4 caracteres.');
    if (student(mail)) throw new Error('Já existe uma conta com este e-mail.');
    return mail;
  }

  function makeStudent(uid, name, email, planId) {
    return {
      id: uid, name: (name || email).trim(), email: String(email).toLowerCase(),
      planId: planId || 'mensal', status: 'pendente', expiresAt: null,
      blocked: false, createdAt: new Date().toISOString(), lastLogin: null
    };
  }

  async function signUp({ name, email, password, planId }) {
    const mail = validateSignup(name, email, password);

    if (mode === 'firebase') {
      const cred = await fb.authMod.createUserWithEmailAndPassword(fb.auth, mail, password);
      try {
        // no SDK modular, updateProfile e uma funcao solta (nao metodo)
        await fb.authMod.updateProfile(cred.user, { displayName: (name || mail).trim() });
      } catch (e) { /* apenas cosmetico */ }
      save(d => {
        if (!d.students.find(s => s.id === cred.user.uid)) {
          d.students.push(makeStudent(cred.user.uid, name, mail, planId));
        }
      });
      firebaseUser = cred.user;
      return student(mail);
    }

    const plan = PLANS.find(p => p.id === planId) || PLANS[0];
    const novo = makeStudent('s_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, mail, plan.id);
    novo.password = password;
    save(d => { d.students.push(novo); });
    setSession({ role: 'student', email: novo.email, name: novo.name });
    return student(mail);
  }

  async function loginStudent(email, password) {
    const mail = String(email || '').trim().toLowerCase();

    if (mode === 'firebase') {
      try {
        const cred = await fb.authMod.signInWithEmailAndPassword(fb.auth, mail, password);
        firebaseUser = cred.user;
        const doc = await garantirPerfil(cred.user);
        save(d => {
          const t = d.students.find(x => x.id === cred.user.uid);
          if (t) t.lastLogin = new Date().toISOString();
        });
        return { ok: true, student: doc || currentStudent() };
      } catch (e) {
        const msg = /invalid-email|user-not-found|wrong-password|invalid-credential/i.test(e.code)
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar. Tente novamente.';
        return { ok: false, error: msg };
      }
    }

    const s = student(mail);
    if (!s) return { ok: false, error: 'Não encontramos uma conta com este e-mail.' };
    if (s.password !== password) return { ok: false, error: 'Senha incorreta.' };
    if (s.blocked) return { ok: false, error: 'Seu acesso está bloqueado. Fale com o professor.' };
    save(d => {
      const t = d.students.find(x => x.id === s.id);
      if (t) t.lastLogin = new Date().toISOString();
    });
    setSession({ role: 'student', email: s.email, name: s.name });
    return { ok: true, student: student(mail) };
  }

  async function loginAdmin(email, password) {
    if (mode === 'firebase') {
      const mail = String(email || '').trim().toLowerCase();
      if (mail !== ADMIN_EMAIL) return { ok: false, error: 'Este e-mail não é o do professor.' };
      try {
        const cred = await fb.authMod.signInWithEmailAndPassword(fb.auth, mail, password);
        firebaseUser = cred.user;
        return { ok: true };
      } catch (e) {
        return { ok: false, error: 'E-mail ou senha incorretos.' };
      }
    }
    return adminAuth(password) ? { ok: true } : { ok: false, error: 'Senha incorreta.' };
  }

  /* =========================================================
     PAGAMENTOS
     ========================================================= */
  function createPayment({ email, planId, method }) {
    const plan = PLANS.find(p => p.id === planId) || PLANS[0];
    const s = student(email);
    if (!s) throw new Error('Aluno não encontrado.');
    const pm = PAY_METHODS.find(m => m.id === method) || PAY_METHODS[0];
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    const ref2 = String(Date.now()).slice(-8);
    // o id comeca com o uid do dono: e assim que a nuvem sabe
    // que o pagamento pertence a este aluno
    const dono = s.id || '';
    const pay = {
      id: dono + '__' + UI.uid('pay'), uid: dono, email: s.email, studentName: s.name,
      planId: plan.id, planName: plan.name, amount: plan.price, days: plan.days,
      method: pm.id, methodName: pm.name, code, reference: ref2,
      status: 'pendente', createdAt: new Date().toISOString(), approvedAt: null
    };
    save(d => { d.payments.push(pay); });
    return pay;
  }

  const latestPayment = (email, status = 'pendente') =>
    read().payments
      .filter(p => String(p.email).toLowerCase() === String(email).toLowerCase() && p.status === status)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

  function approvePayment(paymentId) {
    const pay = read().payments.find(p => p.id === paymentId);
    if (!pay) throw new Error('Pagamento não encontrado.');
    save(d => {
      const p = d.payments.find(x => x.id === paymentId);
      p.status = 'aprovado';
      p.approvedAt = new Date().toISOString();
      const st = d.students.find(x =>
        x.id === p.uid || String(x.email).toLowerCase() === String(p.email).toLowerCase());
      if (st) {
        const base = st.expiresAt && new Date(st.expiresAt) > new Date() ? new Date(st.expiresAt) : new Date();
        st.expiresAt = UI.addDays(base.toISOString(), p.days);
        st.blocked = false;
        st.status = 'ativo';
      }
    });
    return pay;
  }

  function rejectPayment(paymentId) {
    save(d => {
      const p = d.payments.find(x => x.id === paymentId);
      if (p) p.status = 'recusado';
    });
  }

  /* =========================================================
     ALUNOS
     ========================================================= */
  function setStudent(id, patch) {
    save(d => {
      const s = d.students.find(x => x.id === id);
      if (s) Object.assign(s, patch);
    });
    return read().students.find(x => x.id === id);
  }

  function extendStudent(id, days) {
    const s = read().students.find(x => x.id === id);
    if (!s) return null;
    const base = s.expiresAt && new Date(s.expiresAt) > new Date() ? new Date(s.expiresAt) : new Date();
    return setStudent(id, { expiresAt: UI.addDays(base.toISOString(), days) });
  }

  function deleteStudent(id) {
    const s = read().students.find(x => x.id === id);
    if (!s) return;
    save(d => {
      d.students = d.students.filter(x => x.id !== id);
      d.payments = d.payments.filter(p => p.uid !== id && String(p.email).toLowerCase() !== String(s.email).toLowerCase());
      d.progress = d.progress.filter(p => p.uid !== id && String(p.email || '').toLowerCase() !== String(s.email).toLowerCase());
    });
  }

  async function changePassword(nova) {
    if (!nova || String(nova).length < 6) {
      throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    }
    if (mode === 'firebase') {
      const u = fb.auth.currentUser;
      if (!u) throw new Error('Sessão expirada. Entre novamente no painel.');
      await fb.authMod.updatePassword(u, nova);
      return true;
    }
    save(d => { d.settings.adminPassword = nova; });
    return true;
  }

  /* =========================================================
     BACKUP
     ========================================================= */
  const exportJSON = () => JSON.stringify(read(), null, 2);

  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.courses) || !Array.isArray(data.episodes)) {
      throw new Error('Arquivo inválido: faltam listas de cursos/aulas.');
    }
    save(d => {
      Object.assign(d, data);
    });
  }

  /* =========================================================
     INICIALIZACAO
     ========================================================= */
  let readyResolve;
  const readyPromise = new Promise(r => { readyResolve = r; });
  let sessaoResolve;
  const sessaoPromise = new Promise(r => { sessaoResolve = r; });
  let sessaoResolvida = false;

  async function ready() {
    await readyPromise;
    return cache;
  }

  /** Resolve quando ja sabemos quem esta logado (ou que ninguem esta) */
  async function sessaoPronta() {
    await readyPromise;
    await sessaoPromise;
    return session();
  }

  const marcarSessao = () => {
    if (sessaoResolvida) return;
    sessaoResolvida = true;
    sessaoResolve();
  };

  async function boot() {
    if (!FIREBASE_ON) {
      mode = 'local';
      cache = readLocal();
      readyResolve(cache);
      marcarSessao();
      return cache;
    }

    try {
      fb = await initFirebase();
      mode = 'firebase';
      cache = await loadAll();
      lastSynced = clone(cache);
      attachListeners();

      fb.authMod.onAuthStateChanged(fb.auth, async user => {
        firebaseUser = user;
        if (user) {
          if (isAdminEmail(user.email)) {
            attachListeners();
            await seedIfEmpty();
          } else {
            await garantirPerfil(user);
            attachListeners();
            // o progresso so pode ser lido depois de saber quem e o usuario
            const prog = await carregarProgresso();
            if (cache) { cache.progress = prog; }
            save(d => {
              const t = d.students.find(x => x.id === user.uid);
              if (t) t.lastLogin = new Date().toISOString();
            });
          }
        }
        marcarSessao();
        window.dispatchEvent(new CustomEvent('store:changed'));
      });

      // ja tinha conta de professor logada de antes?
      if (fb.auth.currentUser) await seedIfEmpty();

      if (semPermissao) {
        UI.toast('Firestore sem regras: cole as regras de firebase-rules.txt no console.', '');
      }
    } catch (e) {
      console.error('Falha ao conectar no Firebase, usando modo local.', e);
      mode = 'local';
      cache = readLocal();
      marcarSessao();   // sem nuvem: a sessao e a local, ja sabemos
      UI.toast('Não foi possível conectar no banco. Usando dados salvos neste navegador.', '');
    }

    readyResolve(cache);
    booted = true;
    flushQueue();
    window.dispatchEvent(new CustomEvent('store:changed'));
    return cache;
  }

  const isCloud = () => mode === 'firebase';
  const currentMode = () => mode;

  /** Diagnostico: tenta ler uma colecao e devolve o erro real */
  async function testarLeitura(coll) {
    if (!fb) return { ok: false, erro: 'Firebase nao esta ativo (modo local)' };
    try {
      const docs = await fetchCollection(coll);
      return { ok: true, total: docs.length };
    } catch (e) {
      return { ok: false, codigo: e.code || '', mensagem: e.message || String(e) };
    }
  }

  /** Diagnostico: tenta ler um documento especifico */
  async function testarDoc(coll, id) {
    if (!fb) return { ok: false, erro: 'Firebase nao esta ativo (modo local)' };
    try {
      const s = await fb.fsMod.getDoc(ref(coll, id));
      return { ok: true, existe: s.exists(), dados: s.exists() ? Object.keys(s.data()) : [] };
    } catch (e) {
      return { ok: false, codigo: e.code || '', mensagem: e.message || String(e) };
    }
  }
  const firebaseError = () => {
    if (!FIREBASE_ON) return 'Chaves do Firebase ainda nao preenchidas em js/firebase-config.js';
    if (semPermissao) return 'Regras de seguranca do Firestore ainda nao publicadas (veja firebase-rules.txt)';
    return null;
  };

  /* =========================================================
     API PUBLICA
     ========================================================= */
  return {
    PLANS, PAY_METHODS, SAMPLE,
    ready, boot, isCloud, currentMode, firebaseError, sessaoPronta, testarLeitura, testarDoc, ultimoSync,
    read, save, resetAll, exportJSON, importJSON,
    session, setSession, logout, adminAuth, adminSession, adminLogin: loginAdmin, currentStudent,
    statusOf, canWatch,
    settings, allCourses, allEpisodes, allStudents, allPayments, allProgress,
    course, episode, student, episodesOf, totalDuration, courseProgress, categories, search,
    progressFor, saveProgress, markCompleted, continueWatching, lastCourse, myCourses,
    signUp, loginStudent, createPayment, latestPayment, approvePayment, rejectPayment,
    setStudent, extendStudent, deleteStudent, hasCourseCode, grantCourseCode, changePassword,
    bancoVazio: () => FIREBASE_ON && !!(cache && !cache.courses.length)
  };
})();

/* Dispara a carga assim que o script e carregado. As paginas
   aguardam Store.ready() antes de desenhar a tela. */
window.Store.boot();
