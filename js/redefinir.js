/* =========================================================
   CRIAR NOVA SENHA  —  recebe o link que o Firebase manda
   por e-mail e troca a senha do aluno.
   O link chega com o codigo em ?oobCode=... (ou no # da URL
   antiga). Sem esta pagina o aluno clica no e-mail e nao
   acontece nada.
   ========================================================= */

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const el = UI.el;
const qs = UI.qs;

const card = qs('#card');

/* O Firebase manda o codigo na query string; nas versoes
   antigas ele vinha no fragmento (#oobCode=...). */
function lerCodigo() {
  const q = new URLSearchParams(location.search).get('oobCode');
  if (q) return q;
  const h = new URLSearchParams((location.hash || '').replace(/^#/, ''));
  return h.get('oobCode');
}

function tela(titulo, sub, filhos) {
  card.innerHTML = '';
  const partes = [
    el('div', { style: { display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.2rem', color: 'var(--accent)' } }, [
      el('span', { html: UI.logo, style: { width: '26px', height: '26px', display: 'block' } }),
      el('strong', { text: (window.DEFAULT_SETTINGS && window.DEFAULT_SETTINGS.brandName) || 'RitmoK', style: { fontSize: '1.15rem', textTransform: 'uppercase' } })
    ]),
    el('h1', { text: titulo }),
    sub ? el('p', { class: 'sub', text: sub }) : null
  ];
  // aceita um node solto ou uma lista
  const lista = filhos == null ? [] : (Array.isArray(filhos) ? filhos : [filhos]);
  lista.forEach(c => { if (c) partes.push(c); });
  card.append(...partes);
}

function campo(label, node, dica) {
  return el('div', { class: 'field' }, [
    el('label', { text: label }), node,
    dica ? el('div', { class: 'hint', text: dica }) : null
  ]);
}

function aviso(texto) {
  return el('div', { class: 'auth-error show', text: texto });
}

function indoParaLogin() {
  setTimeout(() => location.href = 'login.html', 1800);
}

async function principal() {
  const codigo = lerCodigo();

  // Alguém abriu a pagina sem vir pelo e-mail
  if (!codigo) {
    tela('Link não encontrado', 'Abra o link que chegou no e-mail de recuperação. Ele só funciona uma vez.',
      el('div', {}, [
        el('a', { class: 'btn btn-primary btn-block', href: 'login.html', text: 'Voltar para entrar' }),
        el('a', { class: 'btn btn-ghost btn-block', style: { marginTop: '.6rem' }, href: 'index.html', text: 'Ir para o início' })
      ]));
    return;
  }

  let auth, authMod;
  try {
    const appMod = await import(/* webpackIgnore: true */ SDK + 'firebase-app.js');
    authMod = await import(/* webpackIgnore: true */ SDK + 'firebase-auth.js');
    const app = appMod.initializeApp(window.FIREBASE_CONFIG);
    auth = authMod.getAuth(app);
  } catch (e) {
    tela('Não foi possível carregar', 'Verifique sua internet e recarregue a página.',
      el('a', { class: 'btn btn-primary btn-block', href: 'login.html', text: 'Voltar para entrar' }));
    return;
  }

  // Confere se o link ainda vale antes de pedir a senha nova
  let email = '', operation = '';
  try {
    const info = await authMod.checkActionCode(auth, codigo);
    email = (info.data && info.data.email) || '';
    operation = info.operation || '';
  } catch (e) {
    const expirou = /expired/i.test(e.code || '');
    tela(
      expirou ? 'Link expirado' : 'Link inválido',
      expirou
        ? 'Este link já foi usado ou passou do prazo. Peça um novo na tela de login.'
        : 'Este link não é válido. Peça um novo na tela de login.',
      el('a', { class: 'btn btn-primary btn-block', href: 'login.html', text: 'Pedir um novo link' })
    );
    return;
  }

  /* O link é de recuperação de senha? Se for outra coisa (verificar
     e-mail, por exemplo), não é para mostrar o campo de senha. */
  if (operation && authMod.ActionCodeOperation &&
      operation !== authMod.ActionCodeOperation.PASSWORD_RESET) {
    tela('Link de outro tipo', 'Este link não é de troca de senha. Volte ao início e peça um novo.',
      el('a', { class: 'btn btn-primary btn-block', href: 'login.html', text: 'Voltar para entrar' }));
    return;
  }

  /* O nome da funcao de trocar a senha ja mudou no SDK do Firebase
     (confirmPasswordResetCode -> confirmPasswordReset). Usamos o que
     existe nesta versao e, se nenhuma aparecer, vamos pela API REST,
     que e exatamente a mesma coisa por tras. */
  async function gravarSenha(nova) {
    if (typeof authMod.confirmPasswordReset === 'function') {
      await authMod.confirmPasswordReset(auth, codigo, nova);
      return;
    }
    if (typeof authMod.confirmPasswordResetCode === 'function') {
      await authMod.confirmPasswordResetCode(auth, codigo, nova);
      return;
    }
    // plano C: chamada direta na API do Firebase
    const resp = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key='
      + window.FIREBASE_CONFIG.apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oobCode: codigo, newPassword: nova })
      }
    );
    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      const m = (j.error && j.error.message) || 'falha';
      const err = new Error(m);
      err.code = 'auth/' + String(m).toLowerCase();
      throw err;
    }
  }

  /* ---- formulario da nova senha ---- */
  const p1 = el('input', { class: 'input', type: 'password', id: 'np1', placeholder: 'mínimo 6 caracteres', autocomplete: 'new-password' });
  const p2 = el('input', { class: 'input', type: 'password', id: 'np2', placeholder: 'repita a senha', autocomplete: 'new-password' });
  const erro = el('div', { style: { display: 'none' } });
  const forca = el('div', { class: 'hint' });

  // medidor simples: tamanho e variedade de caracteres
  function medir() {
    const v = p1.value;
    if (!v) { forca.textContent = ''; forca.className = 'hint'; return; }
    let pontos = 0;
    if (v.length >= 6) pontos++;
    if (v.length >= 10) pontos++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) pontos++;
    if (/\d/.test(v)) pontos++;
    if (/[^A-Za-z0-9]/.test(v)) pontos++;
    const nivel = pontos <= 2 ? 'fraca' : pontos === 3 ? 'razoavel' : pontos === 4 ? 'boa' : 'forte';
    forca.textContent = 'Senha ' + nivel;
    forca.className = 'hint ' + (pontos <= 2 ? 'hint-warn' : 'hint-ok');
  }
  p1.addEventListener('input', medir);

  const salvar = el('button', { class: 'btn btn-primary btn-block', type: 'submit', id: 'btn-salvar', text: 'Salvar nova senha' });

  const form = el('form', {
    onsubmit: async e => {
      e.preventDefault();
      erro.style.display = 'none';

      const a = p1.value, b = p2.value;
      if (a.length < 6) { erro.innerHTML = ''; erro.appendChild(aviso('A senha precisa ter pelo menos 6 caracteres.')); erro.style.display = ''; return; }
      if (a !== b) { erro.innerHTML = ''; erro.appendChild(aviso('As duas senhas não são iguais.')); erro.style.display = ''; return; }

      salvar.disabled = true;
      salvar.textContent = 'Salvando…';
      try {
        await gravarSenha(a);
        tela('Senha trocada!', 'Agora é só entrar com a senha nova.',
          el('div', {}, [
            el('div', { class: 'success-ico' }, [el('span', { html: UI.icons.check })]),
            el('a', { class: 'btn btn-primary btn-block', href: 'login.html', text: 'Entrar na plataforma' })
          ]));
        UI.toast('Senha alterada com sucesso.', 'ok');
        indoParaLogin();
      } catch (e2) {
        salvar.disabled = false;
        salvar.textContent = 'Salvar nova senha';
        const cod = e2.code || '';
        let msg;
        if (/password-does-not-meet-requirements|weak-password/i.test(cod)) {
          msg = 'Esta senha é muito fraca. Use pelo menos 6 caracteres, misturando letras e números.';
        } else if (/too-many-requests/i.test(cod)) {
          msg = 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
        } else if (/network|unavailable|timeout|fetch|failed/i.test(cod)) {
          msg = 'Sem conexão com a internet. Verifique e tente de novo.';
        } else if (/expired|invalid/i.test(cod)) {
          msg = 'Este link já foi usado ou expirou. Peça um novo na tela de login.';
        } else {
          msg = 'Não foi possível trocar a senha. Tente novamente.';
        }
        erro.innerHTML = '';
        erro.appendChild(aviso(msg));
        erro.style.display = '';
        p1.focus();
      }
    }
  }, [
    erro,
    campo('Nova senha', p1),
    forca,
    campo('Repita a nova senha', p2),
    salvar
  ]);

  tela('Criar nova senha', email ? 'Para ' + email : 'Escolha uma senha nova para a sua conta.', [form]);
  setTimeout(() => p1.focus(), 60);
}

principal();
