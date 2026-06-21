import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, Shield, Repeat, ArrowUpRight, ArrowDownLeft, X, Zap, AlertCircle } from "lucide-react";
import { Card, StatCard, SectionHeader } from "./ui";
import { TxSheet } from "./Journal";
import type { Transaction, Category, Goal, RecurringPayment, AppSettings, AppUser, Currency } from "../../lib/api";

const MONTHS_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
const PIE_COLORS = ["#6366f1","#10b981","#f59e0b","#ec4899","#14b8a6","#f97316","#84cc16","#8b5cf6"];
const FREQ_LABELS: Record<string,string> = { daily:"Ежедн.", weekly:"Нед.", monthly:"Мес.", yearly:"Год" };
const fmt = (n:number) => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(n);
const fmtUZS = (n:number) => `${fmt(n)} сум`;
const fmtUSD = (n:number) => `$${fmt(n)}`;
const fmtMoney = (n:number, cur:Currency="UZS") => cur==="USD" ? fmtUSD(n) : fmtUZS(n);
const toUZS = (amount:number, cur:Currency, rate:number) => cur==="USD" ? amount*rate : amount;
const monthKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const daysUntil = (date:string) => Math.ceil((new Date(date).getTime()-Date.now())/86400000);
const PRIORITY_DOT: Record<string,string> = { high:"#ef4444", medium:"#f59e0b", low:"#6366f1" };
type TabType = "dashboard"|"journal"|"savings"|"goals"|"more";

function CssBarChart({ data, incKey, expKey }: { data:any[]; incKey:string; expKey:string }) {
  const max = Math.max(...data.flatMap(d=>[d[incKey]??0,d[expKey]??0]),1);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d,i)=>(
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full flex items-end gap-px" style={{height:"88px"}}>
            <div className="flex-1 rounded-t-md transition-all" style={{height:`${((d[incKey]??0)/max)*100}%`,minHeight:d[incKey]>0?"3px":"0",background:"#10b981"}}/>
            <div className="flex-1 rounded-t-md transition-all" style={{height:`${((d[expKey]??0)/max)*100}%`,minHeight:d[expKey]>0?"3px":"0",background:"#f87171"}}/>
          </div>
          <span className="text-[9px] text-muted-foreground">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// FAB — плавающая кнопка добавления с выбором типа
function AddFab({ onAdd }: { onAdd: (type: "income"|"expense") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
        {open && (
          <>
            <button onClick={() => { setOpen(false); onAdd("income"); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold shadow-lg active:scale-95 transition-all"
              style={{ background: "#10b981", boxShadow: "0 4px 20px rgba(16,185,129,0.4)" }}>
              <ArrowDownLeft size={16}/> Доход
            </button>
            <button onClick={() => { setOpen(false); onAdd("expense"); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold shadow-lg active:scale-95 transition-all"
              style={{ background: "#ef4444", boxShadow: "0 4px 20px rgba(239,68,68,0.4)" }}>
              <ArrowUpRight size={16}/> Расход
            </button>
          </>
        )}
        <button onClick={() => setOpen(v => !v)}
          className="w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
          style={{ background: "var(--primary)", boxShadow: "0 8px 30px rgba(99,102,241,0.5)" }}>
          {open ? <X size={22}/> : <Plus size={24}/>}
        </button>
      </div>
    </>
  );
}

export function DashboardScreen({ transactions,goals,usdRate,userProfile,familyMembers,categories,recurringPayments,settings,onSave,onMoreSection,onTabChange }: {
  transactions:Transaction[]; goals:Goal[];
  usdRate:number; userProfile:AppUser; familyMembers:AppUser[]; categories:Category[];
  recurringPayments:RecurringPayment[]; settings:AppSettings;
  onSave:(t:any)=>Promise<void>; onMoreSection:(s:string)=>void; onTabChange:(t:TabType)=>void;
}) {
  const [addType, setAddType] = useState<"income"|"expense"|null>(null);
  const now = new Date(); const mk = monthKey();
  const monthTx = transactions.filter(t=>t.date.startsWith(mk));
  const income = monthTx.filter(t=>t.type==="income").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const expense = monthTx.filter(t=>t.type==="expense").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const balance = income - expense;
  const totalSavings = transactions.filter(t=>t.type==="income").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0)
    - transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const totalAllocated = goals.reduce((s,g)=>s+g.allocated,0);
  const completedGoals = goals.filter(g=>g.allocated>=g.target_amount&&g.target_amount>0).length;

  const barData = Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1); const k=monthKey(d);
    const txs=transactions.filter(t=>t.date.startsWith(k));
    return {month:MONTHS_SHORT[d.getMonth()],db_inc:txs.filter(t=>t.type==="income").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0),db_exp:txs.filter(t=>t.type==="expense").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0)};
  });

  const expMap:Record<string,number>={};
  monthTx.filter(t=>t.type==="expense").forEach(t=>{expMap[t.category]=(expMap[t.category]??0)+toUZS(t.amount,t.currency??"UZS",usdRate);});
  const pieData = Object.entries(expMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,6);
  const recent = [...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const upcoming = [...recurringPayments].filter(p=>p.active).sort((a,b)=>a.next_date.localeCompare(b.next_date)).slice(0,3);

  const months6 = Array.from({length:6},(_,i)=>monthKey(new Date(now.getFullYear(),now.getMonth()-5+i,1)));
  const avgExpense = months6.reduce((s,mk2)=>{
    const exp=transactions.filter(t=>t.date.startsWith(mk2)&&t.type==="expense").reduce((a,t)=>a+toUZS(t.amount,t.currency??"UZS",usdRate),0);
    return s+exp;
  },0)/Math.max(1,months6.filter(mk2=>transactions.some(t=>t.date.startsWith(mk2))).length);
  const efMonths = avgExpense>0?totalSavings/avgExpense:0;

  // Трендовый анализ: сравнение с прошлым месяцем
  const prevMk = monthKey(new Date(now.getFullYear(),now.getMonth()-1,1));
  const prevTx = transactions.filter(t=>t.date.startsWith(prevMk));
  const prevExpense = prevTx.filter(t=>t.type==="expense").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const prevIncome = prevTx.filter(t=>t.type==="income").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const expTrend = prevExpense > 0 ? ((expense - prevExpense) / prevExpense * 100) : 0;
  const incTrend = prevIncome > 0 ? ((income - prevIncome) / prevIncome * 100) : 0;

  // Топ-категория расходов за месяц
  const topCat = Object.entries(expMap).sort((a,b)=>b[1]-a[1])[0];

  // Умные инсайты
  const insights: {icon:string; text:string; color:string}[] = [];
  if(expTrend > 20) insights.push({icon:"📈", text:`Расходы выросли на ${Math.round(expTrend)}% по сравнению с прошлым месяцем`, color:"#ef4444"});
  if(expTrend < -10) insights.push({icon:"🎉", text:`Отлично! Расходы снизились на ${Math.round(Math.abs(expTrend))}%`, color:"#10b981"});
  if(incTrend > 10) insights.push({icon:"💰", text:`Доходы выросли на ${Math.round(incTrend)}%`, color:"#10b981"});
  if(topCat && topCat[1] > income * 0.4) insights.push({icon:"⚠️", text:`«${topCat[0]}» занимает ${Math.round(topCat[1]/Math.max(income,1)*100)}% доходов`, color:"#f59e0b"});
  if(efMonths < 3 && totalSavings > 0) insights.push({icon:"🛡", text:`Резервный фонд: ${efMonths.toFixed(1)} мес. Рекомендуется 3–6`, color:"#f59e0b"});
  if(balance > 0 && income > 0) insights.push({icon:"✨", text:`Сбережения за месяц: ${Math.round(balance/income*100)}% дохода`, color:"#6366f1"});
  const upcomingUrgent = [...recurringPayments].filter(p=>p.active&&Math.ceil((new Date(p.next_date).getTime()-Date.now())/86400000)<=3);
  if(upcomingUrgent.length > 0) insights.push({icon:"⏰", text:`${upcomingUrgent.length} платеж${upcomingUrgent.length>1?"а":""}  в ближайшие 3 дня`, color:"#ef4444"});

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
              {now.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}
            </p>
            <h2 className="text-2xl font-extrabold mt-0.5 tracking-tight">Привет, {userProfile.name} 👋</h2>
          </div>
          <div className="flex -space-x-2">
            {familyMembers.slice(0,2).map(m=>(
              <div key={m.id} className="w-9 h-9 rounded-xl glass border-2 border-background flex items-center justify-center text-xs font-bold text-primary">
                {m.name[0]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hero balance card */}
      <div className="mx-4 rounded-3xl p-5 text-white relative overflow-hidden"
        style={{background:"linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%)",boxShadow:"0 16px 48px rgba(99,102,241,0.35)"}}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{background:"white",transform:"translate(30%,-30%)"}}/>
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10" style={{background:"white",transform:"translate(-30%,30%)"}}/>
        <p className="text-sm opacity-70 mb-1 relative">Баланс за месяц</p>
        <p className="text-4xl font-black font-mono relative tracking-tight" style={{fontFamily:"'JetBrains Mono',monospace"}}>
          {balance>=0?"+":""}{fmtUZS(balance)}
        </p>
        <div className="flex gap-6 mt-5 relative">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <ArrowDownLeft size={14}/>
            </div>
            <div>
              <p className="text-[10px] opacity-60 leading-none mb-0.5">Доходы</p>
              <p className="text-sm font-bold font-mono text-emerald-300">+{fmtUZS(income)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <ArrowUpRight size={14}/>
            </div>
            <div>
              <p className="text-[10px] opacity-60 leading-none mb-0.5">Расходы</p>
              <p className="text-sm font-bold font-mono text-red-300">−{fmtUZS(expense)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats bento */}
      <div className="px-4 grid grid-cols-3 gap-2">
        <StatCard label="Накопления" value={fmtUZS(totalSavings)} icon="💰" onClick={()=>onTabChange("savings")}/>
        <StatCard label="Целей" value={`${completedGoals}/${goals.length}`} icon="🎯" onClick={()=>onTabChange("goals")}/>
        <StatCard label="Резерв" value={`${efMonths.toFixed(1)} мес`} icon="🛡" accent={efMonths>=6?"#10b981":efMonths>=3?"#f59e0b":"#ef4444"}/>
      </div>

      {/* Тренды */}
      {(expTrend !== 0 || incTrend !== 0) && prevExpense > 0 && (
        <div className="px-4 grid grid-cols-2 gap-2">
          <div className="glass rounded-2xl px-3 py-3 flex items-center gap-2" style={{boxShadow:"var(--shadow)"}}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${incTrend>=0?"bg-emerald-50":"bg-red-50"}`}>
              {incTrend>=0?"📈":"📉"}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Доходы</p>
              <p className={`text-sm font-bold ${incTrend>=0?"text-emerald-600":"text-red-500"}`}>
                {incTrend>=0?"+":""}{Math.round(incTrend)}% к пред. мес.
              </p>
            </div>
          </div>
          <div className="glass rounded-2xl px-3 py-3 flex items-center gap-2" style={{boxShadow:"var(--shadow)"}}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${expTrend<=0?"bg-emerald-50":"bg-red-50"}`}>
              {expTrend<=0?"🎉":"⚠️"}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Расходы</p>
              <p className={`text-sm font-bold ${expTrend<=0?"text-emerald-600":"text-red-500"}`}>
                {expTrend>=0?"+":""}{Math.round(expTrend)}% к пред. мес.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Умные инсайты */}
      {insights.length > 0 && (
        <Card className="mx-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap size={13} className="text-primary"/>
            </div>
            <p className="text-sm font-bold">Инсайты</p>
          </div>
          <div className="space-y-2">
            {insights.slice(0,3).map((ins,i)=>(
              <div key={i} className="flex items-start gap-2.5 py-2 border-b border-border last:border-0">
                <span className="text-base flex-shrink-0 mt-0.5">{ins.icon}</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Upcoming payments */}
      {upcoming.length > 0 && (
        <Card className="mx-4">
          <SectionHeader title="Ближайшие платежи" action={<button onClick={()=>onMoreSection("recurring")} className="text-xs text-primary font-bold">Все →</button>}/>
          <div className="space-y-3">
            {upcoming.map(p=>{
              const days = daysUntil(p.next_date);
              const urgent = days <= 3;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg`}
                    style={{background: urgent ? "#fef2f2" : "var(--muted)"}}>
                    <Repeat size={16} style={{color: urgent ? "#ef4444" : "var(--muted-foreground)"}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{FREQ_LABELS[p.frequency]} · {days===0?"Сегодня!":days===1?"Завтра":`Через ${days} дн.`}</p>
                  </div>
                  <span className="text-sm font-bold font-mono text-red-500 flex-shrink-0">−{fmtUZS(p.amount)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Bar chart */}
      <Card className="mx-4">
        <SectionHeader title="Доходы и расходы за 6 мес."/>
        <CssBarChart data={barData} incKey="db_inc" expKey="db_exp"/>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{background:"#10b981"}}/><span className="text-xs text-muted-foreground">Доходы</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{background:"#f87171"}}/><span className="text-xs text-muted-foreground">Расходы</span></div>
        </div>
      </Card>

      {/* Expense breakdown */}
      {pieData.length > 0 && (
        <Card className="mx-4">
          <SectionHeader title="Куда уходят деньги"/>
          <div className="space-y-2.5">
            {pieData.map((e,i)=>{
              const total = pieData.reduce((s,x)=>s+x.value,0);
              const pct = Math.round((e.value/total)*100);
              return (
                <div key={e.name} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                  <span className="text-xs text-muted-foreground truncate flex-1">{e.name}</span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                  </div>
                  <span className="text-xs font-bold w-8 text-right flex-shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Goals mini */}
      {goals.length > 0 && (
        <Card className="mx-4">
          <SectionHeader title="Цели" action={<button onClick={()=>onTabChange("goals")} className="text-xs text-primary font-bold">Все →</button>}/>
          <div className="space-y-3">
            {[...goals].sort((a,b)=>({high:0,medium:1,low:2}[a.priority])-({high:0,medium:1,low:2}[b.priority])).slice(0,3).map(g=>{
              const pct = g.target_amount>0?Math.min(100,Math.round((g.allocated/g.target_amount)*100)):0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{background:PRIORITY_DOT[g.priority]}}/>
                      <span className="text-xs font-semibold truncate">{g.name}</span>
                    </div>
                    <span className="text-xs font-bold text-primary ml-2">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:pct>=100?"#10b981":"var(--primary)"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent transactions */}
      {recent.length > 0 && (
        <Card className="mx-4">
          <SectionHeader title="Последние операции" action={<button onClick={()=>onTabChange("journal")} className="text-xs text-primary font-bold">Все →</button>}/>
          <div className="space-y-3">
            {recent.map(t=>(
              <div key={t.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{background: t.type==="income" ? "#f0fdf4" : "#fef2f2"}}>
                  {t.type==="income"
                    ? <TrendingUp size={15} style={{color:"#10b981"}}/>
                    : <TrendingDown size={15} style={{color:"#ef4444"}}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.category}</p>
                  <p className="text-[10px] text-muted-foreground">{t.created_by_name} · {new Date(t.date+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}</p>
                </div>
                <span className="text-sm font-bold font-mono flex-shrink-0"
                  style={{color: t.type==="income" ? "#10b981" : "#ef4444"}}>
                  {t.type==="income"?"+":"−"}{fmtMoney(t.amount,t.currency??"UZS")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {recent.length === 0 && (
        <div className="mx-4 py-12 flex flex-col items-center gap-3 text-center">
          <div className="text-5xl">💸</div>
          <p className="font-bold text-lg">Пока нет операций</p>
          <p className="text-sm text-muted-foreground">Нажмите <strong>+</strong> чтобы добавить первую</p>
        </div>
      )}

      {/* FAB */}
      <AddFab onAdd={type => setAddType(type)} />

      {/* Add transaction sheet */}
      {addType && (
        <TxSheet
          categories={categories}
          initialType={addType}
          onSave={async (payload) => { await onSave(payload); setAddType(null); }}
          onClose={() => setAddType(null)}
          usdRate={usdRate}
        />
      )}
    </div>
  );
}
