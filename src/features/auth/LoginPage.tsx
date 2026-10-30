import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { LogoMark } from '../../components/brand/Logo';
import { supabase, supabaseConfigured } from '../../lib/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string>();
  const [loading, setLoading] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(undefined);
    if (!email.trim() || !senha) {
      setErro('Preencha o e-mail e a senha.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setLoading(false);
    if (error) {
      // Mensagem genérica: não revela se a conta existe.
      setErro('E-mail ou senha incorretos. Confira e tente novamente.');
      return;
    }
    navigate('/inicio');
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-back">Voltar ao início</Link>
        <span className="auth-brand" aria-hidden><LogoMark size={40} /></span>
        <h1 className="auth-title">Entrar</h1>
        <p className="auth-lead">Acesse sua conta do FarmaFlux com e-mail e senha.</p>

        {!supabaseConfigured && (
          <div className="callout callout-warning" role="alert"><div><p className="font-semibold">Login indisponível</p><p className="text-ink-soft">A conexão com o servidor não está configurada.</p></div></div>
        )}

        <form onSubmit={entrar} noValidate className="auth-form">
          {erro && <div className="callout callout-danger" role="alert"><div><p>{erro}</p></div></div>}

          <TextField label="E-mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@exemplo.com" />
          <div>
            <TextField label="Senha" type={showSenha ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" />
            <button type="button" className="auth-show" onClick={() => setShowSenha((v) => !v)}>
              {showSenha ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              {showSenha ? 'Ocultar senha' : 'Mostrar senha'}
            </button>
          </div>

          <Button type="submit" variant="primary" block className="auth-cta" loading={loading} loadingLabel="Entrando…">Entrar</Button>
        </form>

        <p className="auth-switch">Ainda não tem conta? <Link to="/cadastro" className="auth-link">Criar minha conta</Link></p>
      </section>
    </main>
  );
}
