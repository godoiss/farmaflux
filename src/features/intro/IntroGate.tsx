import { useState } from 'react';
import { IntroAnimation } from './IntroAnimation';

const KEY = 'farmaflux:introSeen:v1';

/** Mostra a abertura animada só na primeira visita (e nunca com reduced-motion). */
export function IntroGate() {
  const [show, setShow] = useState(() => {
    try {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
      return !localStorage.getItem(KEY);
    } catch {
      return false;
    }
  });

  if (!show) return null;

  const done = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignora falha de escrita */
    }
    setShow(false);
  };

  return <IntroAnimation onDone={done} />;
}
