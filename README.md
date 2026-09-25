# RitmoK — Prof. Kennedy

Plataforma de videoaulas com visual de streaming (tipo Netflix): banner de
destaque, fileiras de cartões, busca, página de detalhes e player com
"continuar assistindo".

Roda **direto no navegador**, sem instalar nada.

---

## 🚀 Como abrir

**Opção 1 — do jeito mais simples**
Clique duas vezes no arquivo `index.html`.

**Opção 2 — com servidor local (recomendado)**
Dê dois cliques em `iniciar.bat`. Ele sobe o site em `http://localhost:8080` e
abre o navegador sozinho. Não precisa de Node.js nem Python: o projeto já vem
com um servidor em PowerShell.

> ⚠️ **Por que o servidor local?** Aulas do **YouTube** só aparecem quando a
> página é aberta por `http://localhost`. Abrindo o `index.html` direto
> (`file://`), as aulas de MP4 funcionam normalmente e as de YouTube mostram um
> botão para abrir no YouTube.

---

## 🔑 Primeiros passos

| Tela | Arquivo | Acesso |
|---|---|---|
| Site / catálogo | `index.html` | público |
| Entrar e assinar | `login.html` | público |
| Assistir aula | `player.html?id=...` | aluno logado com acesso ativo |
| Painel do professor | `admin.html` | senha: **`admin123`** |

> Troque a senha em **Painel → Configurações → Senha do professor**.

---

## 🎵 Os dois cursos

### 1. Sertanejo do Zero ao Palco — 10 aulas
1. Boas-vindas: o mapa do caminho até o palco
2. Conhecendo a viola: afinação, postura e o primeiro som
3. Acordes básicos: maior, menor e com sétima
4. A batida do sertanejo: o ritmo que sustenta tudo
5. Sanfona: teclas, gaita e o peso da mão
6. Baixinho e percussão: a camada que dá profissionalidade
7. Harmonia aplicada: quando usar aberto e quando usar fechado
8. Repertório: 10 músicas para tocar já no primeiro mês
9. Cantar e tocar ao mesmo tempo (sem travar)
10. Ensaio geral: a hora do show

### 2. Vaneira Universitário — 6 aulas
1. Boas-vindas: como formar e preparar seu grupo
2. O que é vaneira: origem, cultura e ritmo
3. Percussão de base: ganzá e pandeiro
4. Coreografia básica: passos, giro e marcação
5. Arranjo para apresentação acadêmica
6. Ensaio geral e dia da apresentação

> ⚠️ **Os links dos vídeos são de demonstração.** Cada aula aponta para um vídeo
> público de teste, só para o player funcionar. Troque pelos seus vídeos reais
> em **Painel → Aulas**.

---

## ✨ O que o app faz

### Para o aluno
- Catálogo estilo streaming com banner rotativo, fileiras e busca.
- Login, criação de conta, escolha de plano (mensal / semestral / vitalício).
- Pagamento por Pix, cartão ou boleto — gera um pedido para aprovação.
- Player com lista de aulas lateral, marca de "concluída" e navegação de aula.
- **Continuar assistindo**: retoma de onde a pessoa parou.
- Atalhos: `←` / `→` voltam/avançam 10 s, `F` entra em tela cheia.

### Para o professor (painel)
- **Visão geral** — cursos, aulas, alunos, acessos ativos e receita.
- **Cursos** — criar, editar, excluir, destacar, categoria/nível/nota.
  As capas são geradas automaticamente; você pode colar a URL da sua imagem.
- **Aulas** — cadastrar vídeo por link (**MP4** ou **YouTube**), com número,
  duração, descrição, reordenar e excluir.
- **Alunos** — cadastrar, editar plano, liberar +30 dias, bloquear.
- **Pagamentos** — aprovar ou recusar; a aprovação libera o acesso na hora.
- **Progresso** — quem parou, quanto assistiu e quando voltou.
- **Configurações** — nome, e-mails, planos e preços, senha do professor.
- **Backup** — baixar e restaurar todos os dados em um arquivo `.json`.
- **Código de acesso** opcional por curso, para turmas restritas.

---

## 🎬 Sobre os vídeos

O painel aceita dois tipos de link:

**1. Vídeo direto (MP4)** — melhor experiência, controle total de progresso:
```
https://seuservidor.com/aulas/aula-01.mp4
```

**2. YouTube** — cole o link normal, o app converte sozinho:
```
https://www.youtube.com/watch?v=ID_DO_VIDEO
https://youtu.be/ID_DO_VIDEO
https://www.youtube.com/shorts/ID_DO_VIDEO
```

O painel mostra o tipo detectado logo abaixo do campo.

---

## ☁️ Firebase — já configurado e funcionando

Projeto `ritmok1`, chaves em `js/firebase-config.js`. Testado de ponta a ponta:
cadastro de aluno, pagamento, aprovação, player e progresso salvo na nuvem.

### O que foi validado

| Situação | Resultado |
|---|---|
| Aluno cria conta | ✅ gravado no Firestore |
| Aluno não lê dados de outros | ✅ bloqueado pelas regras |
| Professor vê e aprova | ✅ |
| Progresso sobrevive ao recarregar | ✅ |
| Aula nova aparece sozinha | ✅ sincronização automática |

### Regras de segurança

O arquivo `firebase-rules.txt` é o que protege os dados dos seus alunos.
**Se ele mudar, publique de novo** em *Firestore → Regras → Publicar*.

Sem essas regras, qualquer pessoa poderia ler a lista de alunos e alterar
suas aulas. Nunca copie o `index.html` para fora sem elas.

### Senhas

No modo nuvem a senha é tratada pelo Google — ela nunca é guardada no banco.
Troque a sua em **Painel → Configurações → Senha do professor**.

### ⚠️ Republique as regras

Atualizei `firebase-rules.txt` (pagamentos agora exigem o `uid` do dono).
Abra o console, vá em **Firestore Database → Regras**, cole o arquivo novo e
clique em **Publicar**.

### Publicar o site

**Build → Hosting → começar** → copie o comando e rode no terminal na pasta
do projeto (precisa do Node.js: <https://nodejs.org>):

```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # public: build, yes; SPA: no
firebase deploy
```

O endereço final será `https://ritmok1.web.app`.

### Modo local x modo nuvem

| Situação | Modo |
|---|---|
| Chaves preenchidas + regras publicadas | 🔵 nuvem — dados iguais para todos |
| Chaves vazias (`"COLE AQUI"`) | 🟡 local — dados só neste navegador |

---

## 💾 Modo local: onde ficam os dados

Tudo é salvo no **armazenamento local do navegador** (`localStorage`).

| Isso significa | Consequência |
|---|---|
| ✅ Não precisa de servidor nem banco de dados | funciona offline |
| ⚠️ Fica só neste computador e navegador | outro dispositivo não enxerga |
| ⚠️ Limpar o histórico do navegador apaga tudo | faça backup em **Configurações** |

Para usar de verdade com alunos, publique o projeto em uma hospedagem
estática (GitHub Pages, Netlify, Vercel) e troque `js/db.js` por uma API real
(Supabase, Firebase ou um backend próprio). O resto do código não precisa mudar:
ele só conversa com as funções expostas em `window.Store`.

---

## 📁 Estrutura

```
Projeto Padrão/
├── index.html          Catálogo / home
├── login.html          Entrar, criar conta, planos e pagamento
├── player.html         Player de aulas
├── admin.html          Painel do professor
├── iniciar.bat         Sobe o servidor local e abre o navegador
├── servidor.ps1        Servidor em PowerShell (sem Node/Python)
├── css/
│   └── style.css       Todo o visual (tema escuro)
└── js/
    ├── ui.js           Utilitários, ícones e navbar
    ├── art.js          Geração automática das capas (SVG)
    ├── db.js           Dados, contas, pagamentos e progresso
    ├── app.js          Lógica do catálogo
    ├── login.js        Lógica de login/assinatura
    ├── player.js       Lógica do player e do progresso
    └── admin.js        Lógica do painel
```

---

## 🎨 Personalizar

**Nome, cores e e-mails** — `admin.html → Configurações`.

**Cores e estilo** — no topo de `css/style.css`:

```css
:root {
  --accent: #e50914;   /* vermelho da marca — troque pelo seu */
  --bg:     #0b0b0d;   /* fundo do site */
}
```

**Nome e logotipo** — `admin.html → Configurações → Identidade`.

---

## 🔒 Privacidade e direitos autorais

Este projeto é um **ambiente de demonstração**:

- o "pagamento" é simulado, nada é cobrado e nenhum dado sai do seu computador;
- a senha do professor é comparada no próprio navegador (não é hash de verdade);
- os dados de alunos seguem a LGPD: colete apenas o necessário e nunca exponha o
  painel publicamente.

Só publique em você e mantenha a autorização dos vídeos que distribuí.
