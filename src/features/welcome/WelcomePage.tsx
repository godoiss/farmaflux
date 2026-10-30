import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { ShaderBackground } from '../../components/ui/mesh-drift-shader';
import { Globe } from '../../components/ui/globe';
import { LogoMark } from '../../components/brand/Logo';

/** Tela de abertura (Demo Day): fundo animado da marca + globo, acima do app. */
export function WelcomePage() {
  return (
    <main className="welcome">
      <ShaderBackground className="welcome-shader" />
      <div className="welcome-globe" aria-hidden>
        <Globe />
      </div>
      <div className="welcome-overlay" aria-hidden />

      <div className="welcome-content">
        <span className="welcome-brand">
          <LogoMark size={44} />
          <span className="welcome-wordmark">
            Farma<span>Flux</span>
          </span>
        </span>

        <p className="welcome-eyebrow">
          <FlaskConical size={13} aria-hidden /> Demonstração · dados fictícios
        </p>

        <h1 className="welcome-title">
          Sua retirada de remédio na UBS começa em casa.
        </h1>
        <p className="welcome-subtitle">
          Confira a receita, prepare a retirada na unidade certa e organize os lembretes
          antes de sair de casa — menos fila, menos viagem perdida.
        </p>

        <div className="welcome-actions">
          <Link to="/inicio" className="btn hero-primary welcome-cta">
            Entrar no FarmaFlux <ArrowRight size={18} aria-hidden />
          </Link>
          <Link to="/ajuda" className="welcome-secondary">
            Como funciona?
          </Link>
        </div>

        <p className="welcome-note">
          Inspirado em modelos internacionais como o <strong>MyGP</strong> (Reino Unido),
          feito para as UBS do Distrito Federal.
        </p>
      </div>
    </main>
  );
}
