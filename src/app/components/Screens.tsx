import { useState, useEffect } from "react";
import {
  PiggyBank, Target, CheckCircle, Trash2, Plus, Clock, Calendar,
  BarChart2, Repeat, Tag, Bell, Users, Crown, LogOut, Shield,
  ChevronLeft, ChevronRight, AlertTriangle, AlertCircle, Wallet,
  Download, Copy, UserPlus, Sun, Moon, Pencil,
} from "lucide-react";
import { Card, StatCard, SectionHeader, Sheet, Field, Input, Select, Btn, Toggle, ConfirmDialog } from "./ui";
import { usePush } from "../../lib/usePush";
import { api } from "../../lib/api";
import { ymd } from "../../lib/date";
import type { Transaction, Category, Goal, Budget, RecurringPayment, AppSettings, AppUser, Notification, Currency, TxType, Frequency, Priority, PlannedItem, PlannedRecurrence, Space, SpaceType, Contractor, ContractorType } from "../../lib/api";

const MONTHS_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
const MONTHS_RU = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316","#84cc16"];
const FREQ_LABELS: Record<Frequency,string> = { daily:"Ежедневно", weekly:"Еженедельно", monthly:"Ежемесячно", yearly:"Ежегодно" };
const PRIORITY_CONFIG: Record<Priority,{label:string;color:string;bg:string;dot:string}> = {
  high:  {label:"Высокий",color:"text-rose-400",bg:"bg-rose-500/10 border-rose-500/30",dot:"bg-red-500"},
  medium:{label:"Средний",color:"text-amber-400",bg:"bg-amber-500/10 border-amber-500/30",dot:"bg-amber-500"},
  low:   {label:"Низкий",color:"text-indigo-400",bg:"bg-indigo-500/10 border-blue-200",dot:"bg-blue-400"},
};
const fmt = (n:number) => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(n);
const fmtUZS = (n:number) => `${fmt(n)} сум`;
const fmtUSD = (n:number) => `$${fmt(n)}`;
const fmtMoney = (n:number, cur:Currency="UZS") => cur==="USD" ? fmtUSD(n) : fmtUZS(n);
const toUZS = (amount:number, cur:Currency, rate:number) => cur==="USD" ? amount*rate : amount;
const monthKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const addMonths = (mk:string,d:number) => { const [y,m]=mk.split("-").map(Number); const dt=new Date(y,m-1+d,1); return monthKey(dt); };
const monthsUntil = (dl:string) => { const d=new Date(dl); const n=new Date(); return Math.max(0,(d.getFullYear()-n.getFullYear())*12+(d.getMonth()-n.getMonth())); };
const daysUntil = (date:string) => Math.ceil((new Date(date).getTime()-Date.now())/86400000);
const timeAgo = (ts:string) => { const d=Date.now()-new Date(ts).getTime(); if(d<60000) return "только что"; if(d<3600000) return `${Math.floor(d/60000)} мин. назад`; if(d<86400000) return `${Math.floor(d/3600000)} ч. назад`; return `${Math.floor(d/86400000)} дн. назад`; };
const nextDateForFrequency = (freq:Frequency,from:Date=new Date()): string => {
  const d=new Date(from);
  if(freq==="daily") d.setDate(d.getDate()+1);
  else if(freq==="weekly") d.setDate(d.getDate()+7);
  else if(freq==="monthly") d.setMonth(d.getMonth()+1);
  else d.setFullYear(d.getFullYear()+1);
  return ymd(d);
};

// ── Savings ──────────────────────────────────────────────────────────
export function SavingsScreen({ transactions,usdRate }: { transactions:Transaction[]; usdRate:number }) {
  const now=new Date();
  const totalIncome=transactions.filter(t=>t.type==="income").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const totalExpense=transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const netSavings=totalIncome-totalExpense;
  const totalIncUSD=transactions.filter(t=>t.type==="income"&&t.currency==="USD").reduce((s,t)=>s+t.amount,0);
  const totalExpUSD=transactions.filter(t=>t.type==="expense"&&t.currency==="USD").reduce((s,t)=>s+t.amount,0);
  const netUSD=totalIncUSD-totalExpUSD;
  const months=Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1); const mk=monthKey(d);
    const txs=transactions.filter(t=>t.date.startsWith(mk));
    const inc=txs.filter(t=>t.type==="income").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
    const exp=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
    return {label:`${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`,inc,exp,net:inc-exp,mk};
  });
  const maxBar=Math.max(...months.flatMap(m=>[m.inc,m.exp]),1);
  const savingsRate = totalIncome>0 ? Math.round(netSavings/totalIncome*100) : 0;
  const avgMonthlySavings = months.reduce((s,m)=>s+m.net,0)/Math.max(1,months.filter(m=>m.inc>0||m.exp>0).length);
  const bestMonth = [...months].sort((a,b)=>b.net-a.net)[0];

  return (
    <div className="pb-4 space-y-4">
      <div className="px-4"><h2 className="text-xl font-bold">Накопления</h2><p className="text-xs text-muted-foreground mt-0.5">Доходы минус расходы за всё время</p></div>

      {/* Hero */}
      <div className={`mx-4 rounded-3xl p-5 text-white relative overflow-hidden`}
        style={{background:netSavings>=0?"linear-gradient(135deg,#6366f1,#8b5cf6)":"linear-gradient(135deg,#ef4444,#dc2626)",boxShadow:"0 16px 48px rgba(99,102,241,0.3)"}}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-[var(--surface-2)]" style={{transform:"translate(30%,-30%)"}}/>
        <p className="text-sm opacity-70 mb-1">Накоплено всего</p>
        <p className="text-3xl font-black font-mono">{netSavings>=0?"+":""}{fmtUZS(netSavings)}</p>
        {netUSD!==0&&<p className="text-xs opacity-60 mt-1 font-mono">В долларах: {netUSD>=0?"+":""}{fmtUSD(netUSD)}</p>}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div><p className="text-[10px] opacity-60">Все доходы</p><p className="text-sm font-bold font-mono text-emerald-300">+{fmtUZS(totalIncome)}</p></div>
          <div><p className="text-[10px] opacity-60">Все расходы</p><p className="text-sm font-bold font-mono text-red-300">−{fmtUZS(totalExpense)}</p></div>
        </div>
      </div>

      {/* Ключевые метрики */}
      <div className="px-4 grid grid-cols-3 gap-2">
        <StatCard label="Норма сбережений" value={`${savingsRate}%`} icon={savingsRate>=20?"🌟":"💡"} accent={savingsRate>=20?"#10b981":savingsRate>=10?"#f59e0b":"#ef4444"}/>
        <StatCard label="В среднем/мес." value={fmtUZS(Math.abs(avgMonthlySavings))} icon="📅" accent={avgMonthlySavings>=0?"#6366f1":"#ef4444"}/>
        <StatCard label="Лучший месяц" value={bestMonth?.net>=0?"+"+fmtUZS(bestMonth.net):fmtUZS(bestMonth?.net||0)} icon="🏆" accent="#f59e0b"/>
      </div>

      {/* Помесячный график */}
      <Card className="mx-4 p-4">
        <SectionHeader title="Последние 6 месяцев"/>
        <div className="flex items-end gap-1.5 h-24 mb-3">
          {months.map((m,i)=>(
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex items-end gap-0.5" style={{height:"80px"}}>
                <div className="flex-1 rounded-t-md bg-emerald-400 transition-all" style={{height:`${(m.inc/maxBar)*100}%`,minHeight:m.inc>0?"3px":"0"}}/>
                <div className="flex-1 rounded-t-md bg-red-400 transition-all" style={{height:`${(m.exp/maxBar)*100}%`,minHeight:m.exp>0?"3px":"0"}}/>
              </div>
              <span className="text-[8px] text-muted-foreground">{MONTHS_SHORT[parseInt(m.mk.split("-")[1])-1]}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-400"/><span className="text-xs text-muted-foreground">Доходы</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-400"/><span className="text-xs text-muted-foreground">Расходы</span></div>
        </div>
        <div className="space-y-2 border-t border-border pt-3">
          {[...months].reverse().map((m,i)=>(
            <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground capitalize w-20">{m.label}</span>
              <div className="flex items-center gap-2 text-right">
                <span className="text-[10px] text-emerald-400 font-mono w-20 text-right">+{fmtUZS(m.inc)}</span>
                <span className="text-[10px] text-rose-400 font-mono w-20 text-right">−{fmtUZS(m.exp)}</span>
                <span className={`text-xs font-bold font-mono w-20 text-right ${m.net>=0?"text-primary":"text-rose-400"}`}>{m.net>=0?"+":""}{fmtUZS(m.net)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Подсказка по норме сбережений */}
      <Card className="mx-4 p-4">
        <p className="text-sm font-bold mb-2">💡 Нормы сбережений</p>
        <div className="space-y-2">
          {[{label:"Правило 50/30/20",desc:"20% доходов — в накопления",ok:savingsRate>=20},
            {label:"Минимальная норма",desc:"10% — базовая финансовая безопасность",ok:savingsRate>=10},
            {label:"Финансовая независимость",desc:"30%+ — путь к раннему выходу на пенсию",ok:savingsRate>=30}
          ].map(r=>(
            <div key={r.label} className="flex items-start gap-2.5 py-1.5 border-b border-border last:border-0">
              <span className="text-base mt-0.5">{r.ok?"✅":"⭕"}</span>
              <div><p className="text-xs font-semibold">{r.label}</p><p className="text-[10px] text-muted-foreground">{r.desc}</p></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Goals ─────────────────────────────────────────────────────────────
export function GoalsScreen({ goals,transactions,onAdd,onEdit,onDelete,onUpdateAllocation,usdRate=12700 }: {
  goals:Goal[]; transactions:Transaction[];
  onAdd:(g:any)=>Promise<void>; onEdit?:(id:string,g:any)=>Promise<void>; onDelete:(id:string)=>Promise<void>;
  onUpdateAllocation?:(id:string,amt:number)=>Promise<void>; usdRate?:number;
}) {
  const [showAdd,setShowAdd]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [name,setName]=useState(""); const [target,setTarget]=useState("");
  const [deadline,setDeadline]=useState(""); const [note,setNote]=useState("");
  const [priority,setPriority]=useState<Priority>("medium"); const [saving,setSaving]=useState(false);
  const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null);
  const [fundGoalId,setFundGoalId]=useState<string|null>(null);
  const [fundAmount,setFundAmount]=useState("");
  const resetForm=()=>{setEditingId(null);setName("");setTarget("");setDeadline("");setNote("");setPriority("medium");};
  const openEdit=(g:Goal)=>{setEditingId(g.id);setName(g.name);setTarget(String(g.target_amount));setDeadline(g.deadline||"");setNote(g.note||"");setPriority(g.priority);setShowAdd(true);};
  const now=new Date();
  const months3=Array.from({length:3},(_,i)=>monthKey(new Date(now.getFullYear(),now.getMonth()-2+i,1)));
  const avgMonthlySavings=months3.reduce((s,mk)=>{
    const txs=transactions.filter(t=>t.date.startsWith(mk));
    const inc=txs.filter(t=>t.type==="income").reduce((a,t)=>a+toUZS(t.amount,t.currency??"UZS",usdRate),0);
    const exp=txs.filter(t=>t.type==="expense").reduce((a,t)=>a+toUZS(t.amount,t.currency??"UZS",usdRate),0);
    return s+(inc-exp);
  },0)/3;
  const sorted=[...goals].sort((a,b)=>({high:0,medium:1,low:2}[a.priority])-({high:0,medium:1,low:2}[b.priority]));
  const totalTarget=goals.reduce((s,g)=>s+g.target_amount,0);
  const totalAlloc=goals.reduce((s,g)=>s+g.allocated,0);
  return (
    <div className="pb-24">
      <div className="px-4 pb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Финансовые цели</h2>
        <button onClick={()=>{resetForm();setShowAdd(true);}} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Plus size={15}/>Добавить</button>
      </div>
      {goals.length>0&&(
        <Card className="p-4 mx-4 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Общий прогресс</p>
          <div className="flex items-baseline gap-2 mb-2"><span className="text-xl font-bold font-mono">{fmtUZS(totalAlloc)}</span><span className="text-sm text-muted-foreground">из {fmtUZS(totalTarget)}</span></div>
          <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{width:`${totalTarget>0?Math.min(100,Math.round(totalAlloc/totalTarget*100)):0}%`}}/></div>
        </Card>
      )}
      {goals.length===0?(
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><Target size={48} className="mb-3 opacity-20"/><p className="text-sm">Нет целей</p></div>
      ):(
        <div className="px-4 space-y-4">
          {sorted.map(g=>{
            const pct=g.target_amount>0?Math.min(100,Math.round((g.allocated/g.target_amount)*100)):0;
            const done=g.allocated>=g.target_amount&&g.target_amount>0;
            const remaining=Math.max(0,g.target_amount-g.allocated);
            const daysLeft=g.deadline?Math.ceil((new Date(g.deadline).getTime()-Date.now())/86400000):null;
            const ml=g.deadline?monthsUntil(g.deadline):null;
            const monthlyNeeded=ml&&ml>0?remaining/ml:null;
            const etaMonths=avgMonthlySavings>0?Math.ceil(remaining/avgMonthlySavings):null;
            const etaDate=etaMonths!=null?new Date(now.getFullYear(),now.getMonth()+etaMonths,1):null;
            const willMissDeadline=g.deadline&&etaMonths!=null&&ml!=null&&etaMonths>ml;
            const pc=PRIORITY_CONFIG[g.priority];
            return (
              <Card key={g.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {done&&<CheckCircle size={15} className="text-emerald-500 flex-shrink-0"/>}
                    <h3 className="font-bold truncate">{g.name}</h3>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${pc.bg} ${pc.color}`}>{pc.label}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {onEdit&&<button onClick={()=>openEdit(g)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary active:bg-muted"><Pencil size={14}/></button>}
                    <button onClick={()=>setConfirmDeleteId(g.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-400 active:bg-muted"><Trash2 size={14}/></button>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${done?"bg-emerald-500/10 text-emerald-400":"bg-indigo-500/10 text-indigo-400"}`}>{pct}%</span>
                    {daysLeft!==null&&<span className={`text-xs font-semibold ${daysLeft<0?"text-rose-400":daysLeft<30?"text-orange-400":"text-muted-foreground"}`}>{daysLeft<0?`просрочено ${Math.abs(daysLeft)}д`:daysLeft===0?"сегодня!":`${daysLeft} дн.`}</span>}
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${done?"bg-emerald-500":g.priority==="high"?"bg-red-500":g.priority==="low"?"bg-blue-400":"bg-primary"}`} style={{width:`${pct}%`}}/></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-muted/60 rounded-xl py-2"><p className="text-[10px] text-muted-foreground mb-0.5">Цель</p><p className="text-xs font-bold font-mono">{fmtUZS(g.target_amount)}</p></div>
                  <div className="bg-emerald-500/10 rounded-xl py-2"><p className="text-[10px] text-emerald-400 mb-0.5">Накоплено</p><p className="text-xs font-bold font-mono text-emerald-400">{fmtUZS(g.allocated)}</p></div>
                  <div className={`rounded-xl py-2 ${done?"bg-emerald-500/10":"bg-rose-500/10"}`}><p className={`text-[10px] mb-0.5 ${done?"text-emerald-400":"text-rose-300"}`}>Осталось</p><p className={`text-xs font-bold font-mono ${done?"text-emerald-400":"text-rose-400"}`}>{done?"✓":fmtUZS(remaining)}</p></div>
                </div>
                {!done&&etaMonths!==null&&(
                  <div className={`rounded-xl px-3 py-2 flex items-center gap-2 mb-2 ${willMissDeadline?"bg-rose-500/10 border border-rose-500/30":"bg-indigo-500/10"}`}>
                    <Clock size={13} className={willMissDeadline?"text-rose-400":"text-indigo-400"}/>
                    <p className={`text-xs ${willMissDeadline?"text-rose-300":"text-indigo-300"}`}>
                      {etaMonths===0?"Цель достижима в этом месяце!":willMissDeadline?`⚠ Цель через ${etaMonths} мес. — позже дедлайна`:`При текущем темпе: через ${etaMonths} мес. (${etaDate?.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})})`}
                    </p>
                  </div>
                )}
                {monthlyNeeded&&!done&&(
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-2 mb-2">
                    <Calendar size={13} className="text-amber-400 flex-shrink-0"/>
                    <p className="text-xs text-amber-300">Нужно откладывать <strong>{fmtUZS(monthlyNeeded)}/мес.</strong></p>
                  </div>
                )}
                {g.note&&<p className="text-xs text-muted-foreground italic">📝 {g.note}</p>}
                {!done&&onUpdateAllocation&&(
                  <button onClick={()=>{setFundGoalId(g.id);setFundAmount(String(g.allocated||""));}}
                    className="mt-2 w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                    style={{background:"var(--primary)"}}>
                    💎 Пополнить цель
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {confirmDeleteId&&<ConfirmDialog title="Удалить цель?" message="Все накопления по этой цели будут удалены" onConfirm={()=>{onDelete(confirmDeleteId);setConfirmDeleteId(null);}} onCancel={()=>setConfirmDeleteId(null)}/>}
      {fundGoalId&&onUpdateAllocation&&(()=>{const g=goals.find(x=>x.id===fundGoalId)!; return g?(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setFundGoalId(null)}/>
          <div className="relative rounded-t-3xl p-5 sheet-safe" style={{background:"var(--card)",boxShadow:"0 -8px 40px rgba(0,0,0,0.3)"}}>
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4"/>
            <h3 className="text-base font-bold mb-1">💎 {g.name}</h3>
            <p className="text-xs text-muted-foreground mb-4">Цель: {fmtUZS(g.target_amount)}</p>
            <Field label="Сумма накоплений">
              <Input type="number" value={fundAmount} onChange={e=>setFundAmount(e.target.value)} placeholder="0" inputMode="numeric" autoFocus/>
            </Field>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setFundGoalId(null)} className="flex-1 py-3 rounded-2xl font-semibold text-sm" style={{background:"var(--muted)"}}>Отмена</button>
              <button onClick={async()=>{await onUpdateAllocation(g.id,parseFloat(fundAmount)||0);setFundGoalId(null);}}
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-white" style={{background:"var(--primary)"}}>Сохранить</button>
            </div>
          </div>
        </div>
      ):null;})()}
      {showAdd&&(
        <Sheet title={editingId?"Редактировать цель":"Новая цель"} onClose={()=>{setShowAdd(false);resetForm();}}>
          <div className="space-y-4">
            <Field label="Название"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Отпуск, машина..." autoFocus/></Field>
            <Field label="Сумма цели"><Input type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder="0" inputMode="decimal"/></Field>
            <Field label="Приоритет">
              <div className="grid grid-cols-3 gap-2">
                {(["high","medium","low"] as Priority[]).map(p=>{const pc=PRIORITY_CONFIG[p];return(<button key={p} onClick={()=>setPriority(p)} className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${priority===p?`${pc.bg} ${pc.color} border-current`:"border-border text-muted-foreground"}`}>{pc.label}</button>);})}
              </div>
            </Field>
            <Field label="Дедлайн (необязательно)"><Input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></Field>
            <Field label="Заметка"><Input value={note} onChange={e=>setNote(e.target.value)} placeholder="Необязательно"/></Field>
            <Btn onClick={async()=>{if(!name||!target)return;setSaving(true);try{const payload={name,target_amount:parseFloat(target),deadline:deadline||undefined,note:note||undefined,priority};if(editingId&&onEdit){await onEdit(editingId,payload);}else{await onAdd(payload);}setShowAdd(false);resetForm();}catch{/* тост показан */}finally{setSaving(false);}}} disabled={saving||!name||!target}>{saving?"...":editingId?"Сохранить":"Создать цель"}</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────
export function AnalyticsScreen({ transactions,usdRate }: { transactions:Transaction[]; usdRate:number }) {
  const now=new Date();
  const months6=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return{mk:monthKey(d),month:MONTHS_SHORT[d.getMonth()]};});
  const monthlyData=months6.map(({mk,month})=>{
    const txs=transactions.filter(t=>t.date.startsWith(mk));
    return {month,an_inc:txs.filter(t=>t.type==="income").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0),an_exp:txs.filter(t=>t.type==="expense").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0)};
  });
  const totalIncome=transactions.filter(t=>t.type==="income").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const totalExpense=transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const uzs=(t:Transaction)=>toUZS(t.amount,t.currency??"UZS",usdRate);
  const avgCheck=transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+uzs(t),0)/Math.max(1,transactions.filter(t=>t.type==="expense").length);
  const expByCat:Record<string,number>={};
  transactions.filter(t=>t.type==="expense").forEach(t=>{expByCat[t.category]=(expByCat[t.category]??0)+uzs(t);});
  const topExpenses=Object.entries(expByCat).map(([n,v])=>({name:n,value:v})).sort((a,b)=>b.value-a.value).slice(0,6);
  const expByUser:Record<string,number>={};
  transactions.filter(t=>t.type==="expense").forEach(t=>{expByUser[t.created_by_name]=(expByUser[t.created_by_name]??0)+uzs(t);});
  const catFreq:Record<string,number>={};
  transactions.forEach(t=>{catFreq[t.category]=(catFreq[t.category]??0)+1;});
  const topFreq=Object.entries(catFreq).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return (
    <div className="pb-4 space-y-4">
      <div className="px-4"><h2 className="text-xl font-bold">Аналитика</h2></div>
      <div className="px-4 grid grid-cols-2 gap-3">
        <StatCard label="Всего доходов" value={fmtUZS(totalIncome)} accent="#34D399"/>
        <StatCard label="Всего расходов" value={fmtUZS(totalExpense)} accent="#FB7185"/>
        <StatCard label="Средний чек" value={fmtUZS(avgCheck)} sub="расход"/>
        <StatCard label="Накоплено" value={fmtUZS(totalIncome-totalExpense)} accent="#818CF8"/>
      </div>
      <Card className="p-4 mx-4">
        <SectionHeader title="Динамика доходов и расходов"/>
        {(()=>{ const max=Math.max(...monthlyData.flatMap(d=>[d.an_inc,d.an_exp]),1); return (
          <>
            <div className="flex items-end gap-1.5 h-32 mb-2">
              {monthlyData.map((d,i)=>(
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex items-end justify-center gap-0.5" style={{height:"112px"}}>
                    <div className="flex-1 max-w-[14px] rounded-t-md transition-all" style={{height:`${(d.an_inc/max)*100}%`,minHeight:d.an_inc>0?"3px":"0",background:"#34D399"}} title={fmtUZS(d.an_inc)}/>
                    <div className="flex-1 max-w-[14px] rounded-t-md transition-all" style={{height:`${(d.an_exp/max)*100}%`,minHeight:d.an_exp>0?"3px":"0",background:"#FB7185"}} title={fmtUZS(d.an_exp)}/>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{d.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{background:"#34D399"}}/><span className="text-xs text-muted-foreground">Доходы</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{background:"#FB7185"}}/><span className="text-xs text-muted-foreground">Расходы</span></div>
            </div>
          </>
        );})()}
      </Card>
      {topExpenses.length>0&&(
        <Card className="p-4 mx-4">
          <SectionHeader title="Топ расходов по категориям"/>
          <div className="space-y-3">
            {topExpenses.map((e,i)=>{
              const pct=totalExpense>0?Math.round((e.value/totalExpense)*100):0;
              return (
                <div key={e.name}>
                  <div className="flex justify-between mb-1"><span className="text-xs font-semibold truncate flex-1">{e.name}</span><span className="text-xs font-bold font-mono ml-2">{fmtUZS(e.value)} · {pct}%</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct}%`,background:PIE_COLORS[i%PIE_COLORS.length]}}/></div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <Card className="p-4 mx-4">
        <SectionHeader title="Самые частые категории"/>
        <div className="space-y-2">
          {topFreq.map(([cat,cnt],i)=>(
            <div key={cat} className="flex items-center gap-3">
              <span className="text-sm font-bold text-muted-foreground w-5">{i+1}</span>
              <div className="flex-1"><p className="text-sm font-semibold truncate">{cat}</p></div>
              <span className="text-xs font-bold text-muted-foreground">{cnt} раз</span>
            </div>
          ))}
        </div>
      </Card>
      {Object.keys(expByUser).length>0&&(
        <Card className="p-4 mx-4">
          <SectionHeader title="Расходы по участникам"/>
          <div className="space-y-3">
            {Object.entries(expByUser).sort((a,b)=>b[1]-a[1]).map(([name,val])=>(
              <div key={name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">{name[0]}</div>
                <div className="flex-1"><p className="text-sm font-semibold">{name}</p></div>
                <span className="text-sm font-bold font-mono text-rose-400">−{fmtUZS(val)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Budgets ───────────────────────────────────────────────────────────
export function BudgetsScreen({ budgets,transactions,categories,onAdd,onEdit,onDelete,usdRate=12700 }: {
  budgets:Budget[]; transactions:Transaction[]; categories:Category[];
  onAdd:(b:any)=>Promise<void>; onEdit?:(id:string,b:any)=>Promise<void>; onDelete:(id:string)=>Promise<void>; usdRate?:number;
}) {
  const [showAdd,setShowAdd]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [cat,setCat]=useState(""); const [limit,setLimit]=useState(""); const [saving,setSaving]=useState(false);
  const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null);
  const resetForm=()=>{setEditingId(null);setCat("");setLimit("");};
  const openEdit=(b:Budget)=>{setEditingId(b.id);setCat(b.category);setLimit(String(b.month_limit));setShowAdd(true);};
  const mk=monthKey();
  const expCats=categories.filter(c=>c.type==="expense");
  // Конвертируем в сумы — иначе трата в USD считается по номиналу и занижает расход
  const getSpent=(category:string)=>transactions.filter(t=>t.type==="expense"&&t.category===category&&t.date.startsWith(mk)).reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const monthBudgets=budgets.filter(b=>b.month===mk);
  const prevMk=addMonths(mk,-1);
  const prevBudgets=budgets.filter(b=>b.month===prevMk);
  const missingFromPrev=prevBudgets.filter(pb=>!monthBudgets.some(b=>b.category===pb.category));
  const [copying,setCopying]=useState(false);
  const copyFromPrev=async()=>{ setCopying(true); try{ for(const pb of missingFromPrev){ await onAdd({category:pb.category,month_limit:pb.month_limit,month:mk}); } }finally{ setCopying(false); } };
  return (
    <div className="pb-4">
      <div className="px-4 pb-4 flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Бюджеты</h2><p className="text-xs text-muted-foreground">Лимиты на {MONTHS_RU[parseInt(mk.split("-")[1])-1]}</p></div>
        <button onClick={()=>{resetForm();setShowAdd(true);}} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Plus size={15}/>Добавить</button>
      </div>
      {missingFromPrev.length>0&&(
        <div className="px-4 mb-3">
          <button onClick={copyFromPrev} disabled={copying} className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{background:"var(--secondary)",color:"var(--secondary-foreground)"}}>
            <Copy size={15}/>{copying?"Копирую...":`Скопировать ${missingFromPrev.length} бюджет(ов) с прошлого месяца`}
          </button>
        </div>
      )}
      {monthBudgets.length===0?(
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><BarChart2 size={48} className="mb-3 opacity-20"/><p className="text-sm">Нет бюджетов на этот месяц</p></div>
      ):(
        <div className="px-4 space-y-3">
          {monthBudgets.map(b=>{
            const spent=getSpent(b.category);
            const pct=Math.min(100,Math.round((spent/b.month_limit)*100));
            const over=spent>b.month_limit;
            return (
              <Card key={b.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div><p className="text-sm font-bold">{b.category}</p><p className="text-xs text-muted-foreground">Лимит: {fmtUZS(b.month_limit)}</p></div>
                  <div className="flex items-center gap-2">
                    {over&&<span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={9}/>Превышен</span>}
                    {onEdit&&<button onClick={()=>openEdit(b)} className="text-muted-foreground hover:text-primary p-1"><Pencil size={13}/></button>}
                    <button onClick={()=>setConfirmDeleteId(b.id)} className="text-muted-foreground hover:text-rose-400 p-1"><Trash2 size={13}/></button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between mb-1.5">
                    <span className={`text-xs font-bold ${over?"text-rose-400":"text-foreground"}`}>{pct}%</span>
                    <span className={`text-xs font-mono ${over?"text-rose-400":"text-muted-foreground"}`}>{fmtUZS(spent)} / {fmtUZS(b.month_limit)}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${over?"bg-red-500":pct>80?"bg-amber-500":"bg-emerald-500"}`} style={{width:`${pct}%`}}/></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-xl py-2"><p className="text-[10px] text-muted-foreground mb-0.5">План</p><p className="text-xs font-bold font-mono">{fmtUZS(b.month_limit)}</p></div>
                  <div className={`rounded-xl py-2 ${over?"bg-rose-500/10":"bg-emerald-500/10"}`}><p className={`text-[10px] mb-0.5 ${over?"text-rose-400":"text-emerald-400"}`}>Факт</p><p className={`text-xs font-bold font-mono ${over?"text-rose-400":"text-emerald-400"}`}>{fmtUZS(spent)}</p></div>
                  <div className={`rounded-xl py-2 ${over?"bg-rose-500/10":"bg-indigo-500/10"}`}><p className={`text-[10px] mb-0.5 ${over?"text-rose-400":"text-indigo-400"}`}>Остаток</p><p className={`text-xs font-bold font-mono ${over?"text-rose-400":"text-indigo-400"}`}>{fmtUZS(Math.abs(b.month_limit-spent))}{over?" ↑":""}</p></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {confirmDeleteId&&<ConfirmDialog title="Удалить бюджет?" onConfirm={()=>{onDelete(confirmDeleteId);setConfirmDeleteId(null);}} onCancel={()=>setConfirmDeleteId(null)}/>}
      {showAdd&&(
        <Sheet title={editingId?"Редактировать бюджет":"Новый бюджет"} onClose={()=>{setShowAdd(false);resetForm();}}>
          <div className="space-y-4">
            <Field label="Категория расходов">
              <Select value={cat} onChange={e=>setCat(e.target.value)} disabled={!!editingId}>
                <option value="">Выберите</option>
                {expCats.filter(c=>c.name===cat||!monthBudgets.some(b=>b.category===c.name)).map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Лимит на месяц"><Input type="number" value={limit} onChange={e=>setLimit(e.target.value)} placeholder="0" inputMode="decimal" autoFocus/></Field>
            <Btn onClick={async()=>{if(!cat||!limit)return;setSaving(true);try{const payload={category:cat,month_limit:parseFloat(limit),month:mk};if(editingId&&onEdit){await onEdit(editingId,payload);}else{await onAdd(payload);}setShowAdd(false);resetForm();}catch{/* тост показан */}finally{setSaving(false);}}} disabled={saving||!cat||!limit}>{saving?"...":editingId?"Сохранить":"Создать бюджет"}</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── Recurring ─────────────────────────────────────────────────────────
export function RecurringScreen({ payments,categories,userName,onAdd,onEdit,onDelete,onMarkPaid }: {
  payments:RecurringPayment[]; categories:Category[]; userName:string;
  onAdd:(p:any)=>Promise<void>; onEdit?:(id:string,p:any)=>Promise<void>; onDelete:(id:string)=>Promise<void>; onMarkPaid:(id:string)=>Promise<void>;
}) {
  const [showAdd,setShowAdd]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [name,setName]=useState(""); const [cat,setCat]=useState(""); const [amount,setAmount]=useState("");
  const [freq,setFreq]=useState<Frequency>("monthly"); const [nextDate,setNextDate]=useState(ymd());
  const [saving,setSaving]=useState(false);
  const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null);
  const resetForm=()=>{setEditingId(null);setName("");setCat("");setAmount("");setFreq("monthly");setNextDate(ymd());};
  const openEdit=(p:RecurringPayment)=>{setEditingId(p.id);setName(p.name);setCat(p.category);setAmount(String(p.amount));setFreq(p.frequency);setNextDate(p.next_date);setShowAdd(true);};
  const sorted=[...payments].filter(p=>p.active).sort((a,b)=>a.next_date.localeCompare(b.next_date));
  const totalMonthly=payments.filter(p=>p.active).reduce((s,p)=>{
    if(p.frequency==="monthly") return s+p.amount;
    if(p.frequency==="yearly") return s+p.amount/12;
    if(p.frequency==="weekly") return s+p.amount*4.33;
    return s+p.amount*30;
  },0);
  return (
    <div className="pb-4">
      <div className="px-4 pb-4 flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Регулярные платежи</h2><p className="text-xs text-muted-foreground">{fmtUZS(totalMonthly)}/мес.</p></div>
        <button onClick={()=>{resetForm();setShowAdd(true);}} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Plus size={15}/>Добавить</button>
      </div>
      {sorted.length===0?(
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Repeat size={48} className="mb-3 opacity-20"/><p className="text-sm">Нет регулярных платежей</p></div>
      ):(
        <div className="px-4 space-y-3">
          {sorted.map(p=>{
            const days=daysUntil(p.next_date);
            const urgent=days<=3;
            return (
              <Card key={p.id} className={`p-4 ${urgent?"border-rose-500/30":""}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${urgent?"bg-rose-500/10":"bg-muted"}`}>
                    <Repeat size={18} className={urgent?"text-rose-400":"text-muted-foreground"}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div><p className="text-sm font-bold">{p.name}</p><p className="text-xs text-muted-foreground">{p.category} · {FREQ_LABELS[p.frequency]}</p></div>
                      <p className="text-base font-bold font-mono text-rose-400 flex-shrink-0">−{fmtUZS(p.amount)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs font-semibold ${urgent?"text-rose-400":days<=7?"text-amber-400":"text-muted-foreground"}`}>
                        {days<0?"Просрочен":days===0?"Сегодня!":days===1?"Завтра":`Через ${days} дн.`} · {new Date(p.next_date).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
                      </span>
                      <div className="flex gap-1 items-center">
                        <button onClick={()=>onMarkPaid(p.id)} className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">✓ Оплачено</button>
                        {onEdit&&<button onClick={()=>openEdit(p)} className="text-muted-foreground hover:text-primary p-1"><Pencil size={13}/></button>}
                        <button onClick={()=>setConfirmDeleteId(p.id)} className="text-muted-foreground hover:text-rose-400 p-1"><Trash2 size={13}/></button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {confirmDeleteId&&<ConfirmDialog title="Удалить платёж?" onConfirm={()=>{onDelete(confirmDeleteId);setConfirmDeleteId(null);}} onCancel={()=>setConfirmDeleteId(null)}/>}
      {showAdd&&(
        <Sheet title={editingId?"Редактировать платёж":"Новый регулярный платёж"} onClose={()=>{setShowAdd(false);resetForm();}}>
          <div className="space-y-4">
            <Field label="Название"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Интернет, кредит..." autoFocus/></Field>
            <Field label="Категория">
              <Select value={cat} onChange={e=>setCat(e.target.value)}>
                <option value="">Выберите</option>
                {categories.filter(c=>c.type==="expense").map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Сумма"><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" inputMode="decimal"/></Field>
            <Field label="Частота">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(FREQ_LABELS) as Frequency[]).map(f=><button key={f} onClick={()=>setFreq(f)} className={`py-2.5 rounded-xl text-xs font-bold border-2 ${freq===f?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>{FREQ_LABELS[f]}</button>)}
              </div>
            </Field>
            <Field label="Следующая дата"><Input type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)}/></Field>
            <Btn onClick={async()=>{if(!name||!amount)return;setSaving(true);try{const payload={name,category:cat||"Прочее",amount:parseFloat(amount),frequency:freq,next_date:nextDate};if(editingId&&onEdit){await onEdit(editingId,payload);}else{await onAdd(payload);}setShowAdd(false);resetForm();}catch{/* тост показан */}finally{setSaving(false);}}} disabled={saving||!name||!amount}>{saving?"...":editingId?"Сохранить":"Добавить"}</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────
export function CalendarScreen({ transactions,recurringPayments }: { transactions:Transaction[]; recurringPayments:RecurringPayment[] }) {
  const [viewMonth,setViewMonth]=useState(monthKey());
  const [y,m]=viewMonth.split("-").map(Number);
  const daysInMonth=new Date(y,m,0).getDate();
  const firstDow=new Date(y,m-1,1).getDay();
  const startDow=firstDow===0?6:firstDow-1;
  const txByDay:Record<number,{income:number;expense:number}>={};
  transactions.filter(t=>t.date.startsWith(viewMonth)).forEach(t=>{
    const day=parseInt(t.date.split("-")[2]);
    if(!txByDay[day]) txByDay[day]={income:0,expense:0};
    if(t.type==="income") txByDay[day].income+=t.amount; else txByDay[day].expense+=t.amount;
  });
  const recurByDay:Record<number,RecurringPayment[]>={};
  recurringPayments.filter(p=>p.active&&p.next_date.startsWith(viewMonth)).forEach(p=>{
    const day=parseInt(p.next_date.split("-")[2]);
    (recurByDay[day]??=[]).push(p);
  });
  const [selected,setSelected]=useState<number|null>(null);
  const selTx=selected?transactions.filter(t=>t.date===`${viewMonth}-${String(selected).padStart(2,"0")}`):[];
  const selRecur=selected?(recurByDay[selected]??[]):[];
  const isCurrent=viewMonth===monthKey();
  const today=new Date().getDate();
  return (
    <div className="pb-4">
      <div className="px-4 pb-4">
        <h2 className="text-xl font-bold mb-3">Финансовый календарь</h2>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={()=>setViewMonth(mk=>addMonths(mk,-1))} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"><ChevronLeft size={18}/></button>
          <div className="flex-1 text-center"><p className="text-sm font-bold capitalize">{MONTHS_RU[m-1]} {y}</p></div>
          <button onClick={()=>setViewMonth(mk=>addMonths(mk,1))} disabled={isCurrent} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center disabled:opacity-30"><ChevronRight size={18}/></button>
        </div>
      </div>
      <div className="px-4">
        <div className="grid grid-cols-7 mb-2">
          {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(d=><p key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</p>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({length:startDow}).map((_,i)=><div key={`e-${i}`}/>)}
          {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
            const hasTx=!!txByDay[day]; const hasRecur=!!recurByDay[day];
            const isToday=isCurrent&&day===today; const isSel=selected===day;
            return (
              <button key={day} onClick={()=>setSelected(isSel?null:day)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative ${isSel?"bg-primary text-white":isToday?"bg-primary/10 text-primary":hasTx||hasRecur?"bg-muted/50":"hover:bg-muted/30"}`}>
                <span className={`text-xs font-bold ${isSel?"text-white":isToday?"text-primary":""}`}>{day}</span>
                <div className="flex gap-0.5 mt-0.5">
                  {hasTx&&txByDay[day].expense>0&&<div className={`w-1 h-1 rounded-full ${isSel?"bg-red-300":"bg-red-500"}`}/>}
                  {hasTx&&txByDay[day].income>0&&<div className={`w-1 h-1 rounded-full ${isSel?"bg-green-300":"bg-emerald-500"}`}/>}
                  {hasRecur&&<div className={`w-1 h-1 rounded-full ${isSel?"bg-orange-300":"bg-amber-500"}`}/>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 justify-center">
          {[["bg-emerald-500","Доходы"],["bg-red-500","Расходы"],["bg-amber-500","Платежи"]].map(([c,l])=>(
            <div key={l} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${c}`}/><span className="text-xs text-muted-foreground">{l}</span></div>
          ))}
        </div>
        {selected&&(selTx.length>0||selRecur.length>0)&&(
          <Card className="p-4 mt-4">
            <p className="text-sm font-bold mb-3">{selected} {MONTHS_RU[m-1]}</p>
            <div className="space-y-2">
              {selTx.map(t=>(
                <div key={t.id} className="flex items-center gap-2">
                  <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${t.type==="income"?"bg-emerald-500":"bg-red-500"}`}/>
                  <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{t.category}</p><p className="text-[10px] text-muted-foreground">{t.created_by_name}</p></div>
                  <span className={`text-xs font-bold font-mono ${t.type==="income"?"text-emerald-400":"text-rose-400"}`}>{t.type==="income"?"+":"−"}{fmtMoney(t.amount,t.currency??"UZS")}</span>
                </div>
              ))}
              {selRecur.map(p=>(
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0 bg-amber-500"/>
                  <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{p.name}</p><p className="text-[10px] text-muted-foreground">Регулярный · {FREQ_LABELS[p.frequency]}</p></div>
                  <span className="text-xs font-bold font-mono text-amber-400">−{fmtUZS(p.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Report ────────────────────────────────────────────────────────────
export function MonthlyReportScreen({ transactions,usdRate }: { transactions:Transaction[]; usdRate:number }) {
  const [reportMonth,setReportMonth]=useState(addMonths(monthKey(),-1));
  const [y,m]=reportMonth.split("-").map(Number);
  const txs=transactions.filter(t=>t.date.startsWith(reportMonth));
  const uzs=(t:Transaction)=>toUZS(t.amount,t.currency??"UZS",usdRate);
  const income=txs.filter(t=>t.type==="income").reduce((s,t)=>s+uzs(t),0);
  const expense=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+uzs(t),0);
  const balance=income-expense;
  const expByCat:Record<string,number>={};
  txs.filter(t=>t.type==="expense").forEach(t=>{expByCat[t.category]=(expByCat[t.category]??0)+uzs(t);});
  const topCats=Object.entries(expByCat).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const worstCat=topCats[0]; const bestCat=topCats[topCats.length-1];
  const exportExcel=async()=>{
    const XLSX=await import("xlsx");
    const wb=XLSX.utils.book_new();
    const data=[["Отчёт за",`${MONTHS_RU[m-1]} ${y}`],[""],["Показатель","Сумма"],["Доходы",income],["Расходы",expense],["Баланс",balance],[""],["Категория","Расходы"],...topCats.map(([c,v])=>[c,v])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),"Отчёт");
    const txData=[["Дата","Тип","Категория","Сумма","Автор"],...txs.sort((a,b)=>b.date.localeCompare(a.date)).map(t=>[t.date,t.type==="income"?"Доход":"Расход",t.category,t.amount,t.created_by_name])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(txData),"Операции");
    XLSX.writeFile(wb,`отчёт_${reportMonth}.xlsx`);
  };
  return (
    <div className="pb-4">
      <div className="px-4 pb-4">
        <h2 className="text-xl font-bold mb-3">Ежемесячный отчёт</h2>
        <div className="flex items-center gap-2">
          <button onClick={()=>setReportMonth(mk=>addMonths(mk,-1))} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"><ChevronLeft size={18}/></button>
          <div className="flex-1 text-center"><p className="text-sm font-bold capitalize">{MONTHS_RU[m-1]} {y}</p></div>
          <button onClick={()=>setReportMonth(mk=>addMonths(mk,1))} disabled={reportMonth>=addMonths(monthKey(),-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center disabled:opacity-30"><ChevronRight size={18}/></button>
        </div>
      </div>
      <div className="px-4 space-y-4">
        <div className={`rounded-2xl p-5 text-white ${balance>=0?"bg-primary":"bg-red-600"}`}>
          <p className="text-sm opacity-70">Итог месяца</p>
          <p className="text-3xl font-bold font-mono">{fmtUZS(balance)}</p>
          <div className="flex gap-6 mt-3">
            <div><p className="text-xs opacity-60">Доходы</p><p className="text-sm font-bold font-mono text-emerald-300">+{fmtUZS(income)}</p></div>
            <div><p className="text-xs opacity-60">Расходы</p><p className="text-sm font-bold font-mono text-red-300">−{fmtUZS(expense)}</p></div>
          </div>
        </div>
        {topCats.length>0&&(
          <>
            <div className="grid grid-cols-2 gap-3">
              {worstCat&&<Card className="p-3 border-rose-500/20"><p className="text-[10px] text-rose-400 font-bold uppercase mb-1">Больший расход</p><p className="text-xs font-bold truncate">{worstCat[0]}</p><p className="text-sm font-bold font-mono text-rose-400">{fmtUZS(worstCat[1])}</p></Card>}
              {bestCat&&bestCat!==worstCat&&<Card className="p-3 border-emerald-500/20"><p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Меньший расход</p><p className="text-xs font-bold truncate">{bestCat[0]}</p><p className="text-sm font-bold font-mono text-emerald-400">{fmtUZS(bestCat[1])}</p></Card>}
            </div>
            <Card className="p-4">
              <SectionHeader title="Расходы по категориям"/>
              <div className="space-y-2">
                {topCats.map(([cat,val])=>{const pct=expense>0?Math.round((val/expense)*100):0;return(<div key={cat}><div className="flex justify-between mb-1"><span className="text-xs font-semibold">{cat}</span><span className="text-xs font-bold font-mono">{fmtUZS(val)} · {pct}%</span></div><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{width:`${pct}%`}}/></div></div>);})}
              </div>
            </Card>
          </>
        )}
        {txs.length===0&&<div className="text-center py-8 text-muted-foreground"><p className="text-sm">Нет данных за этот месяц</p></div>}
        <button onClick={exportExcel} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2"><Download size={16}/>Скачать Excel</button>
        <button onClick={()=>window.print()} className="w-full py-3.5 rounded-2xl bg-muted text-foreground font-bold text-sm flex items-center justify-center gap-2"><Download size={16}/>Печать / PDF</button>
      </div>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────
function DbStatusCard() {
  const [diag,setDiag]=useState<{hasDatabaseUrl:boolean;host:string|null;transactions:number|null;goals:number|null;error:string|null}|null>(null);
  const [loading,setLoading]=useState(true);
  const load=async()=>{ setLoading(true); try{ setDiag(await api.diag()); }catch(e:any){ setDiag({hasDatabaseUrl:false,host:null,transactions:null,goals:null,error:e?.message||"нет связи"}); } finally{ setLoading(false); } };
  useEffect(()=>{ load(); },[]);
  const persistent = diag?.hasDatabaseUrl && !diag?.error;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold">🗄 Состояние базы данных</p>
        <button onClick={load} className="text-xs text-primary font-bold">{loading?"...":"Обновить"}</button>
      </div>
      {loading&&!diag?<p className="text-xs text-muted-foreground">Проверка...</p>:diag&&(
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">DATABASE_URL</span><span className={diag.hasDatabaseUrl?"text-emerald-400 font-bold":"text-rose-400 font-bold"}>{diag.hasDatabaseUrl?"✓ задан":"✕ НЕ задан"}</span></div>
          {diag.host&&<div className="flex justify-between"><span className="text-muted-foreground">Хост</span><span className="font-mono">{diag.host}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Транзакций в БД</span><span className="font-mono font-bold">{diag.transactions??"—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Целей в БД</span><span className="font-mono font-bold">{diag.goals??"—"}</span></div>
          {diag.error&&<p className="text-rose-400 mt-1">Ошибка: {diag.error}</p>}
          <div className={`mt-2 rounded-xl px-3 py-2 ${persistent?"bg-emerald-500/10 text-emerald-300":"bg-rose-500/10 text-rose-300"}`}>
            {persistent
              ? "✅ База подключена. Если число транзакций совпадает с тем, что вы добавляли — данные сохраняются."
              : "⚠️ База не настроена. На Railway: New → Database → PostgreSQL, затем в приложении Variables → DATABASE_URL = ${{Postgres.DATABASE_URL}}"}
          </div>
        </div>
      )}
    </Card>
  );
}

export function SettingsScreen({ settings,onUpdate,darkMode,onToggleDark }: {
  settings:AppSettings; onUpdate:(s:Partial<AppSettings>)=>Promise<void>; darkMode:boolean; onToggleDark:()=>void;
}) {
  const [rate,setRate]=useState(String(settings.usd_rate));
  const [quickStr,setQuickStr]=useState(settings.quick_actions||"Продукты,Такси,Кафе,Интернет");
  const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false);
  const push = usePush();

  return (
    <div className="pb-4">
      <div className="px-4 pb-4"><h2 className="text-xl font-bold">Настройки</h2></div>
      <div className="px-4 space-y-3">

        <DbStatusCard/>

        <Card className="p-4 flex flex-col gap-4">
          <Toggle checked={darkMode} onChange={onToggleDark} label={darkMode ? "🌙 Тёмная тема" : "☀️ Светлая тема"} />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">🔔 Push-уведомления</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {push.status === 'granted' ? 'Включены' : push.status === 'denied' ? 'Заблокированы в браузере' : push.status === 'unsupported' ? 'Не поддерживается' : 'Выключены'}
              </p>
            </div>
            {push.status !== 'unsupported' && push.status !== 'denied' && (
              <Toggle
                checked={push.status === 'granted'}
                onChange={v => v ? push.subscribe() : push.unsubscribe()}
              />
            )}
          </div>
          {push.status === 'denied' && (
            <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-lg px-3 py-2">
              Разрешите уведомления в настройках браузера, затем перезагрузите страницу
            </p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-sm font-bold mb-3">Быстрые операции</p>
          <Field label="Категории (через запятую)">
            <Input value={quickStr} onChange={e=>setQuickStr(e.target.value)} placeholder="Продукты,Такси,Кафе,Интернет"/>
          </Field>
          <p className="text-xs text-muted-foreground mt-1.5">До 4 кнопок на главном экране</p>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-bold mb-3">Курс валют</p>
          <Field label="1 USD = ? сум">
            <div className="flex gap-2">
              <Input type="number" value={rate} onChange={e=>setRate(e.target.value)} className="font-mono flex-1" inputMode="decimal"/>
              <Btn onClick={async()=>{setSaving(true);await onUpdate({usd_rate:parseFloat(rate)||12700,quick_actions:quickStr});setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2000);}} disabled={saving} variant={saved ? 'secondary' : 'primary'} className="flex-shrink-0">
                {saving ? '...' : saved ? '✓ Сохранено' : 'Сохранить'}
              </Btn>
            </div>
          </Field>
        </Card>
      </div>
    </div>
  );
}

// ── Allocation ────────────────────────────────────────────────────────
export function AllocationScreen({ goals,totalSavings,onUpdate }: {
  goals:Goal[]; totalSavings:number; onUpdate:(gid:string,amt:number)=>Promise<void>;
}) {
  const [amounts,setAmounts]=useState<Record<string,string>>({});
  const [saved,setSaved]=useState<string|null>(null);
  useEffect(()=>{const m:Record<string,string>={};goals.forEach(g=>{m[g.id]=g.allocated>0?String(g.allocated):"";});setAmounts(m);},[goals]);
  const total=Object.values(amounts).reduce((s,v)=>s+(parseFloat(v)||0),0);
  const unalloc=totalSavings-total; const isOver=total>totalSavings&&totalSavings>0;
  return (
    <div className="pb-4">
      <div className="mx-4 mb-4 bg-primary rounded-2xl p-5 text-white">
        <p className="text-sm opacity-70 mb-1">Распределено</p><p className="text-2xl font-bold font-mono">{fmtUZS(total)}</p>
        <div className="mt-3"><div className="h-2 bg-white/20 rounded-full overflow-hidden"><div className={`h-full rounded-full ${isOver?"bg-red-400":"bg-[var(--surface-2)]"}`} style={{width:`${totalSavings>0?Math.min(100,Math.round(total/totalSavings*100)):0}%`}}/></div>
        <div className="flex justify-between mt-1.5"><p className="text-xs opacity-60">из {fmtUZS(totalSavings)}</p><p className={`text-xs font-semibold ${isOver?"text-red-300":"opacity-70"}`}>{isOver?`⚠ Превышение на ${fmtUZS(Math.abs(unalloc))}`:`Свободно: ${fmtUZS(unalloc)}`}</p></div></div>
      </div>
      {isOver&&<div className="mx-4 mb-4 flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3"><AlertCircle size={16}/><p className="text-sm font-semibold">Распределено больше накоплений!</p></div>}
      <div className="px-4 space-y-3">
        {[...goals].sort((a,b)=>({high:0,medium:1,low:2}[a.priority])-({high:0,medium:1,low:2}[b.priority])).map(g=>{
          const val=parseFloat(amounts[g.id]||"0")||0;
          const gpct=g.target_amount>0?Math.min(100,Math.round((val/g.target_amount)*100)):0;
          return (
            <Card key={g.id} className="p-4">
              <div className="flex justify-between items-start mb-1"><p className="text-sm font-semibold">{g.name}</p>{saved===g.id&&<span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle size={10}/>OK</span>}</div>
              <p className="text-xs text-muted-foreground mb-3">Цель: {fmtUZS(g.target_amount)} · {gpct}%</p>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3"><div className="h-full bg-primary rounded-full" style={{width:`${gpct}%`}}/></div>
              <div className="flex gap-2">
                <Input type="number" value={amounts[g.id]??""} onChange={e=>setAmounts(p=>({...p,[g.id]:e.target.value}))} className="font-mono text-sm" placeholder="0" inputMode="decimal"/>
                <button onClick={async()=>{await onUpdate(g.id,parseFloat(amounts[g.id]||"0")||0);setSaved(g.id);setTimeout(()=>setSaved(null),1500);}} className="px-5 py-3 rounded-xl bg-primary text-white text-sm font-bold flex-shrink-0">OK</button>
              </div>
            </Card>
          );
        })}
        {goals.length===0&&<div className="text-center py-12 text-muted-foreground text-sm">Создайте цели в разделе «Цели»</div>}
      </div>
    </div>
  );
}

// ── Categories ────────────────────────────────────────────────────────
export function CategoriesScreen({ categories,onAdd,onDelete }: {
  categories:Category[]; onAdd:(name:string,type:TxType)=>Promise<void>; onDelete:(id:string)=>Promise<void>;
}) {
  const [showAdd,setShowAdd]=useState(false);
  const [name,setName]=useState(""); const [type,setType]=useState<TxType>("expense"); const [saving,setSaving]=useState(false);
  const Sec=({title,items,color}:{title:string;items:Category[];color:string})=>(
    <div><p className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{title} · {items.length}</p>
    <div className="space-y-2">{items.map(c=>(
      <div key={c.id} className="bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.type==="income"?"bg-emerald-500/10":"bg-rose-500/10"}`}><Tag size={13} className={c.type==="income"?"text-emerald-400":"text-rose-400"}/></div>
        <span className="text-sm font-medium flex-1">{c.name}</span>
        {c.is_default?<span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">по умолчанию</span>:<button onClick={()=>onDelete(c.id)} className="text-muted-foreground hover:text-rose-400 p-1"><Trash2 size={13}/></button>}
      </div>
    ))}</div></div>
  );
  return (
    <div className="pb-4">
      <div className="px-4 pb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Справочник</h2><button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Plus size={15}/>Добавить</button></div>
      <div className="px-4 space-y-5"><Sec title="Доходы" items={categories.filter(c=>c.type==="income")} color="text-emerald-400"/><Sec title="Расходы" items={categories.filter(c=>c.type==="expense")} color="text-rose-400"/></div>
      {showAdd&&<Sheet title="Новая категория" onClose={()=>setShowAdd(false)}>
        <div className="space-y-4">
          <div className="flex bg-muted rounded-xl p-1">{(["expense","income"] as TxType[]).map(t=><button key={t} onClick={()=>setType(t)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${type===t?"bg-[var(--surface-2)] shadow-sm text-foreground":"text-muted-foreground"}`}>{t==="expense"?"Расход":"Доход"}</button>)}</div>
          <Field label="Название"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Категория..." autoFocus/></Field>
          <Btn onClick={async()=>{if(!name)return;setSaving(true);try{await onAdd(name,type);setShowAdd(false);setName("");}catch{/* тост показан */}finally{setSaving(false);}}} disabled={saving||!name}>{saving?"...":"Добавить"}</Btn>
        </div>
      </Sheet>}
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────────────
export function NotificationsScreen({ notifications,onMarkRead,onMarkAllRead,onDelete,onClear }: {
  notifications:Notification[]; onMarkRead:(id:string)=>void; onMarkAllRead:()=>void;
  onDelete?:(id:string)=>void; onClear?:()=>void;
}) {
  const icons:Record<string,string>={transaction:"💳",goal:"🎯",savings:"💰",member:"👋",system:"ℹ️"};
  const unread=notifications.filter(n=>!n.read).length;
  const [confirmClear,setConfirmClear]=useState(false);
  return (
    <div className="pb-4">
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><h2 className="text-xl font-bold">Уведомления</h2>{unread>0&&<span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread}</span>}</div>
        <div className="flex items-center gap-3">
          {unread>0&&<button onClick={onMarkAllRead} className="text-xs text-primary font-bold">Прочитать все</button>}
          {onClear&&notifications.length>0&&<button onClick={()=>setConfirmClear(true)} className="text-xs text-rose-400 font-bold">Очистить</button>}
        </div>
      </div>
      {notifications.length===0?<div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><Bell size={48} className="mb-3 opacity-20"/><p className="text-sm">Нет уведомлений</p></div>:
      <div className="px-4 space-y-2">{notifications.map(n=>(
        <div key={n.id} className={`w-full rounded-2xl border p-4 flex items-start gap-3 ${n.read?"bg-card border-border":"bg-indigo-500/10 border-indigo-500/20"}`}>
          <span className="text-xl flex-shrink-0" onClick={()=>!n.read&&onMarkRead(n.id)}>{icons[n.type]||"ℹ️"}</span>
          <div className="flex-1 min-w-0" onClick={()=>!n.read&&onMarkRead(n.id)}><p className="text-sm font-semibold">{n.title}</p><p className="text-xs text-muted-foreground mt-0.5">{n.body}</p><p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p></div>
          {!n.read&&<div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"/>}
          {onDelete&&<button onClick={()=>onDelete(n.id)} className="text-muted-foreground hover:text-rose-400 p-1 flex-shrink-0"><Trash2 size={13}/></button>}
        </div>
      ))}</div>}
      {confirmClear&&onClear&&<ConfirmDialog title="Очистить все уведомления?" onConfirm={()=>{onClear();setConfirmClear(false);}} onCancel={()=>setConfirmClear(false)}/>}
    </div>
  );
}

// ── Family ────────────────────────────────────────────────────────────
export function FamilyScreen({ members,currentUser }: { members:AppUser[]; currentUser:AppUser }) {
  return (
    <div className="pb-4">
      <div className="px-4 pb-4"><h2 className="text-xl font-bold">Семья</h2></div>
      <div className="px-4 space-y-4">
        <div className="bg-primary rounded-2xl p-5 text-white"><p className="text-xs opacity-70 mb-1">Семья</p><p className="text-2xl font-bold">Наша семья</p><p className="text-sm opacity-60 mt-1">{members.length} участника</p></div>
        <Card className="p-5">
          <p className="text-sm font-bold mb-3">Участники</p>
          <div className="space-y-3">{members.map(m=>(
            <div key={m.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-base font-bold">{m.name[0]}</div>
              <div className="flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold">{m.name}</p>{m.role==="owner"&&<Crown size={12} className="text-amber-400"/>}</div><p className="text-xs text-muted-foreground">{m.role==="owner"?"Владелец":"Участник"}{m.id===currentUser.id?" (вы)":""}</p></div>
            </div>
          ))}</div>
        </Card>
      </div>
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────────────
export function ProfileScreen({ userProfile,onLogout,onChangePassword,onUpdateProfile }: {
  userProfile:AppUser; onLogout:()=>void;
  onChangePassword?:(o:string,n:string)=>Promise<void>; onUpdateProfile?:(p:{name?:string;phone?:string;color?:string})=>Promise<void>;
}) {
  const [editProfile,setEditProfile]=useState(false);
  const [name,setName]=useState(userProfile.name); const [phone,setPhone]=useState(userProfile.phone||"");
  const [changePw,setChangePw]=useState(false);
  const [oldPw,setOldPw]=useState(""); const [newPw,setNewPw]=useState(""); const [showPw,setShowPw]=useState(false);
  const [saving,setSaving]=useState(false);
  return (
    <div className="pb-4">
      <div className="px-4 pb-4"><h2 className="text-xl font-bold">Профиль</h2></div>
      <div className="px-4 space-y-4">
        <div className="bg-primary rounded-2xl p-5 text-white flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">{userProfile.name[0]}</div>
          <div><p className="text-xl font-bold">{userProfile.name}</p><div className="flex items-center gap-1.5 mt-1">{userProfile.role==="owner"?<Crown size={13} className="text-amber-300"/>:<Users size={13} className="text-white/70"/>}<p className="text-sm opacity-80">{userProfile.role==="owner"?"Владелец семьи":"Участник"}</p></div></div>
        </div>
        <Card className="p-5 space-y-3">
          {[{l:"Имя",v:userProfile.name},{l:"Телефон",v:userProfile.phone||"Не указан"},{l:"Роль",v:userProfile.role==="owner"?"Владелец":"Участник"}].map(item=>(
            <div key={item.l} className="flex justify-between items-center py-2 border-b border-border last:border-0"><span className="text-sm text-muted-foreground">{item.l}</span><span className="text-sm font-semibold">{item.v}</span></div>
          ))}
          {onUpdateProfile&&<button onClick={()=>{setName(userProfile.name);setPhone(userProfile.phone||"");setEditProfile(true);}} className="text-sm text-primary font-bold pt-1">Редактировать профиль →</button>}
        </Card>

        {onChangePassword&&(
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Shield size={15} className="text-primary"/><p className="text-sm font-bold">Пароль</p></div>
              <button onClick={()=>{setOldPw("");setNewPw("");setChangePw(true);}} className="text-sm text-primary font-bold">Сменить</button>
            </div>
          </Card>
        )}

        <Btn variant="danger" onClick={onLogout}><div className="flex items-center justify-center gap-2"><LogOut size={16}/>Выйти из аккаунта</div></Btn>
      </div>

      {editProfile&&onUpdateProfile&&(
        <Sheet title="Редактировать профиль" onClose={()=>setEditProfile(false)}>
          <div className="space-y-4">
            <Field label="Имя"><Input value={name} onChange={e=>setName(e.target.value)} autoFocus/></Field>
            <Field label="Телефон"><Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Необязательно" inputMode="tel"/></Field>
            <Btn onClick={async()=>{if(!name.trim())return;setSaving(true);try{await onUpdateProfile({name:name.trim(),phone:phone||undefined});setEditProfile(false);}catch{/* тост */}finally{setSaving(false);}}} disabled={saving||!name.trim()}>{saving?"...":"Сохранить"}</Btn>
          </div>
        </Sheet>
      )}

      {changePw&&onChangePassword&&(
        <Sheet title="Смена пароля" onClose={()=>setChangePw(false)}>
          <div className="space-y-4">
            <Field label="Текущий пароль"><Input type={showPw?"text":"password"} value={oldPw} onChange={e=>setOldPw(e.target.value)} autoFocus/></Field>
            <Field label="Новый пароль"><Input type={showPw?"text":"password"} value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Мин. 4 символа"/></Field>
            <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={showPw} onChange={e=>setShowPw(e.target.checked)}/>Показать пароли</label>
            <Btn onClick={async()=>{if(!newPw||newPw.length<4)return;setSaving(true);try{await onChangePassword(oldPw,newPw);setChangePw(false);}catch{/* тост */}finally{setSaving(false);}}} disabled={saving||!newPw||newPw.length<4}>{saving?"...":"Изменить пароль"}</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────
export function ExportScreen({ transactions,goals }: { transactions:Transaction[]; goals:Goal[] }) {
  const exportCSV=()=>{
    const rows=[["Дата","Тип","Категория","Сумма","Описание","Автор"],...transactions.sort((a,b)=>b.date.localeCompare(a.date)).map(t=>[t.date,t.type==="income"?"Доход":"Расход",t.category,t.amount,t.description,t.created_by_name])];
    const blob=new Blob(["﻿"+rows.map(r=>r.join(";")).join("\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`бюджет_${ymd()}.csv`;a.click();
  };
  const exportXlsx=async()=>{
    const XLSX=await import("xlsx");
    const wb=XLSX.utils.book_new();
    const td=[["Дата","Тип","Категория","Сумма","Описание","Автор"],...transactions.sort((a,b)=>b.date.localeCompare(a.date)).map(t=>[t.date,t.type==="income"?"Доход":"Расход",t.category,t.amount,t.description,t.created_by_name])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(td),"Операции");
    const gd=[["Цель","Нужно","Накоплено","Осталось","%"],...goals.map(g=>[g.name,g.target_amount,g.allocated,Math.max(0,g.target_amount-g.allocated),g.target_amount>0?Math.round((g.allocated/g.target_amount)*100):0])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(gd),"Цели");
    XLSX.writeFile(wb,`бюджет_${ymd()}.xlsx`);
  };
  return (
    <div className="pb-4"><div className="px-4 pb-4"><h2 className="text-xl font-bold">Экспорт данных</h2></div>
    <div className="px-4 space-y-3">
      {[{icon:"📄",l:"Экспорт CSV",s:"Google Sheets, Excel",fn:exportCSV,c:"bg-emerald-500"},{icon:"📊",l:"Экспорт Excel (.xlsx)",s:"С несколькими листами",fn:exportXlsx,c:"bg-blue-500"},{icon:"📋",l:"Печать / PDF",s:"Через диалог браузера",fn:()=>window.print(),c:"bg-purple-500"}].map(b=>(
        <button key={b.l} onClick={b.fn} className="w-full bg-card rounded-2xl border border-border px-4 py-4 flex items-center gap-4 text-left active:bg-muted/40">
          <div className={`w-11 h-11 rounded-xl ${b.c} flex items-center justify-center text-xl flex-shrink-0`}>{b.icon}</div>
          <div className="flex-1"><p className="text-sm font-bold">{b.l}</p><p className="text-xs text-muted-foreground">{b.s}</p></div>
          <Download size={16} className="text-muted-foreground"/>
        </button>
      ))}
    </div></div>
  );
}

// ── Planned / Forecast (ожидаемые доходы и траты) ─────────────────────
export function PlannedScreen({ items,categories,contractors=[],usdRate,onAdd,onEdit,onDelete,onConfirm }: {
  items:PlannedItem[]; categories:Category[]; contractors?:Contractor[]; usdRate:number;
  onAdd:(p:any)=>Promise<void>; onEdit:(id:string,p:any)=>Promise<void>;
  onDelete:(id:string)=>Promise<void>; onConfirm:(id:string)=>Promise<void>;
}) {
  const [showAdd,setShowAdd]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [type,setType]=useState<TxType>("income");
  const [title,setTitle]=useState(""); const [amount,setAmount]=useState("");
  const [currency,setCurrency]=useState<Currency>("UZS"); const [category,setCategory]=useState("");
  const [dueDate,setDueDate]=useState(ymd()); const [recurrence,setRecurrence]=useState<PlannedRecurrence>("once");
  const [note,setNote]=useState(""); const [contractorId,setContractorId]=useState<string|null>(null); const [saving,setSaving]=useState(false);
  const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null);

  const reset=()=>{setEditingId(null);setType("income");setTitle("");setAmount("");setCurrency("UZS");setCategory("");setDueDate(ymd());setRecurrence("once");setNote("");setContractorId(null);};
  const openEdit=(p:PlannedItem)=>{setEditingId(p.id);setType(p.type);setTitle(p.title);setAmount(String(p.amount));setCurrency(p.currency);setCategory(p.category);setDueDate(p.due_date);setRecurrence(p.recurrence);setNote(p.note||"");setContractorId(p.contractor_id||null);setShowAdd(true);};

  const mk=monthKey();
  const planned=items.filter(p=>p.status==="planned");
  const monthItems=planned.filter(p=>p.due_date.startsWith(mk));
  const expIncome=monthItems.filter(p=>p.type==="income").reduce((s,p)=>s+toUZS(p.amount,p.currency,usdRate),0);
  const expExpense=monthItems.filter(p=>p.type==="expense").reduce((s,p)=>s+toUZS(p.amount,p.currency,usdRate),0);
  const forecastNet=expIncome-expExpense;
  const upcoming=[...planned].sort((a,b)=>a.due_date.localeCompare(b.due_date));
  const todayStr=ymd();
  const cats=categories.filter(c=>c.type===type);
  const accent=type==="income"?"#34D399":"#FB7185";
  const fmtD=(d:string)=>new Date(d+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"short"});

  return (
    <div className="pb-24">
      <div className="px-4 pb-3 flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Планы и прогноз</h2><p className="text-xs text-muted-foreground mt-0.5">Ожидаемые доходы и траты</p></div>
        <button onClick={()=>{reset();setShowAdd(true);}} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Plus size={15}/>Добавить</button>
      </div>

      {/* Прогноз на месяц */}
      <div className="mx-4 mb-4 rounded-3xl p-5 text-white relative overflow-hidden"
        style={{background:forecastNet>=0?"linear-gradient(135deg,#6366f1,#8b5cf6)":"linear-gradient(135deg,#f59e0b,#ef4444)",boxShadow:"0 16px 48px rgba(99,102,241,0.3)"}}>
        <p className="text-xs opacity-75 uppercase tracking-widest font-semibold mb-1">Прогноз итога месяца</p>
        <p className="font-display leading-none" style={{fontSize:"clamp(1.4rem,7vw,2.2rem)",whiteSpace:"nowrap"}}>{forecastNet>=0?"+":"−"}{fmtUZS(Math.abs(forecastNet))}</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-2xl px-3 py-2" style={{background:"rgba(255,255,255,0.12)"}}><p className="text-[10px] opacity-70">Ожид. доход</p><p className="text-sm font-bold font-mono text-emerald-200">+{fmtUZS(expIncome)}</p></div>
          <div className="rounded-2xl px-3 py-2" style={{background:"rgba(255,255,255,0.12)"}}><p className="text-[10px] opacity-70">Ожид. траты</p><p className="text-sm font-bold font-mono text-rose-200">−{fmtUZS(expExpense)}</p></div>
        </div>
      </div>

      {upcoming.length===0?(
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><div className="text-5xl mb-3 opacity-30">🔮</div><p className="text-sm">Нет запланированных доходов и трат</p><button onClick={()=>{reset();setShowAdd(true);}} className="mt-3 text-sm text-primary font-bold">+ Запланировать</button></div>
      ):(
        <div className="px-4 space-y-2">
          {upcoming.map(p=>{
            const overdue=p.due_date<todayStr;
            const isInc=p.type==="income";
            return (
              <Card key={p.id} className="p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{background:isInc?"rgba(52,211,153,0.14)":"rgba(251,113,133,0.14)"}}>{isInc?"📈":"📉"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground">{p.category||"Без категории"} · {fmtD(p.due_date)}{p.recurrence==="monthly"?" · ежемес.":""}{overdue?" · просрочен":""}</p>
                  </div>
                  <span className={`text-sm font-bold font-mono flex-shrink-0 ${isInc?"text-emerald-400":"text-rose-400"}`}>{isInc?"+":"−"}{fmtMoney(p.amount,p.currency)}</span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <button onClick={()=>onConfirm(p.id)} className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5" style={{background:accent}}><CheckCircle size={13}/>Подтвердить</button>
                  <button onClick={()=>openEdit(p)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95"><Pencil size={14}/></button>
                  <button onClick={()=>setConfirmDeleteId(p.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-rose-400 active:scale-95"><Trash2 size={14}/></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {confirmDeleteId&&<ConfirmDialog title="Удалить план?" onConfirm={()=>{onDelete(confirmDeleteId);setConfirmDeleteId(null);}} onCancel={()=>setConfirmDeleteId(null)}/>}

      {showAdd&&(
        <Sheet title={editingId?"Редактировать план":"Новый план"} onClose={()=>{setShowAdd(false);reset();}}>
          <div className="space-y-4">
            <div className="flex rounded-xl p-1 bg-muted">
              {(["income","expense"] as TxType[]).map(t=>(
                <button key={t} onClick={()=>{setType(t);setCategory("");}} className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all" style={type===t?{background:t==="income"?"#10b981":"#ef4444",color:"#fff"}:{color:"var(--muted-foreground)"}}>{t==="income"?"📈 Доход":"📉 Трата"}</button>
              ))}
            </div>
            <Field label="Название"><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder={type==="income"?"Зарплата, оплата клиента...":"Аренда, поставщик..."} autoFocus/></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Сумма"><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" inputMode="decimal"/></Field>
              <Field label="Валюта">
                <Select value={currency} onChange={e=>setCurrency(e.target.value as Currency)}><option value="UZS">сум</option><option value="USD">$</option></Select>
              </Field>
            </div>
            <Field label="Категория">
              <Select value={category} onChange={e=>setCategory(e.target.value)}>
                <option value="">Без категории</option>
                {cats.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Дата"><Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></Field>
              <Field label="Повтор">
                <Select value={recurrence} onChange={e=>setRecurrence(e.target.value as PlannedRecurrence)}><option value="once">Разово</option><option value="monthly">Ежемесячно</option></Select>
              </Field>
            </div>
            {contractors.length>0&&(
              <Field label="Контрагент">
                <Select value={contractorId??""} onChange={e=>setContractorId(e.target.value||null)}>
                  <option value="">Не указан</option>
                  {contractors.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Заметка"><Input value={note} onChange={e=>setNote(e.target.value)} placeholder="Необязательно"/></Field>
            <Btn onClick={async()=>{if(!title||!amount)return;setSaving(true);try{const payload={type,title,amount:parseFloat(amount),currency,category,due_date:dueDate,recurrence,note:note||undefined,contractor_id:contractorId};if(editingId){await onEdit(editingId,payload);}else{await onAdd(payload);}setShowAdd(false);reset();}catch{/* тост показан */}finally{setSaving(false);}}} disabled={saving||!title||!amount}>{saving?"...":editingId?"Сохранить":"Запланировать"}</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── Contractors (контрагенты: клиенты/поставщики + долги) ─────────────
const CONTRACTOR_TYPE_LABEL: Record<ContractorType,string> = { client:"Клиент", supplier:"Поставщик", both:"Клиент и поставщик" };

export function ContractorsScreen({ contractors,transactions,plannedItems,usdRate,onAdd,onEdit,onDelete }: {
  contractors:Contractor[]; transactions:Transaction[]; plannedItems:PlannedItem[]; usdRate:number;
  onAdd:(c:any)=>Promise<void>; onEdit:(id:string,c:any)=>Promise<void>; onDelete:(id:string)=>Promise<void>;
}) {
  const [showForm,setShowForm]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [name,setName]=useState(""); const [type,setType]=useState<ContractorType>("client");
  const [phone,setPhone]=useState(""); const [note,setNote]=useState("");
  const [saving,setSaving]=useState(false);
  const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null);
  const [expanded,setExpanded]=useState<string|null>(null);
  const reset=()=>{setEditingId(null);setName("");setType("client");setPhone("");setNote("");};
  const openEdit=(c:Contractor)=>{setEditingId(c.id);setName(c.name);setType(c.type);setPhone(c.phone||"");setNote(c.note||"");setShowForm(true);};

  const uzs=(amount:number,cur:Currency)=>toUZS(amount,cur??"UZS",usdRate);
  const stats=(cid:string)=>{
    const txs=transactions.filter(t=>t.contractor_id===cid);
    const plans=plannedItems.filter(p=>p.contractor_id===cid&&p.status==="planned");
    const received=txs.filter(t=>t.type==="income").reduce((s,t)=>s+uzs(t.amount,t.currency),0);
    const paid=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+uzs(t.amount,t.currency),0);
    const receivable=plans.filter(p=>p.type==="income").reduce((s,p)=>s+uzs(p.amount,p.currency),0); // вам должны
    const payable=plans.filter(p=>p.type==="expense").reduce((s,p)=>s+uzs(p.amount,p.currency),0);   // вы должны
    return { received, paid, receivable, payable, turnover: received+paid, txs };
  };

  return (
    <div className="pb-24">
      <div className="px-4 pb-3 flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Контрагенты</h2><p className="text-xs text-muted-foreground mt-0.5">Клиенты, поставщики и долги</p></div>
        <button onClick={()=>{reset();setShowForm(true);}} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Plus size={15}/>Добавить</button>
      </div>

      {contractors.length===0?(
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Users size={48} className="mb-3 opacity-20"/><p className="text-sm">Нет контрагентов</p></div>
      ):(
        <div className="px-4 space-y-2.5">
          {contractors.map(c=>{
            const st=stats(c.id);
            const isOpen=expanded===c.id;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">{c.name[0]}</div>
                  <div className="flex-1 min-w-0" onClick={()=>setExpanded(isOpen?null:c.id)}>
                    <p className="text-sm font-bold truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{CONTRACTOR_TYPE_LABEL[c.type]}{c.phone?` · ${c.phone}`:""}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={()=>openEdit(c)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary active:bg-muted"><Pencil size={14}/></button>
                    <button onClick={()=>setConfirmDeleteId(c.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-400 active:bg-muted"><Trash2 size={14}/></button>
                  </div>
                </div>
                {(st.receivable>0||st.payable>0)&&(
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-xl px-3 py-2 bg-emerald-500/10"><p className="text-[10px] text-muted-foreground">Вам должны</p><p className="text-xs font-bold font-mono text-emerald-400">{fmtUZS(st.receivable)}</p></div>
                    <div className="rounded-xl px-3 py-2 bg-rose-500/10"><p className="text-[10px] text-muted-foreground">Вы должны</p><p className="text-xs font-bold font-mono text-rose-400">{fmtUZS(st.payable)}</p></div>
                  </div>
                )}
                <button onClick={()=>setExpanded(isOpen?null:c.id)} className="text-[11px] text-muted-foreground mt-2">Оборот: {fmtUZS(st.turnover)} · {st.txs.length} операц. {isOpen?"▲":"▼"}</button>
                {isOpen&&(
                  <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                    {st.txs.length===0?<p className="text-[11px] text-muted-foreground">Нет операций</p>:[...st.txs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(t=>(
                      <div key={t.id} className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground truncate flex-1">{t.category} · {new Date(t.date+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}</span><span className={`text-[11px] font-bold font-mono ${t.type==="income"?"text-emerald-400":"text-rose-400"}`}>{t.type==="income"?"+":"−"}{fmtMoney(t.amount,t.currency)}</span></div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {confirmDeleteId&&<ConfirmDialog title="Удалить контрагента?" message="Операции сохранятся, но потеряют привязку к контрагенту." onConfirm={()=>{onDelete(confirmDeleteId);setConfirmDeleteId(null);}} onCancel={()=>setConfirmDeleteId(null)}/>}

      {showForm&&(
        <Sheet title={editingId?"Редактировать контрагента":"Новый контрагент"} onClose={()=>{setShowForm(false);reset();}}>
          <div className="space-y-4">
            <Field label="Название"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="ООО Ромашка, Иван..." autoFocus/></Field>
            <Field label="Тип">
              <div className="grid grid-cols-3 gap-2">
                {(["client","supplier","both"] as ContractorType[]).map(t=><button key={t} onClick={()=>setType(t)} className={`py-2.5 rounded-xl text-[11px] font-bold border-2 transition-all ${type===t?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>{t==="client"?"Клиент":t==="supplier"?"Поставщик":"Оба"}</button>)}
              </div>
            </Field>
            <Field label="Телефон"><Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Необязательно" inputMode="tel"/></Field>
            <Field label="Заметка"><Input value={note} onChange={e=>setNote(e.target.value)} placeholder="Необязательно"/></Field>
            <Btn onClick={async()=>{if(!name)return;setSaving(true);try{const payload={name,type,phone:phone||null,note:note||null};if(editingId){await onEdit(editingId,payload);}else{await onAdd(payload);}setShowForm(false);reset();}catch{/* тост показан */}finally{setSaving(false);}}} disabled={saving||!name}>{saving?"...":editingId?"Сохранить":"Добавить"}</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── P&L (прибыль/убыток — бизнес-отчёт) ───────────────────────────────
export function PnLScreen({ transactions,usdRate }: { transactions:Transaction[]; usdRate:number }) {
  const [period,setPeriod]=useState<"month"|"quarter"|"year"|"all">("month");
  const now=new Date();
  const inPeriod=(d:string)=>{
    if(period==="all") return true;
    if(period==="month") return d.startsWith(monthKey());
    const dt=new Date(d+"T12:00:00");
    if(period==="year") return dt.getFullYear()===now.getFullYear();
    const start=new Date(now.getFullYear(),now.getMonth()-2,1); // квартал = 3 мес.
    return dt>=start;
  };
  const txs=transactions.filter(t=>inPeriod(t.date));
  const uzs=(t:Transaction)=>toUZS(t.amount,t.currency??"UZS",usdRate);
  const revenue=txs.filter(t=>t.type==="income").reduce((s,t)=>s+uzs(t),0);
  const costs=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+uzs(t),0);
  const profit=revenue-costs;
  const margin=revenue>0?Math.round(profit/revenue*100):0;
  const byCat=(type:TxType)=>{
    const m:Record<string,number>={};
    txs.filter(t=>t.type===type).forEach(t=>{m[t.category||"Без категории"]=(m[t.category||"Без категории"]??0)+uzs(t);});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  };
  const revCats=byCat("income"); const costCats=byCat("expense");
  const PERIODS=[["month","Месяц"],["quarter","Квартал"],["year","Год"],["all","Всё"]] as const;

  return (
    <div className="pb-24">
      <div className="px-4 pb-3"><h2 className="text-xl font-bold">P&L · Прибыль / Убыток</h2><p className="text-xs text-muted-foreground mt-0.5">Выручка − расходы = прибыль</p></div>

      <div className="px-4 mb-4">
        <div className="flex rounded-xl p-1 bg-muted">
          {PERIODS.map(([v,l])=><button key={v} onClick={()=>setPeriod(v)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${period===v?"bg-[var(--surface-2)] shadow-sm text-foreground":"text-muted-foreground"}`}>{l}</button>)}
        </div>
      </div>

      {/* Прибыль hero */}
      <div className="mx-4 mb-4 rounded-3xl p-5 text-white relative overflow-hidden"
        style={{background:profit>=0?"linear-gradient(135deg,#10b981,#059669)":"linear-gradient(135deg,#ef4444,#dc2626)",boxShadow:"0 16px 48px rgba(16,185,129,0.25)"}}>
        <p className="text-xs opacity-75 uppercase tracking-widest font-semibold mb-1">{profit>=0?"Чистая прибыль":"Убыток"}</p>
        <p className="font-display leading-none" style={{fontSize:"clamp(1.5rem,8vw,2.4rem)",whiteSpace:"nowrap"}}>{profit>=0?"+":"−"}{fmtUZS(Math.abs(profit))}</p>
        <div className="flex items-center gap-2 mt-2"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20">Маржа {margin}%</span></div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-2xl px-3 py-2" style={{background:"rgba(255,255,255,0.14)"}}><p className="text-[10px] opacity-70">Выручка</p><p className="text-sm font-bold font-mono">{fmtUZS(revenue)}</p></div>
          <div className="rounded-2xl px-3 py-2" style={{background:"rgba(255,255,255,0.14)"}}><p className="text-[10px] opacity-70">Расходы</p><p className="text-sm font-bold font-mono">{fmtUZS(costs)}</p></div>
        </div>
      </div>

      {txs.length===0&&<div className="text-center py-12 text-muted-foreground text-sm">Нет операций за период</div>}

      {revCats.length>0&&(
        <Card className="mx-4 mb-4 p-4">
          <SectionHeader title="Выручка по статьям"/>
          <div className="space-y-3">
            {revCats.map(([cat,val])=>{const pct=revenue>0?Math.round(val/revenue*100):0;return(
              <div key={cat}><div className="flex justify-between mb-1"><span className="text-xs font-semibold truncate flex-1">{cat}</span><span className="text-xs font-bold font-mono ml-2 text-emerald-400">{fmtUZS(val)} · {pct}%</span></div><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-400" style={{width:`${pct}%`}}/></div></div>
            );})}
          </div>
        </Card>
      )}

      {costCats.length>0&&(
        <Card className="mx-4 p-4">
          <SectionHeader title="Расходы по статьям"/>
          <div className="space-y-3">
            {costCats.map(([cat,val])=>{const pct=costs>0?Math.round(val/costs*100):0;return(
              <div key={cat}><div className="flex justify-between mb-1"><span className="text-xs font-semibold truncate flex-1">{cat}</span><span className="text-xs font-bold font-mono ml-2 text-rose-400">{fmtUZS(val)} · {pct}%</span></div><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-rose-400" style={{width:`${pct}%`}}/></div></div>
            );})}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Spaces (пространства: личное и бизнесы) ───────────────────────────
const SPACE_ICONS = ["🏠","💼","🏢","🛒","🍔","💻","📦","🚗","🏭","💰","🎨","📊"];
const SPACE_COLORS = ["#6366f1","#10b981","#f59e0b","#ec4899","#06b6d4","#8b5cf6","#ef4444","#14b8a6"];
const SPACE_TYPE_LABEL: Record<SpaceType,string> = { personal:"Личное", family:"Семья", business:"Бизнес" };

export function SpacesScreen({ spaces,activeSpaceId,onSwitch,onAdd,onEdit,onDelete }: {
  spaces:Space[]; activeSpaceId:string;
  onSwitch:(id:string)=>void; onAdd:(s:any)=>Promise<void>;
  onEdit:(id:string,s:any)=>Promise<void>; onDelete:(id:string)=>Promise<void>;
}) {
  const [showForm,setShowForm]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [name,setName]=useState(""); const [type,setType]=useState<SpaceType>("business");
  const [icon,setIcon]=useState("💼"); const [color,setColor]=useState("#6366f1");
  const [saving,setSaving]=useState(false);
  const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null);
  const reset=()=>{setEditingId(null);setName("");setType("business");setIcon("💼");setColor("#6366f1");};
  const openEdit=(s:Space)=>{setEditingId(s.id);setName(s.name);setType(s.type);setIcon(s.icon);setColor(s.color);setShowForm(true);};
  const activeId=activeSpaceId||spaces[0]?.id;

  return (
    <div className="pb-24">
      <div className="px-4 pb-3 flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Пространства</h2><p className="text-xs text-muted-foreground mt-0.5">Личное и бизнесы — у каждого свой учёт</p></div>
        <button onClick={()=>{reset();setShowForm(true);}} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Plus size={15}/>Бизнес</button>
      </div>

      <div className="px-4 space-y-2.5">
        {spaces.map(s=>{
          const isActive=s.id===activeId;
          const isDefault=s.type==="family"||s.type==="personal";
          return (
            <Card key={s.id} className={`p-4 ${isActive?"ring-2":""}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{background:s.color+"22"}}>{s.icon}</div>
                <div className="flex-1 min-w-0" onClick={()=>onSwitch(s.id)}>
                  <div className="flex items-center gap-2"><p className="text-sm font-bold truncate">{s.name}</p>{isActive&&<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{background:s.color}}>активно</span>}</div>
                  <p className="text-[11px] text-muted-foreground">{SPACE_TYPE_LABEL[s.type]}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!isActive&&<button onClick={()=>onSwitch(s.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-white" style={{background:s.color}}>Открыть</button>}
                  <button onClick={()=>openEdit(s)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary active:bg-muted"><Pencil size={14}/></button>
                  {!isDefault&&<button onClick={()=>setConfirmDeleteId(s.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-400 active:bg-muted"><Trash2 size={14}/></button>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {confirmDeleteId&&<ConfirmDialog title="Удалить пространство?" message="Все операции, категории и планы этого бизнеса будут удалены безвозвратно." onConfirm={()=>{onDelete(confirmDeleteId);setConfirmDeleteId(null);}} onCancel={()=>setConfirmDeleteId(null)}/>}

      {showForm&&(
        <Sheet title={editingId?"Редактировать пространство":"Новый бизнес"} onClose={()=>{setShowForm(false);reset();}}>
          <div className="space-y-4">
            <Field label="Название"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Кофейня, Магазин, ИП..." autoFocus/></Field>
            {!editingId&&(
              <Field label="Тип">
                <div className="grid grid-cols-2 gap-2">
                  {(["business","personal"] as SpaceType[]).map(t=><button key={t} onClick={()=>setType(t)} className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${type===t?"border-primary bg-primary/5 text-primary":"border-border text-muted-foreground"}`}>{SPACE_TYPE_LABEL[t]}</button>)}
                </div>
              </Field>
            )}
            <Field label="Иконка">
              <div className="grid grid-cols-6 gap-2">
                {SPACE_ICONS.map(em=><button key={em} onClick={()=>setIcon(em)} className={`aspect-square rounded-xl text-lg flex items-center justify-center border-2 ${icon===em?"border-primary":"border-border"}`} style={icon===em?{background:color+"22"}:undefined}>{em}</button>)}
              </div>
            </Field>
            <Field label="Цвет">
              <div className="flex gap-2 flex-wrap">
                {SPACE_COLORS.map(c=><button key={c} onClick={()=>setColor(c)} className={`w-9 h-9 rounded-xl border-2 ${color===c?"border-foreground":"border-transparent"}`} style={{background:c}}/>)}
              </div>
            </Field>
            <Btn onClick={async()=>{if(!name)return;setSaving(true);try{const payload={name,type,icon,color};if(editingId){await onEdit(editingId,payload);}else{await onAdd(payload);}setShowForm(false);reset();}catch{/* тост показан */}finally{setSaving(false);}}} disabled={saving||!name}>{saving?"...":editingId?"Сохранить":"Создать бизнес"}</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}
