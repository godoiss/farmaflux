import '@fontsource-variable/inter';

/** Marca FarmaFlux: uma gota/folha de cuidado sobre duas linhas de fluxo. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="14" fill="#087F8C" />
      <path d="M24 10c5.5 6 8.5 10.4 8.5 14.3A8.5 8.5 0 0 1 24 32.8a8.5 8.5 0 0 1-8.5-8.5C15.5 20.4 18.5 16 24 10Z" fill="#fff" />
      <path d="M24 17.5v9M19.5 22h9" stroke="#087F8C" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10 36.5c4.6 2.8 9.2 2.8 14 0s9.4-2.8 14 0" fill="none" stroke="#9FE3D6" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={compact ? 32 : 38} />
      <span className="text-[1.1875rem] font-bold tracking-tight text-ink" style={{ fontFamily: "'Inter Variable', sans-serif" }}>
        Farma<span className="text-teal">Flux</span>
      </span>
    </span>
  );
}
