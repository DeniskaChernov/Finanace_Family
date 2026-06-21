import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Btn, Field, Input } from './ui';
import { api } from '../../lib/api';
import type { AppUser } from '../../lib/api';

const USERS = [
  { name: 'Денис', password: '123Денис', emoji: '👨', gradient: 'from-indigo-500 to-violet-600' },
  { name: 'Софья', password: '123Софья', emoji: '👩', gradient: 'from-pink-500 to-rose-500' },
];

export function LoginScreen({ onLogin }: { onLogin: (u: AppUser, token: string) => void }) {
  const [selected, setSelected] = useState<typeof USERS[0] | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.login(selected.name, password || selected.password);
      localStorage.setItem('fb_token', res.token);
      localStorage.setItem('fb_session', JSON.stringify(res.user));
      onLogin(res.user, res.token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Неверный пароль');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--background)' }}>

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-20 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--primary)' }} />
        <div className="absolute -bottom-20 -right-10 w-64 h-64 rounded-full opacity-15 blur-3xl"
          style={{ background: '#ec4899' }} />
      </div>

      <div className="relative w-full max-w-sm flex flex-col gap-8">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center text-4xl shadow-xl"
            style={{ background: 'var(--primary)' }}>
            💰
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Семейный бюджет</h1>
          <p className="text-sm text-muted-foreground mt-1">Выберите профиль для входа</p>
        </div>

        {/* User cards */}
        <div className="grid grid-cols-2 gap-3">
          {USERS.map(u => (
            <button key={u.name} onClick={() => { setSelected(u); setPassword(''); setError(''); }}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-95
                ${selected?.name === u.name
                  ? 'border-primary shadow-lg shadow-primary/20'
                  : 'border-border bg-[var(--input-background)] opacity-70'}`}>
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${u.gradient} flex items-center justify-center text-3xl shadow-lg`}>
                {u.emoji}
              </div>
              <span className="font-bold text-sm">{u.name}</span>
            </button>
          ))}
        </div>

        {/* Password form */}
        {selected && (
          <div className="glass rounded-2xl p-5 flex flex-col gap-4 animate-in"
            style={{ boxShadow: 'var(--shadow)' }}>
            <p className="text-sm text-muted-foreground text-center">
              Вход как <strong>{selected.name}</strong>
            </p>
            <Field label="Пароль">
              <Input
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus
              />
            </Field>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-xl">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <Btn onClick={handleLogin} disabled={loading} fullWidth>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Войти'}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
