import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CircleCheck, Eye, EyeOff, Stethoscope, UserRound } from 'lucide-react';
import { Button, LinkButton } from '../../components/ui/Button';
import { TextField, MaskedField } from '../../components/ui/Field';
import { LogoMark } from '../../components/brand/Logo';

type Role = 'paciente' | 'farmaceutico';
type Errors = Partial<Record<'role' | 'nome' | 'email' | 'telefone' | 'nascimento' | 'crf' | 'senha' | 'confirmar', string>>;

const STORAGE_KEY = 'farmaflux:cadastro:v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function CadastroPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [crf, setCrf] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!role) next.role = 'Escolha se o cadastro é de paciente ou farmacêutico.';
    if (!nome.trim()) next.nome = 'Informe o nome completo.';
    if (!email.trim()) next.email = 'Informe o e-mail.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Digite um e-mail válido, como nome@exemplo.com.';
    if (telefone.replace(/\D/g, '').length < 10) next.telefone = 'Informe um telefone com DDD.';
    if (role === 'paciente' && nascimento.replace(/\D/g, '').length !== 8) next.nascimento = 'Informe a data de nascimento (dd/mm/aaaa).';
    if (role === 'farmaceutico' && !crf.trim()) next.crf = 'Informe o seu registro no CRF.';
    if (senha.length < 6) next.senha = 'A senha precisa ter pelo menos 6 caracteres.';
    if (confirmar !== senha) next.confirmar = 'As senhas não são iguais.';

    setErrors(next);
    if (Object.keys(next).length > 0) {
      const firstError = document.querySelector('[aria-invalid="true"]') as HTMLElement | null;
      firstError?.focus();
      return;
    }

    // Demonstração: guarda só o perfil básico localmente (sem senha).
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, nome: nome.trim(), email: email.trim() }));
    } catch {
      /* armazenamento indisponível: segue só com a confirmação na tela */
    }
    setDone(true);
  };

  if (done) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-live="polite">
          <span className="auth-success-ico" aria-hidden><CircleCheck size={34} /></span>
          <h1 className="auth-title">Cadastro criado!</h1>
          <p className="auth-lead">
            Pronto, {nome.trim().split(' ')[0]}. Seu cadastro de {role === 'farmaceutico' ? 'farmacêutico(a)' : 'paciente'} foi criado nesta demonstração.
          </p>
          <div className="auth-actions">
            <LinkButton to={role === 'farmaceutico' ? '/farmaceuticos' : '/inicio'} variant="primary" block className="auth-cta">
              Entrar no FarmaFlux
            </LinkButton>
          </div>
          <p className="auth-demo-note">Demonstração · nenhum dado é enviado para fora deste navegador.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-back"><ArrowLeft size={18} aria-hidden /> Voltar</Link>

        <span className="auth-brand" aria-hidden><LogoMark size={40} /></span>
        <h1 className="auth-title">Criar sua conta</h1>
        <p className="auth-lead">Preencha os dados abaixo para começar a usar o FarmaFlux.</p>

        <form onSubmit={submit} noValidate className="auth-form">
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
          <TextField label="Telefone com DDD" type="tel" inputMode="tel" autoComplete="tel" value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} error={errors.telefone} placeholder="(61) 90000-0000" maxLength={16} />

          {role === 'farmaceutico' ? (
            <TextField label="Registro no CRF" value={crf} onChange={(e) => setCrf(e.target.value)} error={errors.crf} placeholder="Ex.: CRF/DF 12345" hint="Número do seu Conselho Regional de Farmácia." />
          ) : (
            <MaskedField label="Data de nascimento" mask="date" value={nascimento} onValueChange={setNascimento} error={errors.nascimento} />
          )}

          <div>
            <TextField
              label="Senha"
              type={showSenha ? 'text' : 'password'}
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              error={errors.senha}
              hint="Pelo menos 6 caracteres."
              placeholder="Crie uma senha"
            />
            <button type="button" className="auth-show" onClick={() => setShowSenha((v) => !v)}>
              {showSenha ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              {showSenha ? 'Ocultar senha' : 'Mostrar senha'}
            </button>
          </div>
          <TextField label="Confirmar senha" type={showSenha ? 'text' : 'password'} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} error={errors.confirmar} placeholder="Repita a senha" />

          <Button type="submit" variant="primary" block className="auth-cta">Criar cadastro</Button>
        </form>

        <p className="auth-switch">Já tem conta? <button type="button" className="auth-link" onClick={() => navigate('/inicio')}>Entrar</button></p>
        <p className="auth-demo-note">Demonstração · nenhum dado é enviado para fora deste navegador.</p>
      </section>
    </main>
  );
}
