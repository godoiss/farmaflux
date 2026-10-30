import { useEffect, useRef, useState } from 'react';

/**
 * Abertura da primeira visita: dois farmacêuticos conversam e liberam a receita.
 * O "motion" é feito em JavaScript — um loop requestAnimationFrame cuida do
 * movimento contínuo (balanço das figuras, flutuação da receita e dos balões) e
 * uma sequência temporizada controla as falas. Honra prefers-reduced-motion.
 */

const LINES: { side: 'left' | 'right'; text: string }[] = [
  { side: 'left', text: 'Receita da Dona Maria chegou.' },
  { side: 'right', text: 'Validade e itens conferidos?' },
  { side: 'left', text: 'Tudo certo — Losartana e Metformina em estoque.' },
  { side: 'right', text: 'Pode liberar a retirada.' },
];

const STEP_MS = 1500;

export function IntroAnimation({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(-1); // -1 entrada · 0..3 falas · 4 desfecho
  const [leaving, setLeaving] = useState(false);
  const leftRef = useRef<SVGGElement>(null);
  const rightRef = useRef<SVGGElement>(null);
  const docRef = useRef<SVGGElement>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    window.setTimeout(onDone, 600);
  };

  // Sequência das falas (JS).
  useEffect(() => {
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setStep(0), 400));
    for (let i = 1; i <= 4; i++) {
      timers.push(window.setTimeout(() => setStep(i), 400 + i * STEP_MS));
    }
    timers.push(window.setTimeout(finish, 400 + 4 * STEP_MS + 1500));
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Movimento contínuo (JS): balanço e flutuação via requestAnimationFrame.
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (leftRef.current) leftRef.current.style.transform = `translateY(${Math.sin(t * 1.6) * 5}px)`;
      if (rightRef.current) rightRef.current.style.transform = `translateY(${Math.sin(t * 1.6 + 1.1) * 5}px)`;
      if (docRef.current) docRef.current.style.transform = `translateY(${Math.sin(t * 1.2) * 8 - 2}px) rotate(${Math.sin(t * 0.9) * 2}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Esc pula.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const released = step >= 4;

  return (
    <div
      role="dialog"
      aria-label="Abertura: dois farmacêuticos liberam a receita"
      className={`intro ${leaving ? 'intro-leaving' : ''}`}
    >
      <svg className="intro-stage" viewBox="0 0 960 560" aria-hidden>
        <defs>
          <radialGradient id="introGlow" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#2259bb" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#08142b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="960" height="560" fill="url(#introGlow)" />

        {/* Balcão */}
        <rect x="150" y="430" width="660" height="18" rx="9" fill="#11356b" />
        <rect x="150" y="448" width="660" height="60" fill="#0c2550" />

        {/* Receita flutuando ao centro */}
        <g ref={docRef} style={{ transformOrigin: '480px 210px', transition: 'opacity .4s' }}>
          <g transform="translate(410 120)">
            <rect x="0" y="0" width="140" height="180" rx="12" fill="#f5f7f2" />
            <rect x="18" y="22" width="104" height="9" rx="4.5" fill="#cdd8cf" />
            <rect x="18" y="44" width="80" height="7" rx="3.5" fill="#dde6de" />
            <rect x="18" y="66" width="104" height="7" rx="3.5" fill="#dde6de" />
            <rect x="18" y="82" width="92" height="7" rx="3.5" fill="#dde6de" />
            <rect x="18" y="110" width="104" height="7" rx="3.5" fill="#dde6de" />
            <rect x="18" y="126" width="70" height="7" rx="3.5" fill="#dde6de" />
            {/* Carimbo de liberado */}
            <g style={{ opacity: released ? 1 : 0, transition: 'opacity .45s ease' }}>
              <circle cx="110" cy="150" r="24" fill="#2259bb" />
              <path d="M99 150l8 8 16-17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        </g>

        {/* Farmacêutico esquerdo */}
        <Pharmacist innerRef={leftRef} x={250} coat="#eef3ec" hair="#2b3a33" skin="#e7c9a9" />
        {/* Farmacêutico direito */}
        <Pharmacist innerRef={rightRef} x={650} coat="#e9f0ff" hair="#3a2b22" skin="#d9b08c" flip />

        {/* Balões de fala */}
        {LINES.map((l, i) => (
          <Bubble key={i} side={l.side} text={l.text} active={step === i} />
        ))}
      </svg>

      {/* Marca + desfecho */}
      <div className="intro-brand">
        <span className="intro-logo">Farma<span>Flux</span></span>
        <p className={`intro-tagline ${released ? 'is-on' : ''}`}>Retirada liberada · cuidado coordenado</p>
      </div>

      <button type="button" className="intro-skip" onClick={finish}>Pular</button>
    </div>
  );
}

function Pharmacist({ innerRef, x, coat, hair, skin, flip }: { innerRef: React.Ref<SVGGElement>; x: number; coat: string; hair: string; skin: string; flip?: boolean }) {
  return (
    <g ref={innerRef} style={{ transformBox: 'fill-box', willChange: 'transform' }}>
      <g transform={`translate(${x} 250) ${flip ? 'scale(-1 1)' : ''}`} style={{ transformOrigin: 'center' }}>
        {/* Jaleco */}
        <path d="M-70 190 C-70 110 -46 70 0 70 C46 70 70 110 70 190 Z" fill={coat} />
        <path d="M0 70 L-16 150 L0 165 L16 150 Z" fill="#d8e4f5" />
        {/* Crachá / cruz */}
        <rect x="26" y="112" width="22" height="22" rx="5" fill="#2259bb" />
        <path d="M37 117v12M31 123h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        {/* Pescoço + cabeça */}
        <rect x="-10" y="46" width="20" height="30" rx="8" fill={skin} />
        <circle cx="0" cy="22" r="34" fill={skin} />
        {/* Cabelo */}
        <path d="M-34 18 C-34 -10 34 -10 34 18 C24 2 -24 2 -34 18 Z" fill={hair} />
        {/* Rosto simples */}
        <circle cx="-11" cy="22" r="3" fill="#3b4a42" />
        <circle cx="13" cy="22" r="3" fill="#3b4a42" />
        <path d="M-9 34 q10 7 20 0" fill="none" stroke="#b07a52" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Bubble({ side, text, active }: { side: 'left' | 'right'; text: string; active: boolean }) {
  const left = side === 'left';
  const x = left ? 120 : 520;
  const y = 40;
  const w = 320;
  const h = 86;
  return (
    <g
      style={{
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
        transformOrigin: `${left ? x + 40 : x + w - 40}px ${y + h}px`,
        transition: 'opacity .35s ease, transform .35s cubic-bezier(.22,1,.36,1)',
      }}
    >
      <rect x={x} y={y} width={w} height={h} rx="18" fill="#11325f" stroke="#2259bb" strokeWidth="1.5" />
      <path
        d={left ? `M${x + 44} ${y + h} l0 26 l26 -26 Z` : `M${x + w - 44} ${y + h} l0 26 l-26 -26 Z`}
        fill="#11325f"
        stroke="#2259bb"
        strokeWidth="1.5"
      />
      <foreignObject x={x + 18} y={y + 12} width={w - 36} height={h - 20}>
        <div style={{ color: '#e9f2ed', fontFamily: "'DM Sans Variable', sans-serif", fontSize: '17px', lineHeight: 1.25, fontWeight: 500 }}>
          {text}
        </div>
      </foreignObject>
    </g>
  );
}
