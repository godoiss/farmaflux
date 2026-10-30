import type { AppData, Preferences, ScenarioId } from '../../domain/types';
import { createScenario } from '../fixtures/scenarios';
import { parseAppData, parsePreferences } from './schema';

/**
 * Repositório local da demonstração. Tudo vive sob o namespace
 * "farmaflux:demo:v1". Nunca usamos localStorage.clear().
 */
export const NAMESPACE = 'farmaflux:demo:v1';
const DATA_KEY = `${NAMESPACE}:data`;
const PREFS_KEY = `${NAMESPACE}:prefs`;

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export type LoadNotice = 'restored' | 'fresh' | 'invalid_schema' | 'storage_unavailable';

export interface LoadResult {
  data: AppData;
  notice: LoadNotice;
}

export const DEFAULT_PREFERENCES: Preferences = { textScale: 1 };

function resolveStore(): KeyValueStore | null {
  try {
    const store = window.localStorage;
    const probe = `${NAMESPACE}:probe`;
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

export class DemoRepository {
  private readonly store: KeyValueStore | null;

  constructor(store?: KeyValueStore | null) {
    this.store = store === undefined ? resolveStore() : store;
  }

  get isAvailable(): boolean {
    return this.store !== null;
  }

  load(): LoadResult {
    if (!this.store) return { data: createScenario('A'), notice: 'storage_unavailable' };
    let raw: string | null;
    try {
      raw = this.store.getItem(DATA_KEY);
    } catch {
      return { data: createScenario('A'), notice: 'storage_unavailable' };
    }
    if (raw === null) return { data: createScenario('A'), notice: 'fresh' };
    try {
      const parsed = parseAppData(JSON.parse(raw));
      if (parsed) return { data: parsed, notice: 'restored' };
    } catch {
      /* JSON inválido: tratado abaixo */
    }
    return { data: createScenario('A'), notice: 'invalid_schema' };
  }

  /** Retorna false quando não foi possível persistir (cota, modo privado...). */
  save(data: AppData): boolean {
    if (!this.store) return false;
    try {
      this.store.setItem(DATA_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  loadPreferences(): Preferences {
    try {
      const raw = this.store?.getItem(PREFS_KEY);
      return (raw && parsePreferences(JSON.parse(raw))) || DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  savePreferences(prefs: Preferences): boolean {
    try {
      this.store?.setItem(PREFS_KEY, JSON.stringify(prefs));
      return this.store !== null;
    } catch {
      return false;
    }
  }

  /** Remove apenas as chaves de dados do namespace e devolve o cenário semeado. */
  reset(scenario: ScenarioId): AppData {
    if (this.store) {
      try {
        const keys: string[] = [];
        for (let i = 0; i < this.store.length; i++) {
          const k = this.store.key(i);
          if (k && k.startsWith(NAMESPACE) && k !== PREFS_KEY) keys.push(k);
        }
        keys.forEach((k) => this.store?.removeItem(k));
      } catch {
        /* segue com o cenário em memória */
      }
    }
    return createScenario(scenario);
  }
}
