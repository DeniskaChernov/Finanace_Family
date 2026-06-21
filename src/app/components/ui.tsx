import { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

export function Card({ children, className = '', onClick }: {
  children: ReactNode; className?: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick}
      className={`glass rounded-2xl p-4 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
      style={{ boxShadow: 'var(--shadow)' }}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string; sub?: string; icon?: string; accent?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-1" style={{ boxShadow: 'var(--shadow)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        {icon && (
          <span className="text-lg w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ background: accent ? accent + '22' : 'var(--accent)', color: accent || 'var(--accent-foreground)' }}>
            {icon}
          </span>
        )}
      </div>
      <span className="text-xl font-bold tracking-tight" style={{ color: accent || 'inherit' }}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-t-3xl p-5 pb-10 max-h-[92dvh] overflow-y-auto animate-in"
        style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.3)' }}>
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
        {title && <h2 className="text-lg font-bold mb-5">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className={`w-full px-4 py-3 rounded-xl text-sm font-medium
        bg-[var(--input-background)] border border-border
        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
        transition-all placeholder:text-muted-foreground/40 ${className}`} />
  );
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props}
      className={`w-full px-4 py-3 rounded-xl text-sm font-medium
        bg-[var(--input-background)] border border-border
        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
        transition-all appearance-none ${className}`}>
      {children}
    </select>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Btn({ children, onClick, variant = 'primary', className = '', disabled, type = 'button', fullWidth }: {
  children: ReactNode; onClick?: () => void; variant?: BtnVariant;
  className?: string; disabled?: boolean; type?: 'button' | 'submit'; fullWidth?: boolean;
}) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none';
  const variants: Record<BtnVariant, string> = {
    primary: 'bg-primary text-primary-foreground shadow-md shadow-primary/25',
    secondary: 'bg-secondary text-secondary-foreground border border-border',
    ghost: 'bg-transparent text-foreground hover:bg-muted',
    danger: 'bg-destructive/10 text-destructive border border-destructive/20',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {children}
    </button>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <h3 className="text-base font-bold tracking-tight">{title}</h3>
      {action && <div className="text-sm text-primary font-semibold">{action}</div>}
    </div>
  );
}

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: color ? color + '22' : 'var(--accent)', color: color || 'var(--accent-foreground)' }}>
      {children}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      {label && <span className="text-sm font-medium flex-1">{label}</span>}
      <div onClick={() => onChange(!checked)}
        className="relative w-12 h-6 rounded-full transition-colors duration-200"
        style={{ background: checked ? 'var(--primary)' : 'var(--switch-background)' }}>
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
          style={{ transform: checked ? 'translateX(24px)' : 'translateX(0)' }} />
      </div>
    </label>
  );
}
