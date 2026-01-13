import type { StoreCore } from './store/store';

declare global {
  interface Window {
    Store: StoreCore;
  }
}

export {};
