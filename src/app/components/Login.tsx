import { useState } from "react";
import { PiggyBank, AlertCircle } from "lucide-react";
import { Card, Btn } from "./ui";
import { api } from "../../lib/api";
import type { AppUser } from "../../lib/api";

const LOCAL_USERS = [
  { id: "usr-001", name: "Денис", avatar: "Д", color: "bg-blue-500" },
  { id: "usr-002", name: "Софья", avatar: "С", color: "bg-pink-500" },
];

export { LOCAL_USERS };

export function LoginScreen({ onLogin }: { onLogin: (u: AppUser, token: string) => void }) {
  const [selected, setSelected] = useState<typeof LOCAL_USERS[0] | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const { token, user } = await api.auth.login(selected.name, password);
      localStorage.setItem("fb_token", token);
      localStorage.setItem("fb_session", JSON.stringify(user));
      onLogin(user, token);
    } catch (e: any) {
      setError(e.message || "Неверный пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <PiggyBank className="text-white" size={30} />
          </div>
          <h1 className="text-2xl font-bold">Семейный бюджет</h1>
          <p className="text-sm text-muted-foreground mt-1">Выберите профиль</p>
        </div>

        {!selected ? (
          <div className="grid grid-cols-2 gap-4">
            {LOCAL_USERS.map(u => (
              <button key={u.id} onClick={() => { setSelected(u); setPassword(""); setError(""); }}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-3 active:scale-95 transition-transform shadow-sm hover:shadow-md hover:border-primary/40">
                <div className={`w-16 h-16 rounded-2xl ${u.color} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                  {u.avatar}
                </div>
                <p className="text-base font-bold">{u.name}</p>
              </button>
            ))}
          </div>
        ) : (
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${selected.color} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
                {selected.avatar}
              </div>
              <div className="flex-1">
                <p className="font-bold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">Введите пароль</p>
              </div>
              <button onClick={() => { setSelected(null); setPassword(""); setError(""); }}
                className="text-xs text-muted-foreground">Сменить</button>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1.5">Пароль</label>
              <input
                type="password" value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-3.5 rounded-xl bg-input-background border border-border text-foreground text-lg font-mono outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••" autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <AlertCircle size={14} />{error}
              </div>
            )}

            <Btn onClick={handleLogin} disabled={!password || loading}>
              {loading ? "Вход..." : `Войти как ${selected.name}`}
            </Btn>
          </Card>
        )}
      </div>
    </div>
  );
}
