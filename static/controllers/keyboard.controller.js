import { Store } from '../store/state.js';

export function initKeyboardController() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      Store.undo();
    }

    if (e.ctrlKey && (e.key === 'y' || e.shiftKey && e.key === 'Z')) {
      e.preventDefault();
      Store.redo();
    }
  });
}
