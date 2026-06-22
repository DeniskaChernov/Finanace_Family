import { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export function Card({ children, className = '', onClick }: {
  children: ReactNode; className?: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick}
      className={`glass-card rounded-2xl p-4 ${onClick ? 'cursor-pointer press-3d' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, accent, color, onClick }: {
  label: string; value: string; sub?: string; icon?: string; accent?: string; color?: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick}
      className={`glass-card rounded-2xl p-4 flex flex-col gap-1 ${onClick ? 'cursor-pointer press-3d' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
        {icon && (
          <span className="text-base w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ background: accent ? accent + '22' : 'var(--accent)', color: accent || 'var(--accent-foreground)' }}>
            {icon}
          </span>
        )}
      </div>
      <span className="text-lg font-bold tracking-tight font-mono" style={{ color: color || accent || 'inherit' }}>{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Удалить', onConfirm, onCancel, danger = true }: {
  title: string; message?: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel}/>
      <div className="relative w-full max-w-md rounded-t-3xl p-6 sheet-safe animate-in"
        style={{background:'var(--card)',boxShadow:'0 -8px 40px rgba(0,0,0,0.3)'}}>
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4"/>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{background:danger?'rgba(251,113,133,0.14)':'var(--accent)'}}>
            <AlertTriangle size={18} style={{color:danger?'#FB7185':'var(--primary)'}}/>
          </div>
          <h3 className="text-base font-bold">{title}</h3>
        </div>
        {message && <p className="text-sm text-muted-foreground mb-5 ml-[52px]">{message}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
            style={{background:'var(--muted)',color:'var(--foreground)'}}>Отмена</button>
          <button onClick={onConfirm} className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white"
            style={{background:danger?'#ef4444':'var(--primary)'}}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, type = 'info', onDone }: {
  message: string; type?: 'success' | 'error' | 'warning' | 'info'; onDone: () => void;
}) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  const colors = { success:'#10b981', error:'#ef4444', warning:'#f59e0b', info:'var(--primary)' };
  const icons = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
  return (
    <div className="fixed top-4 left-4 right-4 max-w-md mx-auto z-[200] animate-in"
      style={{filter:'drop-shadow(0 8px 24px rgba(0,0,0,0.2))'}}>
      <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3 text-white"
        style={{background:colors[type]}}>
        <span className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {icons[type]}
        </span>
        <p className="text-sm font-semibold flex-1">{message}</p>
        <button onClick={onDone} className="opacity-70 hover:opacity-100"><X size={16}/></button>
      </div>
    </div>
  );
}

export function Sheet({ open = true, onClose, title, children }: {
  open?: boolean; onClose: () => void; title?: string; children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-t-3xl p-5 sheet-safe max-h-[92dvh] overflow-y-auto animate-in"
        style={{ background: 'var(--card-solid)', borderTop: '1px solid var(--border)', boxShadow: '0 -16px 50px rgba(0,0,0,0.6)' }}>
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
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none';
  const variants: Record<BtnVariant, string> = {
    primary: 'text-white',
    secondary: 'bg-secondary text-secondary-foreground border border-border',
    ghost: 'bg-transparent text-foreground hover:bg-muted',
    danger: 'bg-destructive/10 text-destructive border border-destructive/20',
  };
  const primaryStyle = variant === 'primary'
    ? { background: 'var(--grad-brand)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }
    : undefined;
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={primaryStyle}
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
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--surface-2)] rounded-full shadow-sm transition-transform duration-200"
          style={{ transform: checked ? 'translateX(24px)' : 'translateX(0)' }} />
      </div>
    </label>
  );
}
