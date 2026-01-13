import { Store } from '../store/store.js';
import { renderTimeline } from '../ui/timeline.js';

export function initTimelineController() {
  const container = document.getElementById('timeline-panel');
  if (!container) return;

  const render = () => {
    renderTimeline(
      container,
      Store.history,
      Store.pointer,
      (idx) => jumpTo(idx)
    );
  };

  function jumpTo(index) {
    Store.pointer = index;
    Store.state = structuredClone(Store.history[index].snapshot);
    Store.emit('state:change', Store.state);
  }

  // atualiza timeline sempre que estado muda
  Store.on('state:change', render);

  // render inicial
  render();
}
