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
    { id: 'mensal', name: 'Mensal', price: 49.9, days: 30, periodo: '/mês', note: 'Cancele quando quiser' },
    { id: 'semestral', name: 'Semestral', price: 249.9, days: 180, periodo: '/semestre', note: 'R$ 41,65/mês · economize 17%' },
    { id: 'anual', name: 'Anual', price: 397, days: 365, periodo: '/ano', note: 'R$ 33,08/mês · economize 33%' }
  ];

  /** Rotulo do periodo, calculado a partir da duracao quando nao informado */
  function periodoDe(p) {
    if (p.periodo) return p.periodo;
    const d = Number(p.days) || 0;
    if (d <= 31) return '/mês';
    if (d <= 200) return '/semestre';
    return '/ano';
  }

  /* Hoje o RitmoK recebe so por Pix: e instantaneo, sem taxa e o aluno
     paga em segundos. Para voltar a aceitar cartao/boleto, acrescente
     { id: 'cartao', ... } ou { id: 'boleto', ... } aqui. */
  const PAY_METHODS = [
    { id: 'pix', name: 'Pix', icon: '⚡' }
  ];

  /* ---------- Pix: gerador de BR Code (copia e cola) ---------- */

  const semAcento = s => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  /* O padrao do Pix e ASCII: acento, emoji ou travessao ocupam varios
     bytes e quebram o tamanho do campo, e o codigo deixa de escanear. */
  const asciiPix = s => semAcento(s).replace(/[^A-Za-z0-9 .,\-]/g, '').trim();

  /** CRC16/CCITT-FALSE: o padrao do Pix exige no fim do codigo */
  function crc16Pix(texto) {
    let crc = 0xFFFF;
    for (let i = 0; i < texto.length; i++) {
      crc ^= texto.charCodeAt(i) << 8;
      for (let b = 0; b < 8; b++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /** O banco so aceita chave de CPF/CNPJ, telefone ou e-mail */
  function chavePixOk(chave) {
    const k = String(chave || '').trim();
    if (/^\d{11}$/.test(k) || /^\d{14}$/.test(k)) return true;             // cpf / cnpj
    if (/^\+\d{10,14}$/.test(k)) return true;                             // celular
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(k)) return true;             // e-mail
    return false;
  }

  function brCodePix(chave, valor, nome, cidade, txid) {
    const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
    const id = String(txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25).toUpperCase() || '***';
    let p = '000201';
    p += tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', String(chave).trim()));
    p += tlv('52', '0000');
    p += tlv('53', '986');
    if (Number(valor) > 0) p += tlv('54', Number(valor).toFixed(2));
    p += tlv('58', 'BR');
    p += tlv('59', asciiPix(nome).slice(0, 25).toUpperCase());
    p += tlv('60', asciiPix(cidade).slice(0, 15).toUpperCase());
    p += tlv('62', tlv('05', id));
    p += '6304';
    return p + crc16Pix(p);
  }

  /** Codigo que o aluno escaneia. A chave e a do professor, cadastrada
      em Painel > Configuracoes: sem ela nao existe Pix valido. */
  function pixDeCobranca(plan, ref) {
    const st = settings();
    const chave = String(st.pixKey || '').trim();
    if (!chavePixOk(chave)) {
      return {
        ok: false, chave: '', codigo: '',
        motivo: 'A chave Pix do professor ainda não foi cadastrada no painel.'
      };
    }
    return {
      ok: true, chave, motivo: '',
      codigo: brCodePix(chave, Number(plan.price) || 0, st.brandName || 'RitmoK', st.pixCity || 'SAO PAULO', ref)
    };
  }

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
        id: 'c_sertanejo', title: 'Dança do Zero ao Palco',
        tagline: 'Dança — do primeiro passo ao palco',
        description: 'Curso completo de dança para quem quer dançar de verdade. Começamos pelo zero: postura corporal, o primeiro movimento e o básico de ritmo. Depois entram expressividade, flexibilidade, condicionamento e a montagem de coreografia. Cada aula traz a explicação passo a passo, exercícios para você praticar em casa e o repertório comentado. Ao final você sai com danças prontas para apresentar.',
        category: 'Dança', instructor: 'Prof. Kennedy', level: 'Do zero ao palco',
        acesso: 'assinatura', videoDemo: SAMPLE.bunny,
        year: 2026, rating: 4.9, featured: true, trending: true,
        cover: '', poster: '', backdrop: '', code: '', createdAt: now
      },
      {
        id: 'c_vaneira', title: 'Vaneira Universitário',
        tagline: 'O ritmo, a percussão e a coreografia para o seu grupo universitário montar a apresentação',
        description: 'Curso de vaneira para grupos universitários: a origem e a cultura do ritmo, percussão de base, coreografia em dupla e em roda, e como organizar um ensaio que chega pronto ao palco. Ideal para projetos de extensão, coletivos culturais, apresentações de fim de semestre e grupos de dança que se apresentam na universidade.',
        category: 'Vaneira', instructor: 'Prof. Kennedy', level: 'Todos os níveis',
        acesso: 'presencial', videoDemo: SAMPLE.meltdowns,
        year: 2026, rating: 4.7, featured: false, trending: true,
        cover: '', poster: '', backdrop: '', code: '', createdAt: now
      }
    ];

    const episodes = [
      { id: 'e_s1', courseId: 'c_sertanejo', number: 1, title: 'Boas-vindas: o mapa do caminho até o palco', description: 'O que você vai dominar ao fim do curso, o que precisa preparar e como montar uma rotina de treino que funciona.', duration: '00:12', videoUrl: SAMPLE.fun, createdAt: now },
      { id: 'e_s2', courseId: 'c_sertanejo', number: 2, title: 'Postura corporal e o primeiro movimento', description: 'Como estar de pé, o alinhamento do corpo, a respiração e o primeiro passo sem travar o joelho.', duration: '00:15', videoUrl: SAMPLE.escapes, createdAt: now },
      { id: 'e_s3', courseId: 'c_sertanejo', number: 3, title: 'Bases do movimento: pés, quadril e braços', description: 'Os movimentos que aparecem em toda dança e como treinar cada um sem criar vício postural.', duration: '00:14', videoUrl: SAMPLE.blazes, createdAt: now },
      { id: 'e_s4', courseId: 'c_sertanejo', number: 4, title: 'O ritmo: contagem e musicalidade', description: 'Sentir a música, marcar a contagem com o corpo e conseguir mudar o ritmo no meio da dança.', duration: '00:18', videoUrl: SAMPLE.joyrides, createdAt: now },
      { id: 'e_s5', courseId: 'c_sertanejo', number: 5, title: 'Expressividade: como o corpo conta a história', description: 'Transmitir emoção com gesto, olhar e intenção. É o que separa dançar de apenas se mover.', duration: '00:16', videoUrl: SAMPLE.meltdowns, createdAt: now },
      { id: 'e_s6', courseId: 'c_sertanejo', number: 6, title: 'Flexibilidade e controle: aquecimento e alongamento', description: 'A sequência diária de alongamento que evita lesão e amplia o alcance dos seus movimentos.', duration: '00:13', videoUrl: SAMPLE.bunny, createdAt: now },
      { id: 'e_s7', courseId: 'c_sertanejo', number: 7, title: 'Montando coreografia: os 3 passos de qualquer dança', description: 'Como criar uma coreografia do zero usando movimento, ritmo e repetição até ficar no corpo.', duration: '00:15', videoUrl: SAMPLE.escapes, createdAt: now },
      { id: 'e_s8', courseId: 'c_sertanejo', number: 8, title: 'Repertório: 10 danças para dominar já no primeiro mês', description: 'Do mais simples ao mais desafiador, com a contagem e os pontos-chave de cada coreografia.', duration: '00:20', videoUrl: SAMPLE.meltdowns, createdAt: now },
      { id: 'e_s9', courseId: 'c_sertanejo', number: 9, title: 'Improviso: dançar ao vivo sem travar', description: 'O que fazer quando você erra o passo, a música mudou ou entrou no palco atrasado.', duration: '00:17', videoUrl: SAMPLE.fun, createdAt: now },
      { id: 'e_s10', courseId: 'c_sertanejo', number: 10, title: 'Ensaio geral: a hora do show', description: 'Marcação de posição no palco, passagem de som, contagem de entrada e a lista do dia da apresentação.', duration: '00:14', videoUrl: SAMPLE.blazes, createdAt: now },
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
        pixKey: d.pixKey || '',
        pixCity: d.pixCity || 'SAO PAULO',
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

  /** Relê do banco o progresso e os pagamentos do aluno (usado pelo botao
      "Atualizar situacao", para nao depender so do listener ao vivo) */
  async function recarregarMeus() {
    if (!fb) return read();
    const meus = await carregarMeus();
    if (cache && meus.progress.length) cache.progress = meus.progress;
    if (cache) cache.payments = juntarRecemCriados(meus.payments);
    window.dispatchEvent(new CustomEvent('store:changed'));
    return read();
  }

  /* ---------- pagamentos recem-criados pelo aluno ---------- */

  /* O aviso do Firestore chega antes da gravacao terminar. Sem isto, a
     lista vinda da nuvem vinha vazia e apagava da memoria o pagamento
     que o aluno acabara de criar: ele nunca chegava ao painel. */
  const recemCriados = new Map();

  function juntarRecemCriados(lista) {
    if (!recemCriados.size) return lista;
    const ids = new Set(lista.map(x => x.id));
    recemCriados.forEach((p, id) => {
      if (ids.has(id)) recemCriados.delete(id);   // a nuvem ja confirmou este
      else lista = lista.concat([p]);
    });
    return lista;
  }

  /** Progresso e pagamentos visiveis para quem esta logado agora */
  async function carregarMeus() {
    const out = { progress: [], payments: [] };
    if (!fb || !firebaseUser) return out;
    const uid = firebaseUser.uid;
    try {
      if (isAdminEmail(firebaseUser.email)) {
        out.progress = await fetchCollection('progress');
        out.payments = await fetchCollection('payments');
        return out;
      }
      // aluno: consulta filtrada pelo proprio uid
      const [prog, pays] = await Promise.all([
        fb.fsMod.getDocs(fb.fsMod.query(fb.fsMod.collection(fb.db, 'progress'), fb.fsMod.where('uid', '==', uid))),
        fb.fsMod.getDocs(fb.fsMod.query(fb.fsMod.collection(fb.db, 'payments'), fb.fsMod.where('uid', '==', uid)))
      ]);
      out.progress = prog.docs.map(d => Object.assign({ id: d.id }, d.data()));
      out.payments = juntarRecemCriados(pays.docs.map(d => Object.assign({ id: d.id }, d.data())));
    } catch (e) { /* sem permissao: segue sem historico */ }
    return out;
  }

  async function loadAll() {
    /* Leituras que TODO mundo pode fazer. Se falharem, de verdade
       as regras nao foram publicadas. */
    const testarPublico = async (col) => {
      try { return await fetchCollection(col); }
      catch (e) {
        if (/permission-denied|permission_denied/i.test(e.code || '')) semPermissao = true;
        return [];
      }
    };
    /* Leituras restritas: negar aqui e o comportamento esperado. */
    const testarPrivado = async (col) => {
      try { return await fetchCollection(col); }
      catch (e) { return []; }
    };

    // progresso: o professor ve tudo; o aluno so o proprio (com filtro)
    const testarMeuProgresso = () => carregarMeus().then(m => m.progress);

    const [courses, episodes, students, payments, progress, setDoc] = await Promise.all([
      testarPublico('courses'),
      testarPublico('episodes'),
      testarPrivado('students'),
      testarPrivado('payments'),
      testarMeuProgresso(),
      fb.fsMod.getDoc(ref('settings', 'app')).then(s => {
        if (!s.exists()) { semPermissao = true; return {}; }
        return s.data();
      }).catch(() => { semPermissao = true; return {}; })
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
      // o aluno acompanha o proprio pagamento ao vivo: quando o
      // professor aprova, a tela muda sozinha sem recarregar
      const meusPays = fb.fsMod.query(colecao('payments'), fb.fsMod.where('uid', '==', uid));
      ear(meusPays, s => { cache.payments = juntarRecemCriados(lista(s)); }, 'payments');
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
      // ainda nao tem cadastro: criamos agora (permitido pelas regras).
      // Se o cadastro acabou de ser feito pela tela de registro, usamos
      // os dados de la (incluindo "presencial"), senao o aluno perderia.
      const p = cadastroPendente;
      cadastroPendente = null;
      const novo = p
        ? makeStudent(user.uid, p.name, p.mail, p.planId, p.presencial)
        : makeStudent(user.uid, user.displayName || user.email, user.email, 'mensal');
      if (p && p.obs) novo.obs = p.obs;
      save(d => { if (!d.students.find(x => x.id === user.uid)) d.students.push(novo); });
      return novo;
    } catch (e) {
      console.warn('Nao foi possivel carregar o cadastro do aluno.', e);
      return null;
    }
  }

  /* Dados do cadastro que esta em andamento (evita perder a flag presencial) */
  let cadastroPendente = null;

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

  /* O Firestore nao aceita undefined: limpamos antes de gravar */
  function limpar(v) {
    if (Array.isArray(v)) return v.map(limpar);
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).forEach(k => {
        if (v[k] === undefined) return;
        o[k] = limpar(v[k]);
      });
      return o;
    }
    return v;
  }

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
        batch.set(ref(coll, id), limpar(obj)); pending++;
        existentes.add(coll + '/' + id);
        escritas.push(coll + '/' + id + (velho ? ' (atualizar)' : ' (criar)'));
      });
    });

    // configuracoes + planos: so o professor
    if (lastSynced && podeGravar('settings', 'app') && !igual(
      { s: lastSynced.settings, p: lastSynced.plans },
      { s: cache.settings, p: cache.plans })) {
      batch.set(ref('settings', 'app'), limpar(Object.assign({}, cache.settings, { planos: cache.plans })));
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

    // Aluno presencial: liberado pelo professor, sem mensalidade
    if (student.presencial) {
      return student.aprovado
        ? { key: 'presencial', label: 'Presencial · liberado' }
        : { key: 'aguardando', label: 'Aguardando aprovação do professor' };
    }

    if (!student.expiresAt) return { key: 'pendente', label: 'Aguardando pagamento' };
    if (UI.isExpired(student.expiresAt)) return { key: 'vencido', label: 'Acesso vencido em ' + UI.dateBR(student.expiresAt) };

    // o nome vem do plano salvo no painel (pode ter sido renomeado)
    const plano = planoDe(student.planId);
    return { key: 'ativo', label: (plano ? plano + ' até ' : 'Ativo até ') + UI.dateBR(student.expiresAt) };
  }

  /** O plano de um aluno, usando a lista ATUAL (editável no painel) */
  function planoDe(id) {
    const lista = read().plans && read().plans.length ? read().plans : PLANS;
    const p = lista.find(x => x.id === id);
    return p ? p.name : '';
  }

  /** O tipo de acesso de um curso: 'assinatura' (padrão) ou 'presencial' */
  const tipoDoCurso = c => (c && c.acesso === 'presencial' ? 'presencial' : 'assinatura');

  /** O aluno pode assistir a ESTE curso? Devolve o motivo quando não pode. */
  function acessoAoCurso(courseId, student = currentStudent()) {
    const c = course(courseId);
    if (!c) return { ok: false, motivo: 'naoexiste', reason: 'Curso não encontrado.', upgrade: false };
    if (adminSession()) return { ok: true, motivo: 'professor', reason: '', upgrade: false };
    if (!student) return { ok: false, motivo: 'semlogin', reason: 'Faça login para assistir às aulas.', upgrade: false };

    if (student.blocked) return { ok: false, motivo: 'bloqueado', reason: 'Seu acesso está bloqueado. Fale com o professor.', upgrade: false };

    const tipo = tipoDoCurso(c);

    // ---- aluno presencial ----
    if (student.presencial) {
      if (tipo === 'presencial') {
        if (student.aprovado) return { ok: true, motivo: 'presencial', reason: '', upgrade: false };
        return {
          ok: false, motivo: 'aguardando', upgrade: false,
          reason: 'Seu acesso presencial ainda não foi liberado. O professor precisa aprovar sua solicitação.'
        };
      }
      // clicou em curso de assinatura: cobrar upgrade
      return {
        ok: false, motivo: 'upgrade', upgrade: true, curso: c,
        reason: 'Este curso faz parte da assinatura. Faça o upgrade para assistir às aulas dele.'
      };
    }

    // ---- aluno pagante ----
    if (tipo === 'presencial') {
      return {
        ok: false, motivo: 'soPresencial', upgrade: false, curso: c,
        reason: 'Este curso é exclusivo para alunos presenciais.'
      };
    }
    const st = statusOf(student);
    if (st.key !== 'ativo') return { ok: false, motivo: 'inativo', reason: 'Seu acesso não está ativo. Renove sua assinatura para assistir.', upgrade: true };
    return { ok: true, motivo: 'assinatura', reason: '', upgrade: false };
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

  /** Checagem geral: logado e com assinatura ativa (usado fora de um curso) */
  function canWatch(student = currentStudent()) {
    if (adminSession()) return { ok: true, reason: '' };
    if (!student) return { ok: false, reason: 'Faça login para assistir às aulas.' };
    const st = statusOf(student);
    if (st.key === 'presencial') return { ok: true, reason: '' };
    if (st.key !== 'ativo') return { ok: false, reason: 'Seu acesso não está ativo. Renove sua assinatura para assistir.' };
    return { ok: true };
  }

  /* =========================================================
     CONSULTAS
     ========================================================= */
  /** A lista de planos que o painel pode editar (nunca a fixa do codigo) */
  const planos = () => (read().plans && read().plans.length ? read().plans : PLANS);

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

  function makeStudent(uid, name, email, planId, presencial = false) {
    return {
      id: uid, name: (name || email).trim(), email: String(email).toLowerCase(),
      planId: planId || 'mensal', status: 'pendente', expiresAt: null,
      // presencial: aluno de turma presencial, liberado pelo professor
      presencial: !!presencial,
      // aprovado: SO o professor pode mudar isto (protegido pelas regras)
      aprovado: false,
      // observacoes livres do professor (ex.: turma, data da inscricao)
      obs: '',
      blocked: false, createdAt: new Date().toISOString(), lastLogin: null
    };
  }

  async function signUp({ name, email, password, planId, presencial, obs }) {
    const mail = validateSignup(name, email, password);

    if (mode === 'firebase') {
      // Criar conta pelo navegador TROCA quem esta logado. Se o professor
      // fizer isso pelo painel, perderia o acesso ao proprio painel.
      // Por isso, no modo nuvem o aluno precisa se cadastrar sozinho.
      if (adminSession()) {
        throw new Error('No modo nuvem o aluno cria a própria conta. Peça para ele entrar em login.html e escolher "Sou aluno presencial". Depois aprove aqui.');
      }
      cadastroPendente = { name: (name || mail).trim(), mail: mail, planId: planId, presencial: !!presencial, obs: obs || '' };
      let cred;
      try {
        cred = await fb.authMod.createUserWithEmailAndPassword(fb.auth, mail, password);
      } catch (e) {
        cadastroPendente = null;
        throw e;
      }
      try {
        // no SDK modular, updateProfile e uma funcao solta (nao metodo)
        await fb.authMod.updateProfile(cred.user, { displayName: (name || mail).trim() });
      } catch (e) { /* apenas cosmetico */ }
      // garante o cadastro com os dados corretos (inclusive presencial)
      cadastroPendente = null;
      const prof = await garantirPerfil(cred.user) || student(mail);
      firebaseUser = cred.user;
      return prof || student(mail);
    }

    const lista = planos();
    const plan = lista.find(p => p.id === planId) || lista[0];
    const novo = makeStudent('s_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, mail, plan.id, presencial);
    novo.password = password;
    save(d => { d.students.push(novo); });
    setSession({ role: 'student', email: novo.email, name: novo.name });
    return student(mail);
  }

  /** Professor aprova (ou revoga) o acesso de um aluno presencial */
  function aprovarPresencial(id, aprovar = true, obs = null) {
    save(d => {
      const s = d.students.find(x => x.id === id);
      if (!s) return;
      s.presencial = true;
      s.aprovado = !!aprovar;
      if (obs !== null) s.obs = String(obs || '');
      if (aprovar) s.status = 'presencial'; else s.status = 'pendente';
    });
    return read().students.find(x => x.id === id);
  }

  /** Converte um aluno presencial em pagante (upgrade) */
  function virarPagante(id, planId) {
    const plan = planos().find(p => p.id === planId) || planos()[0];
    save(d => {
      const s = d.students.find(x => x.id === id);
      if (!s) return;
      s.presencial = false;
      s.aprovado = false;
      s.obs = '';
      s.planId = plan.id;
      const base = s.expiresAt && new Date(s.expiresAt) > new Date() ? new Date(s.expiresAt) : new Date();
      s.expiresAt = UI.addDays(base.toISOString(), plan.days);
      s.status = 'ativo';
    });
    return read().students.find(x => x.id === id);
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
  function createPayment({ email, planId, method, ref }) {
    // usa o plano cadastrado no painel, nunca a lista de origem: se o
    // professor mudar o preco, o valor cobrado tem que ser o novo
    const lista = planos();
    const plan = lista.find(p => p.id === planId) || lista[0];
    const s = student(email);
    if (!s) throw new Error('Aluno não encontrado.');
    const pm = PAY_METHODS.find(m => m.id === method) || PAY_METHODS[0];
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    // a mesma referencia vai dentro do codigo Pix, para o professor
    // casar o pagamento no extrato com o aluno
    const ref2 = String(ref || Date.now()).replace(/[^A-Za-z0-9]/g, '').slice(0, 25).toUpperCase();
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
    recemCriados.set(pay.id, pay);   // protege ate a nuvem confirmar
    return pay;
  }

  const latestPayment = (email, status = 'pendente') =>
    read().payments
      .filter(p => String(p.email).toLowerCase() === String(email).toLowerCase() && p.status === status)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

  function approvePayment(paymentId) {
    const pay = read().payments.find(p => p.id === paymentId);
    if (!pay) throw new Error('Pagamento não encontrado.');
    let convertido = false;
    save(d => {
      const p = d.payments.find(x => x.id === paymentId);
      p.status = 'aprovado';
      p.approvedAt = new Date().toISOString();
      const st = d.students.find(x =>
        x.id === p.uid || String(x.email).toLowerCase() === String(p.email).toLowerCase());
      if (st) {
        // Aprovar um pagamento = virar pagante.
        // Sem isso, um aluno presencial continuaria preso so nos
        // cursos de turma mesmo com a assinatura paga.
        if (st.presencial) { st.presencial = false; st.aprovado = false; st.obs = ''; convertido = true; }
        st.planId = p.planId;
        const base = st.expiresAt && new Date(st.expiresAt) > new Date() ? new Date(st.expiresAt) : new Date();
        st.expiresAt = UI.addDays(base.toISOString(), p.days);
        st.blocked = false;
        st.status = 'ativo';
      }
    });
    pay.__virouPagante = convertido;
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

  /** Recoloca o conteudo inicial (cursos e aulas de exemplo).
      Preserva tudo que o professor ja cadastrou. */
  function restaurarExemplo(soFaltando = true) {
    const s = seed();
    let novos = 0, atualizados = 0;
    save(d => {
      s.courses.forEach(c => {
        const i = d.courses.findIndex(x => x.id === c.id);
        if (i < 0) { d.courses.push(c); novos++; }
        else if (!soFaltando) { d.courses[i] = c; atualizados++; }
      });
      s.episodes.forEach(e => {
        const i = d.episodes.findIndex(x => x.id === e.id);
        if (i < 0) { d.episodes.push(e); novos++; }
        else if (!soFaltando) { d.episodes[i] = e; atualizados++; }
      });
    });
    return { novos: novos, atualizados: atualizados };
  }

  /* Le numero aceitando virgula (padrão brasileiro) e ponto */
  function numeroBR(valor, padrao = 0) {
    if (typeof valor === 'number' && !isNaN(valor)) return valor;
    let s = String(valor === null || valor === undefined ? '' : valor).trim();
    if (!s) return padrao;
    s = s.replace(/\s/g, '').replace(/[^\d.,-]/g, '');
    if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.indexOf(',') > -1) {
      s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? padrao : n;
  }

  /** Troca o plano antigo 'vitalicio' pelo 'anual' em alunos e pagamentos */
  function migrarPlanos() {
    const padrao = PLANS.slice();
    save(d => {
      if (!d.plans || !d.plans.length) d.plans = padrao;
      d.plans.forEach(p => {
        if (p.id === 'vitalicio') {
          p.id = 'anual';
          p.name = 'Anual';
          p.days = 365;
          if (!p.price) p.price = 397;
          if (/vital/i.test(p.note || '')) p.note = 'R$ 33,08/mês · economize 33%';
        }
      });
      d.students.forEach(s => { if (s.planId === 'vitalicio') s.planId = 'anual'; });
      d.payments.forEach(p => {
        if (p.planId === 'vitalicio') { p.planId = 'anual'; p.planName = 'Anual'; }
      });
    });
    return planos();
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
            // progresso e pagamento so podem ser lidos depois de saber quem e o usuario
            const meus = await carregarMeus();
            if (cache) { cache.progress = meus.progress; cache.payments = meus.payments; }
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
    PLANS, PAY_METHODS, SAMPLE, chavePixOk, brCodePix, pixDeCobranca,
    ready, boot, isCloud, currentMode, firebaseError, sessaoPronta, testarLeitura, testarDoc, ultimoSync,
    read, save, resetAll, exportJSON, importJSON,
    session, setSession, logout, adminAuth, adminSession, adminLogin: loginAdmin, currentStudent,
    statusOf, canWatch,
    settings, allCourses, allEpisodes, allStudents, allPayments, allProgress,
    course, episode, student, episodesOf, totalDuration, courseProgress, categories, search,
    progressFor, saveProgress, markCompleted, continueWatching, lastCourse, myCourses,
    signUp, loginStudent, createPayment, latestPayment, approvePayment, rejectPayment,
    setStudent, extendStudent, deleteStudent, hasCourseCode, grantCourseCode, changePassword,
    aprovarPresencial, virarPagante, acessoAoCurso, tipoDoCurso, restaurarExemplo,
    planos, planoDe, periodoDe, migrarPlanos, numeroBR, recarregarMeus, bancoVazio: () => FIREBASE_ON && !!(cache && !cache.courses.length)
  };
})();

/* Dispara a carga assim que o script e carregado. As paginas
   aguardam Store.ready() antes de desenhar a tela. */
window.Store.boot();
