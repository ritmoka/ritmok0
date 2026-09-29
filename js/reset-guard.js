/* =========================================================
   REDIRECIONADOR DE RECUPERACAO DE SENHA
   ------------------------------------------------------------
   O Firebase manda o aluno para a URL de redirecionamento
   configurada em Authentication > Action code settings. Se essa
   URL estiver vazia, ele cai na pagina inicial com o codigo
   (?oobCode=...) e, sem este arquivo, a senha nunca seria trocada.

   Este script roda antes de tudo: se encontrar o codigo em
   qualquer pagina que nao seja a de redefinicao, leva o aluno
   para la.
   ========================================================= */

(function () {
  try {
    var aqui = String(location.pathname || '').toLowerCase();
    if (aqui.indexOf('redefinir.html') !== -1) return;   // ja estamos no lugar certo

    var codigo = new URLSearchParams(location.search).get('oobCode')
      || new URLSearchParams(String(location.hash || '').replace(/^#/, '')).get('oobCode');

    if (!codigo) return;
    location.replace('redefinir.html?oobCode=' + encodeURIComponent(codigo));
  } catch (e) {
    /* nunca deve quebrar a pagina */
  }
})();
