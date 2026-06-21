import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";

// Определяет, запущено ли как установленное PWA
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error — iOS Safari
    window.navigator.standalone === true
  );
}
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);

  useEffect(() => {
    if (isStandalone()) return; // уже установлено — не показываем
    if (localStorage.getItem("install_dismissed") === "1") return;

    // Android / Chrome — нативный prompt
    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS — показываем инструкцию через паузу
    if (isIOS()) {
      const t = setTimeout(() => setShow(true), 2500);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onBIP); };
    }
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const dismiss = () => { setShow(false); localStorage.setItem("install_dismissed", "1"); };

  const installNative = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[300] px-3 pt-3 max-w-md mx-auto animate-in"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
      <div className="glass-card rounded-2xl p-4 relative" style={{ boxShadow: "var(--shadow-lg)" }}>
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground p-1"><X size={16} /></button>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: "var(--grad-brand)", boxShadow: "0 6px 18px rgba(99,102,241,0.4)" }}>💰</div>
          <div>
            <p className="text-sm font-bold">Установить приложение</p>
            <p className="text-[11px] text-muted-foreground">Полный экран, иконка, работает как родное</p>
          </div>
        </div>

        {deferred ? (
          <button onClick={installNative}
            className="w-full mt-1 py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: "var(--grad-brand)" }}>
            Установить
          </button>
        ) : isIOS() ? (
          <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
              <span className="flex items-center gap-1">Нажмите <Share size={13} className="inline text-primary" /> «Поделиться» внизу Safari</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
              <span className="flex items-center gap-1">Выберите <Plus size={13} className="inline text-primary" /> «На экран Домой»</span>
            </div>
          </div>
        ) : isAndroid() ? (
          <p className="text-xs text-muted-foreground mt-1">Меню браузера (⋮) → «Установить приложение»</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">В браузере: меню → «Установить приложение»</p>
        )}
      </div>
    </div>
  );
}
