import { useState } from 'react';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Btn, Field } from './ui';
import { api } from '../../lib/api';
import type { AppUser } from '../../lib/api';

const USERS = [
  { name: 'Денис', password: '123Денис', emoji: '👨', gradient: 'from-indigo-500 to-violet-600' },
  { name: 'Софья', password: '123Софья', emoji: '👩', gradient: 'from-pink-500 to-rose-500' },
];

type Mode = 'profile' | 'id' | 'register';

export function LoginScreen({ onLogin }: { onLogin: (u: AppUser, token: string) => void }) {
  const [mode, setMode] = useState<Mode>('profile');
  const [selected, setSelected] = useState<typeof USERS[0] | null>(null);
  const [password, setPassword] = useState('');
  const [publicId, setPublicId] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function finish(res: { token: string; user: AppUser }) {
    localStorage.setItem('fb_token', res.token);
    localStorage.setItem('fb_session', JSON.stringify(res.user));
    onLogin(res.user, res.token);
  }
  async function run(fn: () => Promise<{ token: string; user: AppUser }>, fallback: string) {
    setLoading(true); setError('');
    try { finish(await fn()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : fallback); }
    finally { setLoading(false); }
  }

  const handleProfile = () => { if (selected) run(() => api.auth.login(selected.name, password || selected.password), 'Неверный пароль'); };
  const handleIdLogin = () => run(() => api.auth.loginById(publicId.trim(), pin), 'Не удалось войти');
  const handleRegister = () => run(() => api.auth.register(name.trim(), pin), 'Не удалось создать аккаунт');

  const Tab = ({ m, label }: { m: Mode; label: string }) => (
    <button onClick={() => { setMode(m); setError(''); }}
      className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
      style={mode === m ? { background: 'var(--surface-2)', color: 'var(--foreground)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' } : { color: 'var(--muted-foreground)' }}>
      {label}
    </button>
  );
  const inputCls = `w-full px-4 py-3 rounded-xl text-sm font-medium bg-[var(--input-background)] border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/40`;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-20 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--primary)' }} />
        <div className="absolute -bottom-20 -right-10 w-64 h-64 rounded-full opacity-15 blur-3xl" style={{ background: '#ec4899' }} />
      </div>

      <div className="relative w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-[1.4rem] mx-auto mb-4 flex items-center justify-center text-4xl"
            style={{ background: 'var(--grad-brand)', boxShadow: '0 16px 40px rgba(99,102,241,0.45)' }}>💰</div>
          <h1 className="text-2xl font-extrabold tracking-tight">Семейный бюджет</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Вход или регистрация</p>
        </div>

        <div className="flex rounded-xl p-1 bg-muted">
          <Tab m="profile" label="Профили" />
          <Tab m="id" label="По ID" />
          <Tab m="register" label="Регистрация" />
        </div>

        {mode === 'profile' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {USERS.map(u => (
                <button key={u.name} onClick={() => { setSelected(u); setPassword(''); setError(''); }}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-95 ${selected?.name === u.name ? 'border-primary shadow-lg shadow-primary/20' : 'border-border bg-[var(--input-background)] opacity-70'}`}>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${u.gradient} flex items-center justify-center text-3xl shadow-lg`}>{u.emoji}</div>
                  <span className="font-bold text-sm">{u.name}</span>
                </button>
              ))}
            </div>
            {selected && (
              <div className="glass rounded-2xl p-5 flex flex-col gap-4 animate-in" style={{ boxShadow: 'var(--shadow)' }}>
                <p className="text-sm text-muted-foreground text-center">Вход как <strong>{selected.name}</strong></p>
                <Field label="Пароль">
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} placeholder="Введите пароль" value={password}
                      onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleProfile()} autoFocus
                      className={inputCls + ' pr-12'} />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </Field>
                {error && <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-xl"><AlertCircle size={14} />{error}</div>}
                <Btn onClick={handleProfile} disabled={loading} fullWidth>{loading ? <Loader2 size={16} className="animate-spin" /> : 'Войти'}</Btn>
              </div>
            )}
          </>
        )}

        {mode === 'id' && (
          <div className="glass rounded-2xl p-5 flex flex-col gap-4 animate-in" style={{ boxShadow: 'var(--shadow)' }}>
            <Field label="Finance ID">
              <input placeholder="FIN-XXXXXX" value={publicId} onChange={e => setPublicId(e.target.value.toUpperCase())} autoFocus className={inputCls + ' font-mono tracking-wider'} />
            </Field>
            <Field label="PIN">
              <input type={showPass ? 'text' : 'password'} inputMode="numeric" placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleIdLogin()} className={inputCls} />
            </Field>
            {error && <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-xl"><AlertCircle size={14} />{error}</div>}
            <Btn onClick={handleIdLogin} disabled={loading || !publicId || !pin} fullWidth>{loading ? <Loader2 size={16} className="animate-spin" /> : 'Войти по ID'}</Btn>
          </div>
        )}

        {mode === 'register' && (
          <div className="glass rounded-2xl p-5 flex flex-col gap-4 animate-in" style={{ boxShadow: 'var(--shadow)' }}>
            <p className="text-xs text-muted-foreground text-center">Создайте аккаунт — получите свой Finance ID для входа и связи с другими приложениями.</p>
            <Field label="Имя"><input placeholder="Ваше имя" value={name} onChange={e => setName(e.target.value)} autoFocus className={inputCls} /></Field>
            <Field label="PIN (мин. 4 символа)">
              <input type={showPass ? 'text' : 'password'} inputMode="numeric" placeholder="Придумайте PIN" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} className={inputCls} />
            </Field>
            <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} />Показать PIN</label>
            {error && <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-xl"><AlertCircle size={14} />{error}</div>}
            <Btn onClick={handleRegister} disabled={loading || !name.trim() || pin.length < 4} fullWidth>{loading ? <Loader2 size={16} className="animate-spin" /> : 'Создать аккаунт'}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
