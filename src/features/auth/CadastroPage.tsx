import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, Eye, EyeOff, Stethoscope, UserRound } from 'lucide-react';
import { Button, LinkButton } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { LogoMark } from '../../components/brand/Logo';
import { supabase, supabaseConfigured } from '../../lib/supabase';

type Role = 'paciente' | 'farmaceutico';
type Errors = Partial<Record<'role' | 'nome' | 'email' | 'senha' | 'confirmar' | 'geral', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CadastroPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<null | 'entrou' | 'confirmar-email'>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!role) next.role = 'Escolha se o cadastro é de paciente ou farmacêutico.';
    if (!nome.trim()) next.nome = 'Informe o nome completo.';
    if (!email.trim()) next.email = 'Informe o e-mail.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Digite um e-mail válido, como nome@exemplo.com.';
    if (senha.length < 8) next.senha = 'A senha precisa ter pelo menos 8 caracteres.';
    if (confirmar !== senha) next.confirmar = 'As senhas não são iguais.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus();
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { full_name: nome.trim(), role } },
    });
    setLoading(false);

    if (error) {
      const code = error.code ?? '';
      const msg = (error.message ?? '').toLowerCase();
      let geral = 'Não foi possível criar a conta. Verifique os dados e tente novamente.';
      if (code === 'over_email_send_rate_limit' || error.status === 429) {
        geral = 'Muitas tentativas agora. Aguarde alguns minutos e tente de novo.';
      } else if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already been registered')) {
        geral = 'Este e-mail já tem uma conta. Toque em "Entrar" para acessar.';
      } else if (msg.includes('invalid') && msg.includes('email')) {
        geral = 'E-mail inválido. Confira o endereço digitado.';
      }
      setErrors({ geral });
      return;
    }
    setDone(data.session ? 'entrou' : 'confirmar-email');
  };

  if (done) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-live="polite">
          <span className="auth-success-ico" aria-hidden><CircleCheck size={34} /></span>
          <h1 className="auth-title">Conta criada!</h1>
          {done === 'entrou' ? (
            <>
              <p className="auth-lead">Pronto, {nome.trim().split(' ')[0]}. Sua conta de {role === 'farmaceutico' ? 'farmacêutico(a)' : 'paciente'} está pronta.</p>
              <div className="auth-actions">
                <LinkButton to="/inicio" variant="primary" block className="auth-cta">Entrar no FarmaFlux</LinkButton>
              </div>
            </>
          ) : (
            <>
              <p className="auth-lead">Enviamos um e-mail de confirmação para <strong>{email.trim()}</strong>. Confirme para poder entrar.</p>
              <div className="auth-actions">
                <LinkButton to="/entrar" variant="primary" block className="auth-cta">Ir para o login</LinkButton>
              </div>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/entrar" className="auth-back">Já tenho conta — Entrar</Link>
        <span className="auth-brand" aria-hidden><LogoMark size={40} /></span>
        <h1 className="auth-title">Criar minha conta</h1>
        <p className="auth-lead">Preencha os dados abaixo para começar a usar o FarmaFlux.</p>

        {!supabaseConfigured && (
          <div className="callout callout-warning" role="alert"><div><p className="font-semibold">Cadastro indisponível</p><p className="text-ink-soft">A conexão com o servidor não está configurada.</p></div></div>
        )}

        <form onSubmit={submit} noValidate className="auth-form">
          {errors.geral && <div className="callout callout-danger" role="alert"><div><p>{errors.geral}</p></div></div>}

          <fieldset className="role-fieldset">
            <legend className="label">Este cadastro é para</legend>
            <div className="role-grid">
              <label className={`role-option ${role === 'paciente' ? 'is-on' : ''}`}>
                <input type="radio" name="role" className="sr-only" checked={role === 'paciente'} onChange={() => setRole('paciente')} />
                <UserRound size={28} aria-hidden />
                <span className="role-title">Paciente</span>
                <span className="role-sub">Quero acompanhar minhas receitas</span>
              </label>
              <label className={`role-option ${role === 'farmaceutico' ? 'is-on' : ''}`}>
                <input type="radio" name="role" className="sr-only" checked={role === 'farmaceutico'} onChange={() => setRole('farmaceutico')} />
                <Stethoscope size={28} aria-hidden />
                <span className="role-title">Farmacêutico</span>
                <span className="role-sub">Atuo na farmácia da unidade</span>
              </label>
            </div>
            {errors.role && <p className="field-error" role="alert"><span>{errors.role}</span></p>}
          </fieldset>

          <TextField label="Nome completo" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} error={errors.nome} placeholder="Ex.: Ana Maria da Silva" />
          <TextField label="E-mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="nome@exemplo.com" />

          <div>
            <TextField label="Senha" type={showSenha ? 'text' : 'password'} autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} error={errors.senha} hint="Pelo menos 8 caracteres." placeholder="Crie uma senha" />
            <button type="button" className="auth-show" onClick={() => setShowSenha((v) => !v)}>
              {showSenha ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              {showSenha ? 'Ocultar senha' : 'Mostrar senha'}
            </button>
          </div>
          <TextField label="Confirmar senha" type={showSenha ? 'text' : 'password'} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} error={errors.confirmar} placeholder="Repita a senha" />

          <Button type="submit" variant="primary" block className="auth-cta" loading={loading} loadingLabel="Criando…">Criar minha conta</Button>
        </form>

        <p className="auth-switch">Já tem conta? <Link to="/entrar" className="auth-link">Entrar</Link></p>
      </section>
    </main>
  );
}
