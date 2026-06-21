import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, PiggyBank, Target, Shield, Repeat } from "lucide-react";
import { Card, StatCard, SectionHeader, Sheet, Input } from "./ui";
import type { Transaction, Category, Goal, RecurringPayment, AppSettings, AppUser, Currency } from "../../lib/api";

const MONTHS_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316","#84cc16"];
const FREQ_LABELS: Record<string,string> = { daily:"Ежедневно", weekly:"Еженедельно", monthly:"Ежемесячно", yearly:"Ежегодно" };
const fmt = (n:number) => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(n);
const fmtUZS = (n:number) => `${fmt(n)} сум`;
const fmtUSD = (n:number) => `$${fmt(n)}`;
const fmtMoney = (n:number, cur:Currency="UZS") => cur==="USD" ? fmtUSD(n) : fmtUZS(n);
const toUZS = (amount:number, cur:Currency, rate:number) => cur==="USD" ? amount*rate : amount;
const monthKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const daysUntil = (date:string) => Math.ceil((new Date(date).getTime()-Date.now())/86400000);
const PRIORITY_DOT: Record<string,string> = { high:"bg-red-500", medium:"bg-amber-500", low:"bg-blue-400" };
type TabType = "dashboard"|"journal"|"savings"|"goals"|"more";

function QuickAddSheet({ categories,quickActions,onSave,onClose,usdRate }: {
  categories:Category[]; quickActions:string[];
  onSave:(t:any)=>Promise<void>; onClose:()=>void; usdRate:number;
}) {
  const [selected,setSelected] = useState(quickActions[0]||"");
  const [amount,setAmount] = useState("");
  const [currency,setCurrency] = useState<Currency>("UZS");
  const [saving,setSaving] = useState(false);
  const amtNum = parseFloat(amount)||0;
  return (
    <Sheet title="Быстрое добавление" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {quickActions.map(qa=>(
          <button key={qa} onClick={()=>setSelected(qa)} className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${selected===qa?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>{qa}</button>
        ))}
      </div>
      <div className="mb-3">
        <label className="text-sm font-medium text-muted-foreground block mb-1.5">Сумма</label>
        <div className="flex gap-2">
          <Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="flex-1 text-3xl font-bold font-mono py-4 text-center" placeholder="0" inputMode="decimal" autoFocus/>
          <div className="flex flex-col gap-1">
            {(["UZS","USD"] as Currency[]).map(c=><button key={c} onClick={()=>setCurrency(c)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 ${currency===c?"border-primary bg-primary text-white":"border-border text-muted-foreground"}`}>{c==="UZS"?"сум":"$"}</button>)}
          </div>
        </div>
        {currency==="USD"&&amtNum>0&&<p className="text-xs text-muted-foreground mt-1">≈ {fmtUZS(amtNum*usdRate)}</p>}
      </div>
      <button onClick={async()=>{if(!amount||!selected)return;setSaving(true);await onSave({type:"expense",category:selected,amount:amtNum,currency,date:new Date().toISOString().split("T")[0],description:`Быстро: ${selected}`,receipt_url:null});setSaving(false);onClose();}}
        disabled={saving||!amount}
        className="w-full py-3.5 rounded-xl font-bold text-sm bg-primary text-white disabled:opacity-60">
        {saving?"...":`${selected} — ${fmtMoney(amtNum,currency)}`}
      </button>
    </Sheet>
  );
}

function CssBarChart({ data, incKey, expKey }: { data:any[]; incKey:string; expKey:string }) {
  const max = Math.max(...data.flatMap(d=>[d[incKey]??0,d[expKey]??0]),1);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d,i)=>(
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full flex items-end gap-px" style={{height:"88px"}}>
            <div className="flex-1 rounded-t-sm bg-emerald-500 transition-all" style={{height:`${((d[incKey]??0)/max)*100}%`,minHeight:d[incKey]>0?"2px":"0"}}/>
            <div className="flex-1 rounded-t-sm bg-red-400 transition-all" style={{height:`${((d[expKey]??0)/max)*100}%`,minHeight:d[expKey]>0?"2px":"0"}}/>
          </div>
          <span className="text-[9px] text-muted-foreground">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardScreen({ transactions,goals,usdRate,userProfile,familyMembers,categories,recurringPayments,settings,onSave,onMoreSection,onTabChange }: {
  transactions:Transaction[]; goals:Goal[];
  usdRate:number; userProfile:AppUser; familyMembers:AppUser[]; categories:Category[];
  recurringPayments:RecurringPayment[]; settings:AppSettings;
  onSave:(t:any)=>Promise<void>; onMoreSection:(s:string)=>void; onTabChange:(t:TabType)=>void;
}) {
  const [showQuick,setShowQuick] = useState(false);
  const now = new Date(); const mk = monthKey();
  const monthTx = transactions.filter(t=>t.date.startsWith(mk));
  const income = monthTx.filter(t=>t.type==="income").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const expense = monthTx.filter(t=>t.type==="expense").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
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
  transactions.filter(t=>t.type==="expense").forEach(t=>{expMap[t.category]=(expMap[t.category]??0)+toUZS(t.amount,t.currency??"UZS",usdRate);});
  const pieData = Object.entries(expMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,6);
  const recent = [...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const quickActions = settings.quick_actions?settings.quick_actions.split(",").map(s=>s.trim()).filter(Boolean):["Продукты","Такси","Кафе","Интернет"];

  const upcoming = [...recurringPayments].filter(p=>p.active).sort((a,b)=>a.next_date.localeCompare(b.next_date)).slice(0,3);

  // Emergency fund
  const months6 = Array.from({length:6},(_,i)=>monthKey(new Date(now.getFullYear(),now.getMonth()-5+i,1)));
  const avgExpense = months6.reduce((s,mk2)=>{const exp=transactions.filter(t=>t.date.startsWith(mk2)&&t.type==="expense").reduce((a,t)=>a+toUZS(t.amount,t.currency??"UZS",usdRate),0);return s+exp;},0)/Math.max(1,months6.filter(mk2=>transactions.some(t=>t.date.startsWith(mk2))).length);
  const efMonths = avgExpense>0?totalSavings/avgExpense:0;
  const efColor = efMonths>=6?"text-emerald-600":efMonths>=3?"text-amber-500":"text-red-500";
  const efBg = efMonths>=6?"bg-emerald-50 border-emerald-100":efMonths>=3?"bg-amber-50 border-amber-100":"bg-red-50 border-red-100";

  return (
    <div className="space-y-4 pb-4">
      <div className="px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{now.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</p>
            <h2 className="text-xl font-bold mt-0.5">Привет, {userProfile.name}!</h2>
          </div>
          <div className="flex -space-x-2">{familyMembers.slice(0,2).map(m=><div key={m.id} className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-bold text-primary">{m.name[0]}</div>)}</div>
        </div>
      </div>

      <div className="mx-4 bg-primary rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-70 mb-1">Остаток за месяц</p>
            <p className="text-4xl font-bold font-mono">{fmtUZS(income-expense)}</p>
          </div>
          <button onClick={()=>setShowQuick(true)} className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center active:scale-95 transition-transform"><Plus size={20}/></button>
        </div>
        <div className="flex gap-6 mt-4">
          <div><p className="text-xs opacity-60">Доходы</p><p className="text-base font-bold font-mono text-emerald-300">+{fmtUZS(income)}</p></div>
          <div><p className="text-xs opacity-60">Расходы</p><p className="text-base font-bold font-mono text-red-300">−{fmtUZS(expense)}</p></div>
        </div>
      </div>

      <div className="px-4">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Быстро добавить</p>
        <div className="grid grid-cols-4 gap-2">
          {quickActions.slice(0,4).map(qa=>(
            <button key={qa} onClick={()=>setShowQuick(true)} className="bg-card border border-border rounded-xl py-2.5 text-xs font-semibold text-foreground active:scale-95 transition-transform truncate px-1">{qa}</button>
          ))}
        </div>
      </div>

      <div className="px-4 grid grid-cols-3 gap-3">
        <StatCard label="Накопления" value={fmtUZS(totalSavings)} onClick={()=>onTabChange("savings")}/>
        <StatCard label="Целей" value={String(goals.length)} onClick={()=>onTabChange("goals")}/>
        <StatCard label="Выполнено" value={String(completedGoals)} color="text-emerald-600"/>
      </div>
      <div className="px-4 grid grid-cols-3 gap-3">
        <StatCard label="Распределено" value={fmtUZS(totalAllocated)}/>
        <StatCard label="Свободно" value={fmtUZS(Math.max(0,totalSavings-totalAllocated))} color={totalSavings-totalAllocated<0?"text-red-500":undefined}/>
        <StatCard label="Всего" value={fmtUZS(totalSavings)} color="text-blue-600"/>
      </div>

      {upcoming.length>0&&(
        <Card className="p-4 mx-4">
          <SectionHeader title="Ближайшие платежи" action={<button onClick={()=>onMoreSection("recurring")} className="text-xs text-primary font-bold">Все →</button>}/>
          <div className="space-y-2.5">
            {upcoming.map(p=>{
              const days=daysUntil(p.next_date);
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${days<=3?"bg-red-50":days<=7?"bg-amber-50":"bg-muted"}`}>
                    <Repeat size={15} className={days<=3?"text-red-500":days<=7?"text-amber-500":"text-muted-foreground"}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{days===0?"Сегодня":days===1?"Завтра":`Через ${days} дн.`} · {FREQ_LABELS[p.frequency]}</p>
                  </div>
                  <span className="text-sm font-bold font-mono text-red-500 flex-shrink-0">−{fmtUZS(p.amount)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className={`p-4 mx-4 border ${efBg}`}>
        <div className="flex items-center gap-2 mb-2"><Shield size={15} className={efColor}/><p className="text-sm font-bold">Финансовая устойчивость</p></div>
        <p className={`text-2xl font-bold font-mono ${efColor}`}>{efMonths.toFixed(1)} мес.</p>
        <p className="text-xs text-muted-foreground mt-1">при ср. расходе {fmtUZS(avgExpense)}/мес.</p>
      </Card>

      <Card className="p-4 mx-4">
        <SectionHeader title="Доходы и расходы"/>
        <CssBarChart data={barData} incKey="db_inc" expKey="db_exp"/>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"/><span className="text-xs text-muted-foreground">Доходы</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-400"/><span className="text-xs text-muted-foreground">Расходы</span></div>
        </div>
      </Card>

      {pieData.length>0&&(
        <Card className="p-4 mx-4">
          <SectionHeader title="Расходы по категориям"/>
          <div className="space-y-2.5">
            {pieData.map((e,i)=>{
              const total=pieData.reduce((s,x)=>s+x.value,0);
              const pct=Math.round((e.value/total)*100);
              return (
                <div key={e.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                  <span className="text-xs text-muted-foreground truncate flex-1">{e.name}</span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full rounded-full" style={{width:`${pct}%`,background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                  </div>
                  <span className="text-xs font-bold font-mono w-8 text-right flex-shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {goals.length>0&&(
        <Card className="p-4 mx-4">
          <SectionHeader title="Финансовые цели" action={<button onClick={()=>onTabChange("goals")} className="text-xs text-primary font-bold">Все →</button>}/>
          <div className="space-y-3">
            {[...goals].sort((a,b)=>({high:0,medium:1,low:2}[a.priority])-({high:0,medium:1,low:2}[b.priority])).slice(0,3).map(g=>{
              const pct=g.target_amount>0?Math.min(100,Math.round((g.allocated/g.target_amount)*100)):0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[g.priority]}`}/><span className="text-xs font-semibold truncate">{g.name}</span></div>
                    <span className="text-xs font-bold text-primary ml-2">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct>=100?"bg-emerald-500":"bg-primary"}`} style={{width:`${pct}%`}}/></div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {recent.length>0&&(
        <Card className="p-4 mx-4">
          <SectionHeader title="Последние операции" action={<button onClick={()=>onTabChange("journal")} className="text-xs text-primary font-bold">Все →</button>}/>
          <div className="space-y-3">
            {recent.map(t=>(
              <div key={t.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type==="income"?"bg-emerald-50":"bg-red-50"}`}>
                  {t.type==="income"?<TrendingUp size={14} className="text-emerald-600"/>:<TrendingDown size={14} className="text-red-500"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{t.category}</p>
                  <p className="text-[10px] text-muted-foreground">{t.created_by_name} · {new Date(t.date+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}</p>
                </div>
                <span className={`text-xs font-bold font-mono flex-shrink-0 ${t.type==="income"?"text-emerald-600":"text-red-500"}`}>{t.type==="income"?"+":"−"}{fmtMoney(t.amount,t.currency??"UZS")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showQuick&&<QuickAddSheet categories={categories} quickActions={quickActions} onSave={onSave} usdRate={usdRate} onClose={()=>setShowQuick(false)}/>}
    </div>
  );
}
