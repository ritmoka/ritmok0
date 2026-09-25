/* =========================================================
   RitmoK - player de aulas
   MP4/HLS  -> <video> nativo com controle de progresso
   YouTube  -> IFrame API para acompanhar o progresso
   ========================================================= */

(() => {
  const { qs, el, timecode, toast } = UI;
  const S = window.Store;

  const state = {
    episodeId: null,
    course: null,
    episodes: [],
    index: -1,
    kind: 'mp4',
    yt: null,          // player do YouTube
    lastSaved: 0,
    isSeeking: false
  };

  /* ============================ BOOT ============================ */

  const aviso = (titulo, texto, botoes = '') => {
    document.body.innerHTML = `<div class="login-gate"><div class="auth-card">
      <h1>${UI.esc(titulo)}</h1>
      <p class="sub">${texto}</p>
      ${botoes}
    </div></div>`;
  };

  /* tela de carregamento sem destruir o layout do player */
  const mostrarCarregando = () => {
    const c = qs('#carregando'), a = qs('#app');
    if (c) c.style.display = 'grid';
    if (a) a.style.display = 'none';
  };
  const esconderCarregando = () => {
    const c = qs('#carregando'), a = qs('#app');
    if (c) c.style.display = 'none';
    if (a) a.style.display = '';
  };

  async function init() {
    const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);

    // espera o banco e a sessao ficarem prontos
    mostrarCarregando();
    await S.sessaoPronta();

    const gate = S.canWatch();
    if (!gate.ok) {
      aviso('Acesso restrito', UI.esc(gate.reason), `
        <a class="btn btn-primary btn-block" href="login.html?next=${next}">Entrar ou assinar</a>
        <a class="btn btn-outline btn-block" style="margin-top:.6rem" href="index.html">Voltar ao catálogo</a>`);
      return;
    }

    state.episodeId = new URLSearchParams(location.search).get('id');
    const ep = S.episode(state.episodeId);
    if (!ep) {
      aviso('Aula não encontrada', 'O link pode estar errado ou a aula foi removida.',
        '<a class="btn btn-primary btn-block" href="index.html">Voltar ao catálogo</a>');
      return;
    }

    // curso com código de acesso
    if (!S.hasCourseCode(ep.courseId)) {
      const c = S.course(ep.courseId) || { title: 'Este curso' };
      document.body.innerHTML = `<div class="login-gate"><div class="auth-card">
        <h1>Código necessário</h1>
        <p class="sub">"${UI.esc(c.title)}" é um curso restrito. Digite o código fornecido pelo professor para assistir.</p>
        <div class="auth-error" id="code-error"></div>
        <form id="code-form">
          <div class="field"><label>Código de acesso</label>
          <input class="input" type="text" id="code-input" placeholder="Ex.: TURMA2026" autocomplete="off"></div>
          <button class="btn btn-primary btn-block" type="submit">Liberar acesso</button>
        </form>
        <a class="btn btn-outline btn-block" style="margin-top:.6rem" href="index.html">Voltar ao catálogo</a>
      </div></div>`;
      qs('#code-form').addEventListener('submit', ev => {
        ev.preventDefault();
        const val = qs('#code-input').value;
        if (S.grantCourseCode(ep.courseId, val)) { toast('Acesso liberado!', 'ok'); location.reload(); }
        else {
          const box = qs('#code-error');
          box.textContent = 'Código incorreto. Confira e tente novamente.';
          box.classList.add('show');
        }
      });
      return;
    }

    state.course = S.course(ep.courseId);
    state.episodes = S.episodesOf(ep.courseId);
    state.index = state.episodes.findIndex(e => e.id === ep.id);
    state.kind = UI.videoType(ep.videoUrl);

    document.title = ep.title + ' — ' + (S.settings().brandName || 'RitmoK');
    esconderCarregando();
    renderChrome();
    loadPlayer(ep);
    bindControls();
  }

  /* ============================ INTERFACE ============================ */

  function renderChrome() {
    const ep = state.episodes[state.index];
    const c = state.course;
    if (!ep) return;

    qs('#p-course').textContent = c.title;
    qs('#p-count').textContent = `Aula ${ep.number} de ${state.episodes.length} · ${c.instructor || ''}`;
    qs('#p-title').textContent = `${ep.number}. ${ep.title}`;
    qs('#p-desc').textContent = ep.description || '';
    qs('#p-side-title').textContent = c.title;
    qs('#p-side-count').textContent = `${state.episodes.length} aulas · ${UI.timecode(S.totalDuration(c.id))} no total`;
    qs('#btn-prev').disabled = state.index <= 0;
    qs('#btn-next').disabled = state.index >= state.episodes.length - 1;
    qs('#btn-next').textContent = state.index >= state.episodes.length - 1 ? 'Última aula' : 'Próxima aula';

    const done = state.episodes.filter(e => (S.progressFor(e.id) || {}).completed).length;
    const pct = state.episodes.length ? Math.round((done / state.episodes.length) * 100) : 0;
    qs('#p-side-progress').innerHTML = `
      <div style="font-size:.8rem;color:var(--muted);margin-bottom:.35rem">Seu progresso: ${done}/${state.episodes.length} (${pct}%)</div>
      <div class="bar" style="margin:0"><i style="width:${pct}%"></i></div>`;

    // lista lateral
    const list = qs('#ep-list');
    list.innerHTML = '';
    state.episodes.forEach(e => {
      const prog = S.progressFor(e.id);
      const item = el('li', {
        class: 'ep-item' + (e.id === state.episodeId ? ' current' : ''),
        role: 'button', tabindex: '0'
      });
      const thumb = el('div', { class: 'ep-thumb' });
      thumb.append(
        el('img', { src: Art.episodeThumb(e.id + e.title, e.number), alt: '', loading: 'lazy' }),
        el('span', { class: 'num', text: String(e.number) })
      );
      const b = el('div', { class: 'ep-body' });
      const h = el('h4');
      h.appendChild(document.createTextNode(e.title));
      if (prog && prog.completed) h.appendChild(el('span', { class: 'ep-done', title: 'Concluída', html: UI.icons.check }));
      b.append(h, el('p', { text: e.description || '' }));
      b.appendChild(el('small', { style: { color: 'var(--muted)', fontSize: '.74rem' }, text: `${e.duration || '--:--'}${prog && prog.seconds ? ' · até ' + timecode(prog.seconds) : ''}` }));
      item.append(thumb, b);
      const go = () => { if (e.id !== state.episodeId) location.href = 'player.html?id=' + encodeURIComponent(e.id); };
      item.addEventListener('click', go);
      item.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(); });
      list.appendChild(item);
    });
  }

  function updateBar(sec, total) {
    const pct = total > 0 ? Math.min(100, (sec / total) * 100) : 0;
    qs('#p-bar').style.width = pct + '%';
    qs('#p-time').textContent = timecode(sec) + (total ? ' / ' + timecode(total) : '');
  }

  /* ============================ PLAYER: MP4 ============================ */

  function loadPlayer(ep) {
    const stage = qs('#stage');
    stage.innerHTML = '';
    const saved = S.progressFor(ep.id);
    const startAt = (saved && !saved.completed) ? (saved.seconds || 0) : 0;

    if (state.kind === 'youtube') { loadYouTube(ep, startAt); return; }

    const video = el('video', {
      id: 'video',
      controls: true,
      autoplay: true,
      playsinline: true,
      preload: 'metadata',
      poster: Art.episodeThumb(ep.id + ep.title, ep.number),
      src: ep.videoUrl
    });
    stage.appendChild(video);

    // HLS (.m3u8) precisa de biblioteca externa
    if (/\.m3u8(\?|$)/i.test(ep.videoUrl)) {
      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(ep.videoUrl);
        hls.attachMedia(video);
      } else {
        toast('Este link .m3u8 precisa de internet (suporte HLS).', '');
      }
    }

    video.addEventListener('loadedmetadata', () => {
      if (startAt > 10 && startAt < video.duration - 10) {
        video.currentTime = startAt;
        toast('Retomando de ' + timecode(startAt) + ' — clique em "Recomeçar" se preferir do zero.');
      }
      updateBar(video.currentTime, video.duration || 0);
    });

    video.addEventListener('timeupdate', () => {
      if (state.isSeeking) return;
      updateBar(video.currentTime, video.duration || 0);
      const now = Date.now();
      if (now - state.lastSaved > 5000 && video.currentTime > 3) {
        state.lastSaved = now;
        S.saveProgress(ep.id, video.currentTime, video.duration || 0, false);
      }
    });

    video.addEventListener('seeked', () => {
      state.isSeeking = false;
      S.saveProgress(ep.id, video.currentTime, video.duration || 0, false);
    });

    video.addEventListener('seeking', () => { state.isSeeking = true; });

    video.addEventListener('pause', () => {
      S.saveProgress(ep.id, video.currentTime, video.duration || 0, false);
    });

    video.addEventListener('ended', () => {
      S.saveProgress(ep.id, video.duration || 0, video.duration || 0, true);
      updateBar(video.duration || 0, video.duration || 0);
      onFinished();
    });

    video.addEventListener('error', () => showStageError(ep, 'Não foi possível carregar este vídeo. Verifique se o link está correto e é público.'));
  }

  /* ============================ PLAYER: YOUTUBE ============================ */

  function loadYouTube(ep, startAt) {
    const stage = qs('#stage');
    const id = UI.youtubeId(ep.videoUrl);
    const host = el('div', { id: 'yt-host', style: { width: '100%', aspectRatio: '16/9', background: '#000' } });
    stage.appendChild(host);

    const fallback = () => {
      host.innerHTML = '';
      host.style.aspectRatio = 'auto';
      host.append(
        el('div', { class: 'stage-fallback' }, [
          el('p', { text: 'O player do YouTube não carregou aqui.' }),
          el('p', { style: { fontSize: '.85rem' }, text: 'Abrindo a aula no YouTube em uma nova aba…' })
        ])
      );
      window.open(ep.videoUrl, '_blank', 'noopener');
    };

    // YouTube só funciona se a página for aberta por http(s). Via file:// mostramos o link alternativo.
    if (location.protocol === 'file:') {
      stage.innerHTML = '';
      stage.append(el('div', { class: 'stage-fallback' }, [
        el('p', { html: 'Para assistir a aulas do YouTube, abra este projeto por um servidor local.' }),
        el('p', { style: { fontSize: '.85rem', marginBottom: '1rem' }, text: 'Dica: use a extensão "Live Server" do VS Code ou o comando "npx serve" na pasta do projeto.' }),
        el('a', { class: 'btn btn-primary', href: ep.videoUrl, target: '_blank', rel: 'noopener', text: 'Abrir aula no YouTube' })
      ]));
      wireSaveOnly(ep);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = fallback;
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      try {
        state.yt = new YT.Player('yt-host', {
          videoId: id,
          playerVars: {
            autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1,
            start: Math.floor(startAt || 0)
          },
          events: {
            onReady: e => {
              const dur = e.target.getDuration() || 0;
              updateBar(startAt, dur);
              if (startAt > 10) toast('Retomando de ' + timecode(startAt) + '.');
            },
            onStateChange: e => {
              if (!state.yt) return;
              const t = state.yt.getCurrentTime ? state.yt.getCurrentTime() : 0;
              const d = state.yt.getDuration ? state.yt.getDuration() : 0;
              if (e.data === YT.PlayerState.PLAYING) {
                state.isSeeking = false;
                tickYT();
              } else if (e.data === YT.PlayerState.ENDED) {
                S.saveProgress(ep.id, d || t, d || t, true);
                updateBar(d || t, d || t);
                onFinished();
              } else {
                S.saveProgress(ep.id, t, d, false);
              }
            },
            onError: () => toast('Erro ao reproduzir no YouTube (código ' + (state.yt && state.yt.getLastError ? state.yt.getLastError() : '?') + ').', '')
          }
        });
      } catch (err) { fallback(); }
    };
  }

  let ytTick = null;
  function tickYT() {
    clearInterval(ytTick);
    ytTick = setInterval(() => {
      if (!state.yt || !state.yt.getCurrentTime) return;
      const t = state.yt.getCurrentTime(), d = state.yt.getDuration() || 0;
      if (state.yt.getPlayerState && state.yt.getPlayerState() !== YT.PlayerState.PLAYING) { clearInterval(ytTick); return; }
      updateBar(t, d);
      S.saveProgress(state.episodeId, t, d, false);
    }, 5000);
  }

  /* Quando não dá para rastrear o vídeo, salvamos ao trocar de aba */
  function wireSaveOnly(ep) {
    const save = () => S.saveProgress(ep.id, 0, 0, false);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  }

  function showStageError(ep, msg) {
    const stage = qs('#stage');
    stage.innerHTML = '';
    stage.append(el('div', { class: 'stage-fallback' }, [
      el('p', { html: UI.esc(msg) }),
      el('p', { style: { fontSize: '.85rem' }, text: 'Link cadastrado: ' + ep.videoUrl }),
      el('a', { class: 'btn btn-outline', href: ep.videoUrl, target: '_blank', rel: 'noopener', text: 'Abrir link em nova aba' })
    ]));
  }

  /* ============================ AÇÕES ============================ */

  function onFinished() {
    const next = state.episodes[state.index + 1];
    toast('Aula concluída!' + (next ? ' Próxima: ' + next.title : ''), 'ok');
    const done = state.episodes.filter(e => (S.progressFor(e.id) || {}).completed).length;
    if (next && done === state.episodes.length) toast('🎉 Você concluiu o curso ' + state.course.title + '!', 'ok');
    renderChrome();
  }

  function go(delta) {
    const next = state.episodes[state.index + delta];
    if (next) location.href = 'player.html?id=' + encodeURIComponent(next.id);
  }

  function bindControls() {
    qs('#btn-prev').onclick = () => go(-1);
    qs('#btn-next').onclick = () => {
      S.markCompleted(state.episodeId, true);
      go(1);
    };
    qs('#btn-done').onclick = () => {
      const p = S.progressFor(state.episodeId);
      const now = !p || !p.completed;
      S.markCompleted(state.episodeId, now);
      toast(now ? 'Aula marcada como concluída.' : 'Marcação removida.', 'ok');
      renderChrome();
    };
    qs('#btn-again').onclick = () => {
      if (state.yt) { state.yt.seekTo(0); return; }
      const v = qs('#video');
      if (v) { S.saveProgress(state.episodeId, 0, v.duration || 0, false); v.currentTime = 0; updateBar(0, v.duration || 0); }
    };

    const sidebar = qs('#ep-sidebar');
    qs('#btn-list').onclick = () => {
      const hidden = sidebar.style.display === 'none';
      sidebar.style.display = hidden ? '' : 'none';
      qs('#btn-list-text').textContent = hidden ? 'Ocultar lista de aulas' : 'Mostrar lista de aulas';
      qs('#btn-list').setAttribute('aria-expanded', String(hidden));
    };

    // atalhos de teclado
    document.addEventListener('keydown', e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight' && !e.ctrlKey) { const v = qs('#video'); if (v) { v.currentTime = Math.min(v.duration || 1e9, v.currentTime + 10); } }
      if (e.key === 'ArrowLeft' && !e.ctrlKey) { const v = qs('#video'); if (v) { v.currentTime = Math.max(0, v.currentTime - 10); } }
      if (e.key === 'f' || e.key === 'F') { const v = qs('#video'); if (v && v.requestFullscreen) v.requestFullscreen(); }
    });

    window.addEventListener('beforeunload', () => {
      const v = qs('#video');
      if (v) S.saveProgress(state.episodeId, v.currentTime, v.duration || 0, false);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
