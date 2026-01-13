import { reducer } from './reducer.js';

class StoreCore {
  constructor() {
    this.listeners = {};
    this.history = [];
    this.pointer = -1;
    this.isReplaying = false;

    this.state = this.initialState();
    this._commit({ type: '@@INIT' }, this.state);
  }

  // =====================
  // INITIAL STATE
  // =====================
  initialState() {
    return {
      cards: [],
      stats: null,
      filtros: {
        texto: '',
        risco: 'all',
        status: 'all'
      },
      modal: {
        aberto: false,
        payload: null
      }
    };
  }

  // =====================
  // EVENT SYSTEM
  // =====================
  on(event, cb) {
    (this.listeners[event] ||= []).push(cb);
  }

  emit(event, payload) {
    (this.listeners[event] || []).forEach(cb => cb(payload));
  }

  // =====================
  // CORE
  // =====================
  getState() {
    return structuredClone(this.state);
  }

  dispatch(action) {
    if (this.isReplaying) return; // 🔒 proteção

    const next = reducer(this.state, action);
    if (next === this.state) return;

    this.state = structuredClone(next);
    this._commit(action, this.state);

    this.emit('state:change', this.state);
    this.emit(`action:${action.type}`, action);
  }

  _commit(action, snapshot) {
    // corta futuro se mexeu no passado
    this.history = this.history.slice(0, this.pointer + 1);

    this.history.push({
      action,
      snapshot: structuredClone(snapshot),
      ts: Date.now()
    });

    this.pointer++;
  }

  // =====================
  // TIME TRAVEL
  // =====================
  undo() {
    if (this.pointer <= 0) return;

    this.pointer--;
    this._applySnapshot(this.pointer);
    this.emit('state:undo', this.state);
  }

  redo() {
    if (this.pointer >= this.history.length - 1) return;

    this.pointer++;
    this._applySnapshot(this.pointer);
    this.emit('state:redo', this.state);
  }

  _applySnapshot(idx) {
    this.state = structuredClone(this.history[idx].snapshot);
    this.emit('state:change', this.state);
  }

  // =====================
  // REPLAY (READ-ONLY)
  // =====================
  replay({ speed = 500 } = {}) {
    if (this.history.length === 0) return;

    let idx = 0;
    this.isReplaying = true;

    this.emit('replay:start', {
      total: this.history.length
    });

    const run = () => {
      if (idx >= this.history.length) {
        this.isReplaying = false;
        this.emit('replay:end');
        return;
      }

      const { snapshot, action, ts } = this.history[idx];

      this.state = structuredClone(snapshot);
      this.pointer = idx;

      this.emit('state:change', this.state);
      this.emit('replay:step', {
        index: idx,
        action,
        ts,
        state: this.state
      });

      idx++;
      setTimeout(run, speed);
    };

    run();
  }

  // =====================
  // HELPERS (convenience methods)
  // =====================
  openModal(payload) {
    this.dispatch({ type: 'OPEN_MODAL', payload });
    // Emite evento para compatibilidade com listeners antigos
    this.emit('modal:open', payload);
  }

  closeModal() {
    this.dispatch({ type: 'CLOSE_MODAL' });
    this.emit('modal:close');
  }
}

export const Store = new StoreCore();
