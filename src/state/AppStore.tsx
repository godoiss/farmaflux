import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { AppData, Preferences, ScenarioId } from '../domain/types';
import { DemoRepository, type LoadNotice } from '../data/repository/demoRepository';
import { reducer } from './reducer';
import type { Action } from './actions';
import { revokeAllPreviews } from './previewRegistry';

export interface PersistenceStatus {
  /** false quando a última gravação falhou ou o armazenamento não existe. */
  ok: boolean;
  loadNotice: LoadNotice;
}

interface StoreValue {
  data: AppData;
  dispatch: (action: Action) => void;
  prefs: Preferences;
  setPrefs: (prefs: Preferences) => void;
  persistence: PersistenceStatus;
  dismissLoadNotice: () => void;
  resetScenario: (scenario: ScenarioId) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children, repository }: { children: ReactNode; repository?: DemoRepository }) {
  const repoRef = useRef<DemoRepository>(repository ?? new DemoRepository());
  const repo = repoRef.current;
  const [initial] = useState(() => repo.load());
  const [data, dispatch] = useReducer(reducer, initial.data, (d) => reducer(d, { type: 'clock/set', value: d.clock }));
  const [prefs, setPrefsState] = useState<Preferences>(() => repo.loadPreferences());
  const [saveOk, setSaveOk] = useState(repo.isAvailable);
  const [loadNotice, setLoadNotice] = useState<LoadNotice>(initial.notice);

  useEffect(() => {
    setSaveOk(repo.save(data));
  }, [data, repo]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${prefs.textScale * 100}%`;
  }, [prefs.textScale]);

  const setPrefs = useCallback(
    (next: Preferences) => {
      setPrefsState(next);
      if (!repo.savePreferences(next)) setSaveOk(false);
    },
    [repo],
  );

  const resetScenario = useCallback(
    (scenario: ScenarioId) => {
      revokeAllPreviews();
      dispatch({ type: 'demo/replace', data: repo.reset(scenario) });
    },
    [repo],
  );

  const value = useMemo<StoreValue>(
    () => ({
      data,
      dispatch,
      prefs,
      setPrefs,
      persistence: { ok: saveOk, loadNotice },
      dismissLoadNotice: () => setLoadNotice('restored'),
      resetScenario,
    }),
    [data, prefs, setPrefs, saveOk, loadNotice, resetScenario],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore precisa estar dentro de AppStoreProvider');
  return ctx;
}
