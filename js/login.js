/* =========================================================
   RitmoK - login, cadastro, planos e pagamento
   ========================================================= */

(() => {
  const { qs, el, toast } = UI;
  const S = window.Store;

  let step = 'login';          // login | signup | plans | pay | pending | done
  let selectedPlan = 'mensal';
  let selectedMethod = S.PAY_METHODS[0].id;
  let lastPayment = null;
  let lastEmail = '';

  const brand = () => S.settings().brandName || 'RitmoK';
  const nextUrl = () => {
    const n = new URLSearchParams(location.search).get('next');
    return n && /^[\w\-./?=&%]+$/.test(n) ? n : 'index.html';
  };
  const money = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  /* ============================ SHELL ============================ */

  function shell(children, wide = false) {
    const card = qs('#card');
    card.className = 'auth-card' + (wide ? ' wide' : '');
    card.innerHTML = '';
    (Array.isArray(children) ? children : [children])
      .forEach(c => { if (c === null || c === undefined || c === false) return; card.appendChild(c); });
  }

  function errorBox(message = '') {
    return el('div', { class: 'auth-error' + (message ? ' show' : ''), id: 'auth-error', text: message });
  }

  function showError(msg) {
    const box = qs('#auth-error');
    if (!box) return;
    box.textContent = msg;
    box.classList.add('show');
  }

  function logoBlock() {
    return el('div', { style: { display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.2rem', color: 'var(--accent)' } }, [
      el('span', { html: UI.logo, style: { width: '26px', height: '26px', display: 'block' } }),
      el('strong', { text: brand(), style: { fontSize: '1.15rem', textTransform: 'uppercase', letterSpacing: '-.01em' } })
    ]);
  }

  function field(label, inputNode, hint) {
    return el('div', { class: 'field' }, [
      el('label', { text: label }),
      inputNode,
      hint ? el('div', { class: 'hint', text: hint }) : null
    ]);
  }

  function input(attrs) { return el('input', Object.assign({ class: 'input' }, attrs)); }

  /* ============================ LOGIN ============================ */

  function viewLogin() {
    step = 'login';
    const email = input({ type: 'email', id: 'li-email', placeholder: 'voce@email.com', autocomplete: 'email' });
    const pass = input({ type: 'password', id: 'li-pass', placeholder: '••••••••', autocomplete: 'current-password' });
    const show = el('button', {
      class: 'mini', type: 'button', text: 'Mostrar', style: { marginTop: '-.4rem' },
      onclick: () => {
        const t = pass.type === 'password';
        pass.type = t ? 'text' : 'password';
        show.textContent = t ? 'Ocultar' : 'Mostrar';
      }
    });

    const form = el('form', { onsubmit: e => { e.preventDefault(); submit(); } }, [
      errorBox(),
      field('E-mail', email),
      field('Senha', pass),
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '-.5rem 0 1.2rem' } }, [
        el('span', { style: { fontSize: '.82rem', color: 'var(--muted)' }, text: 'Aluno?' }),
        show
      ]),
      el('button', { class: 'btn btn-primary btn-block', type: 'submit', id: 'btn-entrar', text: 'Entrar' })
    ]);

    async function submit() {
      const btn = qs('#btn-entrar');
      if (btn) { btn.disabled = true; btn.textContent = 'Entrando…'; }
      const r = await S.loginStudent(email.value, pass.value);
      if (!r.ok) {
        showError(r.error);
        if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
        return;
      }
      const status = S.statusOf(r.student);

      // aluno presencial: vai para a tela de status, nao para os planos
      if (r.student.presencial) {
        // veio do paywall? ai simula o upgrade
        const up = new URLSearchParams(location.search).get('upgrade');
        if (up) { viewUpgrade(up); return; }
        viewAguardando();
        return;
      }
      if (status.key !== 'ativo') {
        lastEmail = r.student.email;
        toast('Entre na sua conta e conclua a assinatura.', '');
        viewPlans();
        return;
      }
      toast('Bem-vindo de volta, ' + (r.student.name || '').split(' ')[0] + '!', 'ok');
      setTimeout(() => location.href = nextUrl(), 700);
    }

    shell([
      logoBlock(),
      el('h1', { text: 'Entrar na plataforma' }),
      el('p', { class: 'sub', text: S.settings().tagline || 'Acesse suas videoaulas' }),
      form,
      el('div', { class: 'auth-foot', style: { marginTop: '1.4rem' } }, [
        'Ainda não tem conta? ',
        el('a', { href: '#', text: 'Criar conta grátis', onclick: e => { e.preventDefault(); viewSignup(); } })
      ]),
      el('div', { class: 'auth-foot', style: { fontSize: '.82rem' } }, [
        'É professor? ',
        el('a', { href: 'admin.html', text: 'Acesse o painel' }),
        ' · ',
        el('a', { href: 'index.html', text: 'Ver catálogo' })
      ])
    ]);
    setTimeout(() => email.focus(), 60);
  }

  /* ============================ CADASTRO ============================ */

  function viewSignup() {
    step = 'signup';
    const name = input({ type: 'text', id: 'su-name', placeholder: 'Seu nome completo', autocomplete: 'name' });
    const email = input({ type: 'email', id: 'su-email', placeholder: 'voce@email.com', autocomplete: 'email' });
    const pass = input({ type: 'password', id: 'su-pass', placeholder: 'mínimo 4 caracteres', autocomplete: 'new-password' });
    const pass2 = input({ type: 'password', id: 'su-pass2', placeholder: 'repita a senha', autocomplete: 'new-password' });

    const turma = input({ type: 'text', id: 'su-turma', placeholder: 'Ex.: Violão — Terça 19h' });

    // alternancia: assinatura (padrao) ou presencial
    let presencial = false;
    const boxPresencial = el('div', { style: { display: 'none' } },
      [field('Turma / aula', turma, 'Ajuda o professor a identificar sua turma.')]);
    const avisoPresencial = el('div', {
      class: 'lock-note', style: { display: 'none' },
      html: UI.icons.lock + ' <span>Você <b>não paga nada</b>. Sua solicitação vai ao professor, que libera o acesso presencial quando aprovar.</span>'
    });

    const bAssin = el('button', { class: 'active', type: 'button', text: 'Assinatura online' });
    const bPres = el('button', { type: 'button', text: 'Sou aluno presencial' });
    const abas = el('div', { class: 'auth-tabs' }, [bAssin, bPres]);

    const trocar = p => {
      presencial = p;
      bAssin.classList.toggle('active', !p);
      bPres.classList.toggle('active', p);
      boxPresencial.style.display = p ? '' : 'none';
      avisoPresencial.style.display = p ? '' : 'none';
      const b = qs('#btn-criar');
      if (b) b.textContent = p ? 'Solicitar acesso presencial' : 'Continuar para os planos';
    };
    bAssin.onclick = () => trocar(false);
    bPres.onclick = () => trocar(true);

    const form = el('form', { onsubmit: e => { e.preventDefault(); submit(); } }, [
      errorBox(),
      abas,
      avisoPresencial,
      field('Nome', name),
      field('E-mail', email),
      field('Senha', pass),
      field('Confirmar senha', pass2),
      boxPresencial,
      el('button', { class: 'btn btn-primary btn-block', type: 'submit', id: 'btn-criar', text: 'Continuar para os planos' })
    ]);

    async function submit() {
      if (pass.value !== pass2.value) return showError('As senhas não conferem.');
      const btn = qs('#btn-criar');
      if (btn) { btn.disabled = true; btn.textContent = 'Criando conta…'; }
      try {
        const st = await S.signUp({
          name: name.value, email: email.value, password: pass.value,
          planId: selectedPlan, presencial: presencial, obs: turma.value.trim()
        });
        lastEmail = st ? st.email : email.value;
        if (presencial) {
          toast('Solicitação enviada! O professor vai liberar seu acesso.', 'ok');
          viewAguardando();
        } else {
          toast('Conta criada! Escolha seu plano.', 'ok');
          viewPlans(true);
        }
      } catch (err) {
        showError(friendly(err));
        if (btn) { btn.disabled = false; btn.textContent = presencial ? 'Solicitar acesso presencial' : 'Continuar para os planos'; }
      }
    }

    function friendly(err) {
      const c = String(err && err.code || '');
      if (/email-already-in-use/i.test(c)) return 'Já existe uma conta com este e-mail.';
      if (/invalid-email/i.test(c)) return 'Informe um e-mail válido.';
      if (/weak-password/i.test(c)) return 'A senha precisa ter pelo menos 6 caracteres.';
      if (/too-many-requests/i.test(c)) return 'Muitas tentativas. Aguarde um instante e tente de novo.';
      if (/operation-not-allowed|unauthorized/i.test(c)) return 'O cadastro está desativado no painel do professor.';
      return (err && err.message) || 'Não foi possível criar a conta.';
    }

    shell([
      logoBlock(),
      el('h1', { text: 'Criar conta' }),
      el('p', { class: 'sub', text: 'Escolha como quer estudar com o Prof. Kennedy.' }),
      form,
      el('div', { class: 'auth-foot', style: { marginTop: '1.4rem' } }, [
        'Já tem conta? ',
        el('a', { href: '#', text: 'Entrar', onclick: e => { e.preventDefault(); viewLogin(); } })
      ]),
      el('div', { class: 'auth-foot', style: { fontSize: '.82rem' } }, [
        el('a', { href: 'index.html', text: '← Voltar ao catálogo' })
      ])
    ]);
    setTimeout(() => name.focus(), 60);
  }

  /* ============================ UPGRADE ============================ */

  function viewUpgrade(cursoId) {
    step = 'upgrade';
    const st = S.currentStudent();
    const curso = S.course(cursoId);
    const nome = (st && st.name || '').split(' ')[0];

    const grid = el('div', { class: 'plans' });
    S.planos().forEach(p => {
      const card = el('div', { class: 'plan' + (p.id === 'mensal' ? ' active' : ''), role: 'button', tabindex: '0' }, [
        el('div', { class: 'pname', text: p.name }),
        el('div', { class: 'pprice' }, [document.createTextNode(money(p.price)), el('small', { text: S.periodoDe(p) })]),
        el('div', { class: 'pnote', text: p.note })
      ]);
      const pick = () => {
        selectedPlan = p.id;
        UI.qsa('.plan', grid).forEach(x => x.classList.remove('active'));
        card.classList.add('active');
      };
      card.addEventListener('click', pick);
      card.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
      grid.appendChild(card);
    });

    shell([
      logoBlock(),
      el('h1', { text: 'Faça o upgrade' }),
      el('p', { class: 'sub' }, [
        'Oi, ' + (nome || 'tudo bem?') + '! Seu acesso presencial continua normal. ',
        'Para assistir a ', el('strong', { text: curso ? curso.title : 'este curso' }),
        ' e aos demais cursos online, assine um dos planos abaixo.'
      ]),
      grid,
      el('div', { class: 'steps' }, [
        el('li', { text: 'Escolha o plano e pague por Pix.' }),
        el('li', { text: 'O professor aprova e sua conta vira de acesso ilimitado.' }),
        el('li', { text: 'Você mantém o acesso presencial também — nada se perde.' })
      ]),
      el('button', {
        class: 'btn btn-primary btn-block', text: 'Fazer upgrade agora',
        onclick: () => {
          const pay = S.createPayment({ email: st.email, planId: selectedPlan, method: selectedMethod });
          lastPayment = pay;
          lastEmail = st.email;
          toast('Pedido enviado! O professor vai aprovar.', 'ok');
          viewPending();
        }
      }),
      el('button', { class: 'btn btn-outline btn-block', style: { marginTop: '.6rem' }, text: 'Agora não', onclick: () => location.href = 'index.html' })
    ], true);
  }

  /* ============================ PRESENCIAL ============================ */

  function viewAguardando() {
    step = 'aguardando';
    const st = S.currentStudent();
    const status = S.statusOf(st);
    const aprovado = status.key === 'presencial';
    const primeiro = (st && st.name || '').split(' ')[0];

    shell([
      el('div', { class: 'success-ico', html: aprovado ? UI.icons.check : UI.icons.lock }),
      el('h1', { text: aprovado ? 'Acesso liberado!' : 'Solicitação enviada', style: { textAlign: 'center' } }),
      el('p', { class: 'sub', style: { textAlign: 'center' } },
        aprovado
          ? 'Tudo certo, ' + primeiro + '! Seu acesso presencial está ativo e não precisa de mensalidade.'
          : 'O professor precisa aprovar sua solicitação. Você não paga nada — o acesso é liberado por ele.'),
      st && st.obs ? el('div', { style: { textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem', marginBottom: '1rem' }, text: 'Turma: ' + st.obs }) : null,
      aprovado
        ? el('button', { class: 'btn btn-primary btn-block', text: 'Ver meus cursos', onclick: () => location.href = 'index.html' })
        : el('button', { class: 'btn btn-primary btn-block', text: 'Atualizar situação', onclick: () => location.reload() }),
      !aprovado
        ? el('button', { class: 'btn btn-outline btn-block', style: { marginTop: '.6rem' }, text: 'Sair', onclick: async () => { await S.logout(); location.href = 'index.html'; } })
        : null
    ]);
  }

  /* ============================ PLANOS / UPGRADE ============================ */

  function viewPlans(isNew = false) {
    step = 'plans';
    const student = S.currentStudent();
    if (student && student.presencial) { viewUpgrade(new URLSearchParams(location.search).get('upgrade') || ''); return; }
    const grid = el('div', { class: 'plans' });
    S.planos().forEach(p => {
      const card = el('div', { class: 'plan' + (p.id === selectedPlan ? ' active' : ''), role: 'button', tabindex: '0' }, [
        el('div', { class: 'pname', text: p.name }),
        el('div', { class: 'pprice' }, [document.createTextNode(money(p.price)), el('small', { text: S.periodoDe(p) })]),
        el('div', { class: 'pnote', text: p.note })
      ]);
      const pick = () => {
        selectedPlan = p.id;
        UI.qsa('.plan', grid).forEach(x => x.classList.remove('active'));
        card.classList.add('active');
      };
      card.addEventListener('click', pick);
      card.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
      grid.appendChild(card);
    });

    const st = S.statusOf(student);

    shell([
      logoBlock(),
      el('h1', { text: isNew ? 'Escolha seu plano' : 'Sua assinatura' }),
      el('p', { class: 'sub', text: student ? `Conta: ${student.email} · ${st.label}` : '' }),
      errorBox(),
      grid,
      el('button', {
        class: 'btn btn-primary btn-block', text: 'Ir para o pagamento',
        onclick: () => { lastEmail = student ? student.email : lastEmail; viewPay(); }
      }),
      el('div', { class: 'auth-foot' }, [
        el('a', { href: 'index.html', text: '← Continuar navegando' })
      ])
    ], true);
  }

  /* ============================ PAGAMENTO ============================ */

  function viewPay() {
    step = 'pay';
    const plan = S.planos().find(p => p.id === selectedPlan);
    const metodos = S.PAY_METHODS;

    // com uma unica forma de pagamento nao ha o que escolher: mostra
    // so o aviso, sem uma lista com um item so
    const metodosVisiveis = metodos.length > 1;

    const methods = el('div', { class: 'pay-methods' });
    metodos.forEach(m => {
      const b = el('div', { class: 'pm' + (m.id === selectedMethod ? ' active' : ''), role: 'button', tabindex: '0' }, [
        el('div', { style: { fontSize: '1.3rem' }, text: m.icon }),
        el('div', { text: m.name })
      ]);
      const pick = () => {
        selectedMethod = m.id;
        UI.qsa('.pm', methods).forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        renderSummary();
      };
      b.addEventListener('click', pick);
      b.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
      methods.appendChild(b);
    });

    // a mesma referencia entra no codigo Pix e no pagamento enviado ao
    // professor: e assim que ele casa o pix com o aluno no extrato
    const refPix = String(Date.now()).slice(-8) + Math.floor(Math.random() * 90 + 10);
    const pix = S.pixDeCobranca(plan, refPix);

    const summary = el('div', { class: 'pix-box' });
    function renderSummary() {
      summary.innerHTML = '';
      const metodo = metodos.find(m => m.id === selectedMethod) || metodos[0];
      const parts = [
        el('div', { style: { fontWeight: '700', marginBottom: '.3rem' }, text: 'Resumo da assinatura' }),
        el('div', { style: { color: 'var(--muted)', fontSize: '.9rem' }, text: `${plan.name} · ${metodo.name} · ${plan.days < 365 ? plan.days + ' dias de acesso' : 'Acesso vitalício'}` }),
        el('div', { style: { fontSize: '1.7rem', fontWeight: '800', margin: '.4rem 0 .2rem' }, text: money(plan.price) })
      ];
      if (selectedMethod === 'pix') {
        if (pix.ok) {
          parts.push(el('div', { class: 'pix-code', text: pix.codigo }));
          parts.push(el('div', { class: 'pix-dica', text: 'Abra o app do seu banco, escolha Pix → Pagar com QR Code → Ler QR Code, e aponte a câmera para esta tela.' }));
          parts.push(el('div', { class: 'pix-ref', text: `Referência: ${refPix}` }));
        } else {
          parts.push(el('div', { class: 'pix-alerta' }, [
            el('strong', { text: 'Pix ainda não liberado' }),
            el('span', { text: pix.motivo })
          ]));
        }
      } else if (selectedMethod === 'boleto') {
        parts.push(el('div', { class: 'pix-code', text: '34191.79001 01043.510047 91020.150008 8' + Math.floor(Math.random() * 1e4) }));
      } else if (selectedMethod === 'cartao') {
        parts.push(el('div', { style: { color: 'var(--muted)', fontSize: '.85rem', marginTop: '.5rem' }, text: 'Você será redirecionado para o gateway do cartão.' }));
      }
      summary.append(...parts);
    }
    renderSummary();

    shell([
      logoBlock(),
      el('h1', { text: 'Pagamento' }),
      el('p', {
        class: 'sub',
        text: metodosVisiveis
          ? 'Escolha como deseja pagar. O acesso é liberado após a aprovação do pagamento.'
          : 'Pague por Pix. O acesso é liberado após a aprovação do pagamento.'
      }),
      errorBox(),
      metodosVisiveis ? methods : el('div', { class: 'pix-so' }, [
        el('span', { class: 'pix-so-ico', text: '⚡' }),
        el('div', {}, [
          el('strong', { text: 'Pagamento via Pix' }),
          el('small', { text: 'Aprovação na hora, sem taxa adicional.' })
        ])
      ]),
      summary,
      el('div', { class: 'lock-note', html: UI.icons.lock + ' <span>Ambiente de demonstração: nenhum dado real é cobrado ou enviado. O professor aprova o pagamento no painel.</span>' }),
      el('button', {
        class: 'btn btn-primary btn-block', text: 'Já paguei — enviar para aprovação',
        onclick: () => {
          try {
            lastPayment = S.createPayment({ email: lastEmail, planId: selectedPlan, method: selectedMethod, ref: refPix });
            toast('Solicitação enviada! Aguarde a aprovação.', 'ok');
            viewPending();
          } catch (err) { showError(err.message); }
        }
      }),
      el('button', { class: 'btn btn-outline btn-block', style: { marginTop: '.6rem' }, text: 'Voltar aos planos', onclick: () => viewPlans() })
    ], true);
  }

  /* ============================ AGUARDANDO ============================ */

  function viewPending() {
    step = 'pending';
    const pay = lastPayment || S.latestPayment(lastEmail, 'pendente') || S.latestPayment(lastEmail, 'aprovado');
    if (!pay) { viewLogin(); return; }

    const recarregar = async () => {
      // relê do banco: garante o resultado mesmo sem o aviso ao vivo
      await S.recarregarMeus();
      const p = S.allPayments().find(x => x.id === pay.id);
      if (p && p.status === 'aprovado') {
        const st = S.currentStudent();
        if (st && st.presencial) { S.setStudent(st.id, { presencial: false, aprovado: false, obs: '' }); }
        toast('Pagamento aprovado! Boas aulas.', 'ok');
        setTimeout(() => location.href = nextUrl(), 1000);
        return true;
      }
      if (p && p.status === 'recusado') {
        toast('Este pagamento foi recusado. Fale com o professor.', '');
        return true;
      }
      return false;
    };

    const statusBadge = () => {
      const p = S.allPayments().find(x => x.id === pay.id) || pay;
      const mapa = {
        pendente: ['badge-pendente', 'Aguardando aprovação'],
        aprovado: ['badge-ativo', 'Aprovado — acesso liberado'],
        recusado: ['badge-vencido', 'Recusado']
      }[p.status] || ['badge-neutro', p.status];
      return el('span', { class: 'badge ' + mapa[0], text: mapa[1] });
    };

    shell([
      el('div', { class: 'success-ico', html: UI.icons.check }),
      el('h1', { text: 'Pagamento em análise', style: { textAlign: 'center' } }),
      el('p', { class: 'sub', style: { textAlign: 'center' }, id: 'msg-pagamento' },
        'Enviamos sua solicitação ao professor. Esta tela atualiza sozinha assim que for aprovada.'),
      el('div', { class: 'card-box', style: { margin: '0 0 1.2rem' }, id: 'box-pagamento' }, [
        kv('Plano', pay.planName),
        kv('Valor', money(pay.amount)),
        kv('Forma de pagamento', pay.methodName),
        kv('Código de referência', pay.reference),
        kv('Enviado em', UI.dateTimeBR(pay.createdAt)),
        el('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '.45rem 0', fontSize: '.9rem' } }, [
          el('span', { style: { color: 'var(--muted)' }, text: 'Situação' }),
          statusBadge()
        ])
      ]),
      el('ol', { class: 'steps' }, [
        el('li', { text: 'Realize o pagamento usando os dados gerados.' }),
        el('li', { text: 'Clique em "Já paguei" (ou volte aqui depois).' }),
        el('li', { text: 'O professor aprova no painel do professor.' }),
        el('li', { text: 'Você entra e assiste a todas as aulas.' })
      ]),
      el('button', {
        class: 'btn btn-primary btn-block', text: 'Atualizar situação', id: 'btn-situacao',
        onclick: async () => {
          const b = qs('#btn-situacao');
          if (b) { b.disabled = true; b.textContent = 'Verificando…'; }
          const ok = await recarregar();
          if (!ok) toast('Ainda aguardando aprovação do professor.', '');
          if (ok && b) { b.disabled = false; b.textContent = 'Atualizar situação'; }
        }
      }),
      el('button', { class: 'btn btn-outline btn-block', style: { marginTop: '.6rem' }, text: 'Voltar ao início', onclick: () => location.href = 'index.html' })
    ], true);

    // reage sozinho quando o professor aprovar
    const vigiar = () => {
      const p = S.allPayments().find(x => x.id === pay.id);
      const box = qs('#box-pagamento');
      const msg = qs('#msg-pagamento');
      if (!box || !p) return;
      const span = box.querySelector('.badge');
      if (span) span.replaceWith(statusBadge());
      if (p.status === 'aprovado') {
        if (msg) msg.textContent = 'Pagamento aprovado! Prepare-se que as aulas já estão liberadas.';
        if (qs('#btn-situacao')) qs('#btn-situacao').textContent = 'Entrar e assistir';
      }
    };
    window.addEventListener('store:changed', vigiar);
    vigiar();
    // busca o status atual assim que abre a tela
    if (pay.status !== 'aprovado') S.recarregarMeus().then(vigiar).catch(() => { });
  }

  function kv(k, v) {
    return el('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '.45rem 0', borderBottom: '1px solid var(--line)', fontSize: '.9rem' } }, [
      el('span', { style: { color: 'var(--muted)' }, text: k }),
      el('strong', { text: String(v) })
    ]);
  }

  /* ============================ CONTA JÁ ATIVA ============================ */

  function viewActive() {
    const st = S.currentStudent();
    const status = S.statusOf(st);
    shell([
      el('div', { class: 'success-ico', html: UI.icons.check }),
      el('h1', { text: 'Sua conta está pronta', style: { textAlign: 'center' } }),
      el('p', { class: 'sub', style: { textAlign: 'center' } }, [
        el('span', { class: 'badge badge-' + status.key, text: status.label }),
        ' — bem-vindo, ' + (st.name || '').split(' ')[0] + '!'
      ]),
      el('button', { class: 'btn btn-primary btn-block', text: 'Ir para as aulas', onclick: () => location.href = nextUrl() }),
      el('button', { class: 'btn btn-outline btn-block', style: { marginTop: '.6rem' }, text: 'Gerenciar assinatura', onclick: () => viewPlans() }),
      el('button', { class: 'btn btn-outline btn-block', style: { marginTop: '.6rem' }, text: 'Sair', onclick: () => { S.logout(); location.href = 'index.html'; } })
    ]);
  }

  /* ============================ BOOT ============================ */

  async function init() {
    shell([
      el('h1', { text: 'Carregando…' }),
      el('p', { class: 'sub', text: 'Conectando na sua conta, só um instante.' })
    ]);

    await S.sessaoPronta();
    document.title = 'Entrar — ' + brand();

    // veio do paywall: aluno presencial quer assinar
    const upgrade = new URLSearchParams(location.search).get('upgrade');
    if (upgrade && S.currentStudent() && S.currentStudent().presencial) {
      viewUpgrade(upgrade);
      return;
    }

    const session = S.session();
    if (session && session.role === 'admin') {
      location.href = 'admin.html';
      return;
    }
    if (session && session.role === 'student') {
      const st = S.currentStudent();
      if (st && st.presencial) { viewAguardando(); return; }
      if (st && S.statusOf(st).key === 'ativo') { viewActive(); return; }
      if (st) {
        lastEmail = st.email;
        // tem pagamento na fila? mostra o status em vez de jogar nos planos
        if (S.latestPayment(st.email, 'pendente')) { viewPending(); return; }
        if (S.latestPayment(st.email, 'aprovado')) { viewActive(); return; }
        viewPlans();
        return;
      }
      S.logout();
    }

    if (location.hash === '#planos') { viewPlans(); return; }
    viewLogin();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
