import { Store } from '../store/store.js';

export function initReplayController() {
  const playBtn = document.getElementById('replay-play');
  const pauseBtn = document.getElementById('replay-pause');
  const speedInput = document.getElementById('replay-speed');

  let speed = 500;

  speedInput?.addEventListener('change', e => {
    speed = Number(e.target.value) || 500;
  });

  playBtn?.addEventListener('click', () => {
    Store.replay({ speed });
  });

  pauseBtn?.addEventListener('click', () => {
    // pausa simples: congela no estado atual
    Store.emit('replay:pause');
  });

  Store.on('replay:start', () => {
    console.log('▶️ Replay iniciado');
  });

  Store.on('replay:end', () => {
    console.log('⏹️ Replay finalizado');
  });
}
