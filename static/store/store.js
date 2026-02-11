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

  initialState() {
    return {
      cards: [],
      stats: null,
      filtros: {
        texto: '',
        criticidade: '',
        status: 'all',
        urgente: null
      },
      modal: {
        aberto: false,
        payload: null
      }
    };
  }

  // =====================
  // CORE METHODS
  // =====================
  getState() {
    return structuredClone(this.state);
  }

  dispatch(action) {
    if (this.isReplaying) return;

    const next = reducer(this.state, action);
    if (next === this.state) return;

    this.state = structuredClone(next);
    this._commit(action, this.state);

    this.emit('state:change', this.state);
    this.emit(`action:${action.type}`, action);
  }

  // =====================
  // HELPERS (Ajustados para evitar o TypeError)
  // =====================

  /**
   * Define filtros aceitando (objeto) ou (chave, valor)
   * Resolve o erro: .setFiltro is not a function
   */
  setFiltro(keyOrObject, value = null) {
    let payload = {};

    if (typeof keyOrObject === 'string') {
      // Caso: Store.setFiltro('texto', 'ilka')
      payload[keyOrObject] = value;
    } else {
      // Caso: Store.setFiltro({ texto: 'ilka' })
      payload = keyOrObject;
    }

    this.dispatch({ type: 'SET_FILTRO', payload });
  }

  /**
   * Atalho para o plural, mantendo compatibilidade
   */
  setFiltros(payload) {
    this.setFiltro(payload);
  }

  openModal(payload) {
    this.dispatch({ type: 'OPEN_MODAL', payload });
    this.emit('modal:open', payload);
  }

  closeModal() {
    this.dispatch({ type: 'CLOSE_MODAL' });
    this.emit('modal:close');
  }

  getFiltros() {
    return this.state.filtros;
  }

  // =====================
  // EVENT SYSTEM & TIME TRAVEL
  // =====================
  on(event, cb) {
    (this.listeners[event] ||= []).push(cb);
  }

  emit(event, payload) {
    (this.listeners[event] || []).forEach(cb => cb(payload));
  }

  _commit(action, snapshot) {
    this.history = this.history.slice(0, this.pointer + 1);
    this.history.push({
      action,
      snapshot: structuredClone(snapshot),
      ts: Date.now()
    });
    this.pointer++;
  }

  undo() {
    if (this.pointer <= 0) return;
    this.pointer--;
    this.state = structuredClone(this.history[this.pointer].snapshot);
    this.emit('state:change', this.state);
  }

  redo() {
    if (this.pointer >= this.history.length - 1) return;
    this.pointer++;
    this.state = structuredClone(this.history[this.pointer].snapshot);
    this.emit('state:change', this.state);
  }
}

// Exportamos a instância única que será usada pelo state.js
export const Store = new StoreCore();
