import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'danger-ghost';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading = false, loadingLabel, icon, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('btn', `btn-${variant}`, block && 'w-full', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : icon}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
});

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
}

export function LinkButton({ variant = 'primary', icon, iconRight, block, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={cx('btn', `btn-${variant}`, block && 'w-full', className)} {...rest}>
      {icon}
      <span>{children}</span>
      {iconRight}
    </Link>
  );
}

export { cx };
