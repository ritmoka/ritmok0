/* =========================================================
   CONFIGURACAO DO FIREBASE  -  RitmoK
   ------------------------------------------------------------
   PROJETO: ritmok1
   Status: chaves preenchidas e conectadas.

   Se algum dia trocar de projeto, edite apenas o bloco
   FIREBASE_CONFIG acima e o arquivo firebase-rules.txt.
   ========================================================= */

window.FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAQ8WM4orn-R5UXu340yA1r0Rgyaos7FOc",
  authDomain:        "ritmok1.firebaseapp.com",
  projectId:         "ritmok1",
  storageBucket:     "ritmok1.firebasestorage.app",
  messagingSenderId: "924173116464",
  appId:             "1:924173116464:web:3f91c6a19ffb679845f9f5"
};

/* E-mail do professor: sera o unico com acesso ao painel.
   Use O MESMO e-mail com que voce criar a conta do professor
   no painel (aba > Alunos > Cadastrar aluno).

   >>> IMPORTANTE: troque tambem este mesmo e-mail em
       firebase-rules.txt, na linha isAdmin().            */
window.ADMIN_EMAIL = "kennedy@ritmok.com";

/* Nome e dados que aparecem por padrao na plataforma */
window.DEFAULT_SETTINGS = {
  brandName: 'RitmoK',
  tagline: 'Cursos de musica com o Prof. Kennedy',
  adminPassword: 'admin123',
  adminEmail: 'kennedy@ritmok.com',
  contactEmail: 'contato@ritmok.com',
  requireApproval: true,
  heroRotation: true
};
