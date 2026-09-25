/* =========================================================
   RitmoK - login, cadastro, planos e pagamento
   ========================================================= */

(() => {
  const { qs, el, toast } = UI;
  const S = window.Store;

  let step = 'login';          // login | signup | plans | pay | pending | done
  let selectedPlan = 'mensal';
  let selectedMethod = 'pix';
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
    children.forEach(c => card.appendChild(c));
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

    const form = el('form', { onsubmit: e => { e.preventDefault(); submit(); } }, [
      errorBox(),
      field('Nome', name),
      field('E-mail', email),
      field('Senha', pass),
      field('Confirmar senha', pass2),
      el('button', { class: 'btn btn-primary btn-block', type: 'submit', id: 'btn-criar', text: 'Continuar para os planos' })
    ]);

    async function submit() {
      if (pass.value !== pass2.value) return showError('As senhas não conferem.');
      const btn = qs('#btn-criar');
      if (btn) { btn.disabled = true; btn.textContent = 'Criando conta…'; }
      try {
        const st = await S.signUp({ name: name.value, email: email.value, password: pass.value, planId: selectedPlan });
        lastEmail = st ? st.email : email.value;
        toast('Conta criada! Escolha seu plano.', 'ok');
        viewPlans(true);
      } catch (err) {
        showError(friendly(err));
        if (btn) { btn.disabled = false; btn.textContent = 'Continuar para os planos'; }
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
      el('p', { class: 'sub', text: 'Leva menos de um minuto. Depois é só escolher o plano.' }),
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

  /* ============================ PLANOS ============================ */

  function viewPlans(isNew = false) {
    step = 'plans';
    const grid = el('div', { class: 'plans' });
    S.PLANS.forEach(p => {
      const card = el('div', { class: 'plan' + (p.id === selectedPlan ? ' active' : ''), role: 'button', tabindex: '0' }, [
        el('div', { class: 'pname', text: p.name }),
        el('div', { class: 'pprice' }, [document.createTextNode(money(p.price)), el('small', { text: p.id === 'mensal' ? ' /mês' : ' /total' })]),
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

    const student = S.currentStudent();
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
    const plan = S.PLANS.find(p => p.id === selectedPlan);

    const methods = el('div', { class: 'pay-methods' });
    S.PAY_METHODS.forEach(m => {
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

    const pix = `00020126580014BR.GOV.BCB.PIX0136${String(lastEmail).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 40)}5204000053039865802BR5920AULA${brand().toUpperCase().slice(0, 20)}6009SAQ`;

    const summary = el('div', { class: 'pix-box' });
    function renderSummary() {
      summary.innerHTML = '';
      const parts = [
        el('div', { style: { fontWeight: '700', marginBottom: '.3rem' }, text: 'Resumo da assinatura' }),
        el('div', { style: { color: 'var(--muted)', fontSize: '.9rem' }, text: `${plan.name} · ${selectedMethod === 'pix' ? 'Pix à vista' : selectedMethod === 'cartao' ? 'Cartão de crédito' : 'Boleto'} · ${plan.days < 365 ? plan.days + ' dias de acesso' : 'Acesso vitalício'}` }),
        el('div', { style: { fontSize: '1.7rem', fontWeight: '800', margin: '.4rem 0 .2rem' }, text: money(plan.price) })
      ];
      if (selectedMethod === 'pix') parts.push(el('div', { class: 'pix-code', text: pix }));
      if (selectedMethod === 'boleto') parts.push(el('div', { class: 'pix-code', text: '34191.79001 01043.510047 91020.150008 8' + Math.floor(Math.random() * 1e4) }));
      if (selectedMethod === 'cartao') parts.push(el('div', { style: { color: 'var(--muted)', fontSize: '.85rem', marginTop: '.5rem' }, text: 'Você será redirecionado para o gateway do cartão.' }));
      summary.append(...parts);
    }
    renderSummary();

    shell([
      logoBlock(),
      el('h1', { text: 'Pagamento' }),
      el('p', { class: 'sub', text: 'Escolha como deseja pagar. O acesso é liberado após a aprovação do pagamento.' }),
      errorBox(),
      methods,
      summary,
      el('div', { class: 'lock-note', html: UI.icons.lock + ' <span>Ambiente de demonstração: nenhum dado real é cobrado ou enviado. O professor aprova o pagamento no painel.</span>' }),
      el('button', {
        class: 'btn btn-primary btn-block', text: 'Já paguei — enviar para aprovação',
        onclick: () => {
          try {
            lastPayment = S.createPayment({ email: lastEmail, planId: selectedPlan, method: selectedMethod });
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
    const pay = lastPayment || S.latestPayment(lastEmail, 'pendente');
    if (!pay) { viewLogin(); return; }

    shell([
      el('div', { class: 'success-ico', html: UI.icons.check }),
      el('h1', { text: 'Pagamento em análise', style: { textAlign: 'center' } }),
      el('p', { class: 'sub', style: { textAlign: 'center' }, text: 'Enviamos sua solicitação ao professor. Você será liberado assim que for aprovada.' }),
      el('div', { class: 'card-box', style: { margin: '0 0 1.2rem' } }, [
        kv('Plano', pay.planName),
        kv('Valor', money(pay.amount)),
        kv('Forma de pagamento', pay.methodName),
        kv('Código de referência', pay.reference),
        kv('Enviado em', UI.dateTimeBR(pay.createdAt)),
        kv('Situação', 'Aguardando aprovação')
      ]),
      el('ol', { class: 'steps' }, [
        el('li', { text: 'Realize o pagamento usando os dados gerados.' }),
        el('li', { text: 'Clique em "Já paguei" (ou volte aqui depois).' }),
        el('li', { text: 'O professor aprova no painel do professor.' }),
        el('li', { text: 'Você entra e assiste a todas as aulas.' })
      ]),
      el('button', {
        class: 'btn btn-primary btn-block', text: 'Atualizar situação',
        onclick: () => {
          const p = S.read().payments.find(x => x.id === pay.id);
          if (p && p.status === 'aprovado') { toast('Pagamento aprovado! Boas aulas.', 'ok'); setTimeout(() => location.href = nextUrl(), 800); }
          else { toast('Ainda aguardando aprovação do professor.', ''); }
        }
      }),
      el('button', { class: 'btn btn-outline btn-block', style: { marginTop: '.6rem' }, text: 'Voltar ao início', onclick: () => location.href = 'index.html' })
    ], true);
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

    const session = S.session();
    if (session && session.role === 'admin') {
      location.href = 'admin.html';
      return;
    }
    if (session && session.role === 'student') {
      const st = S.currentStudent();
      if (st && S.statusOf(st).key === 'ativo') { viewActive(); return; }
      if (st) { lastEmail = st.email; viewPlans(); return; }
      S.logout();
    }

    if (location.hash === '#planos') { viewPlans(); return; }
    viewLogin();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
