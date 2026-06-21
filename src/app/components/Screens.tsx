import { useState, useEffect } from "react";
import {
  PiggyBank, Target, CheckCircle, Trash2, Plus, Clock, Calendar,
  BarChart2, Repeat, Tag, Bell, Users, Crown, LogOut, Shield,
  ChevronLeft, ChevronRight, AlertTriangle, AlertCircle, Wallet,
  Download, Copy, UserPlus, Sun, Moon,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import * as XLSX from "xlsx";
import { Card, StatCard, SectionHeader, Sheet, Field, Input, Select, Btn, Toggle } from "./ui";
import { usePush } from "../../lib/usePush";
import type { Transaction, Category, Goal, Budget, RecurringPayment, AppSettings, AppUser, Notification, Currency, TxType, Frequency, Priority } from "../../lib/api";

const MONTHS_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
const MONTHS_RU = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316","#84cc16"];
const FREQ_LABELS: Record<Frequency,string> = { daily:"Ежедневно", weekly:"Еженедельно", monthly:"Ежемесячно", yearly:"Ежегодно" };
const PRIORITY_CONFIG: Record<Priority,{label:string;color:string;bg:string;dot:string}> = {
  high:  {label:"Высокий",color:"text-red-600",bg:"bg-red-50 border-red-200",dot:"bg-red-500"},
  medium:{label:"Средний",color:"text-amber-600",bg:"bg-amber-50 border-amber-200",dot:"bg-amber-500"},
  low:   {label:"Низкий",color:"text-blue-600",bg:"bg-blue-50 border-blue-200",dot:"bg-blue-400"},
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
  return d.toISOString().split("T")[0];
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
  return (
    <div className="pb-4">
      <div className="px-4 pb-4"><h2 className="text-xl font-bold">Накопления</h2><p className="text-xs text-muted-foreground mt-0.5">Рассчитываются из доходов и расходов</p></div>
      <div className={`mx-4 mb-4 rounded-2xl p-5 text-white ${netSavings>=0?"bg-primary":"bg-red-600"}`}>
        <p className="text-sm opacity-70 mb-1">Накоплено всего</p>
        <p className="text-3xl font-bold font-mono">{fmtUZS(netSavings)}</p>
        {netUSD!==0&&<p className="text-xs opacity-60 mt-1">Из них в $: {fmtUSD(netUSD)}</p>}
        <div className="flex gap-6 mt-4">
          <div><p className="text-xs opacity-60">Всего доходов</p><p className="text-sm font-bold font-mono text-emerald-300">+{fmtUZS(totalIncome)}</p></div>
          <div><p className="text-xs opacity-60">Всего расходов</p><p className="text-sm font-bold font-mono text-red-300">−{fmtUZS(totalExpense)}</p></div>
        </div>
      </div>
      <div className="px-4 mb-4">
        <Card className="p-4">
          <p className="text-sm font-bold mb-4">Помесячно</p>
          <div className="flex items-end gap-1 h-20 mb-2">
            {months.map((m,i)=>(
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex items-end gap-px" style={{height:"68px"}}>
                  <div className="flex-1 rounded-t-sm bg-emerald-400" style={{height:`${(m.inc/maxBar)*100}%`,minHeight:m.inc>0?"2px":"0"}}/>
                  <div className="flex-1 rounded-t-sm bg-red-400" style={{height:`${(m.exp/maxBar)*100}%`,minHeight:m.exp>0?"2px":"0"}}/>
                </div>
                <span className="text-[8px] text-muted-foreground">{MONTHS_SHORT[parseInt(m.mk.split("-")[1])-1]}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 mt-3">
            {[...months].reverse().slice(0,3).map((m,i)=>(
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground capitalize">{m.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-emerald-600 font-mono">+{fmtUZS(m.inc)}</span>
                  <span className="text-xs text-red-500 font-mono">−{fmtUZS(m.exp)}</span>
                  <span className={`text-xs font-bold font-mono ${m.net>=0?"text-blue-600":"text-red-500"}`}>{m.net>=0?"+":""}{fmtUZS(m.net)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Goals ─────────────────────────────────────────────────────────────
export function GoalsScreen({ goals,transactions,onAdd,onDelete }: {
  goals:Goal[]; transactions:Transaction[];
  onAdd:(g:any)=>Promise<void>; onDelete:(id:string)=>Promise<void>;
}) {
  const [showAdd,setShowAdd]=useState(false);
  const [name,setName]=useState(""); const [target,setTarget]=useState("");
  const [deadline,setDeadline]=useState(""); const [note,setNote]=useState("");
  const [priority,setPriority]=useState<Priority>("medium"); const [saving,setSaving]=useState(false);
  const now=new Date();
  const months3=Array.from({length:3},(_,i)=>monthKey(new Date(now.getFullYear(),now.getMonth()-2+i,1)));
  const avgMonthlySavings=months3.reduce((s,mk)=>{
    const txs=transactions.filter(t=>t.date.startsWith(mk));
    const inc=txs.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
    const exp=txs.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
    return s+(inc-exp);
  },0)/3;
  const sorted=[...goals].sort((a,b)=>({high:0,medium:1,low:2}[a.priority])-({high:0,medium:1,low:2}[b.priority]));
  const totalTarget=goals.reduce((s,g)=>s+g.target_amount,0);
  const totalAlloc=goals.reduce((s,g)=>s+g.allocated,0);
  return (
    <div className="pb-24">
      <div className="px-4 pb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Финансовые цели</h2>
        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Plus size={15}/>Добавить</button>
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
                  <button onClick={()=>onDelete(g.id)} className="text-muted-foreground hover:text-red-500 ml-2 p-1"><Trash2 size={14}/></button>
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${done?"bg-emerald-50 text-emerald-600":"bg-blue-50 text-blue-600"}`}>{pct}%</span>
                    {daysLeft!==null&&<span className={`text-xs font-semibold ${daysLeft<0?"text-red-500":daysLeft<30?"text-orange-500":"text-muted-foreground"}`}>{daysLeft<0?`просрочено ${Math.abs(daysLeft)}д`:daysLeft===0?"сегодня!":`${daysLeft} дн.`}</span>}
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${done?"bg-emerald-500":g.priority==="high"?"bg-red-500":g.priority==="low"?"bg-blue-400":"bg-primary"}`} style={{width:`${pct}%`}}/></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-muted/60 rounded-xl py-2"><p className="text-[10px] text-muted-foreground mb-0.5">Цель</p><p className="text-xs font-bold font-mono">{fmtUZS(g.target_amount)}</p></div>
                  <div className="bg-emerald-50 rounded-xl py-2"><p className="text-[10px] text-emerald-600 mb-0.5">Накоплено</p><p className="text-xs font-bold font-mono text-emerald-600">{fmtUZS(g.allocated)}</p></div>
                  <div className={`rounded-xl py-2 ${done?"bg-emerald-50":"bg-red-50"}`}><p className={`text-[10px] mb-0.5 ${done?"text-emerald-600":"text-red-400"}`}>Осталось</p><p className={`text-xs font-bold font-mono ${done?"text-emerald-600":"text-red-500"}`}>{done?"✓":fmtUZS(remaining)}</p></div>
                </div>
                {!done&&etaMonths!==null&&(
                  <div className={`rounded-xl px-3 py-2 flex items-center gap-2 mb-2 ${willMissDeadline?"bg-red-50 border border-red-200":"bg-blue-50"}`}>
                    <Clock size={13} className={willMissDeadline?"text-red-500":"text-blue-500"}/>
                    <p className={`text-xs ${willMissDeadline?"text-red-700":"text-blue-700"}`}>
                      {etaMonths===0?"Цель достижима в этом месяце!":willMissDeadline?`⚠ Цель через ${etaMonths} мес. — позже дедлайна`:`При текущем темпе: через ${etaMonths} мес. (${etaDate?.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})})`}
                    </p>
                  </div>
                )}
                {monthlyNeeded&&!done&&(
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2 mb-2">
                    <Calendar size={13} className="text-amber-500 flex-shrink-0"/>
                    <p className="text-xs text-amber-700">Нужно откладывать <strong>{fmtUZS(monthlyNeeded)}/мес.</strong></p>
                  </div>
                )}
                {g.note&&<p className="text-xs text-muted-foreground italic">📝 {g.note}</p>}
              </Card>
            );
          })}
        </div>
      )}
      {showAdd&&(
        <Sheet title="Новая цель" onClose={()=>setShowAdd(false)}>
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
            <Btn onClick={async()=>{if(!name||!target)return;setSaving(true);await onAdd({name,target_amount:parseFloat(target),deadline:deadline||undefined,note:note||undefined,priority});setSaving(false);setShowAdd(false);setName("");setTarget("");setDeadline("");setNote("");setPriority("medium");}} disabled={saving||!name||!target}>{saving?"...":"Создать цель"}</Btn>
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
  const avgCheck=transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0)/Math.max(1,transactions.filter(t=>t.type==="expense").length);
  const expByCat:Record<string,number>={};
  transactions.filter(t=>t.type==="expense").forEach(t=>{expByCat[t.category]=(expByCat[t.category]??0)+t.amount;});
  const topExpenses=Object.entries(expByCat).map(([n,v])=>({name:n,value:v})).sort((a,b)=>b.value-a.value).slice(0,6);
  const expByUser:Record<string,number>={};
  transactions.filter(t=>t.type==="expense").forEach(t=>{expByUser[t.created_by_name]=(expByUser[t.created_by_name]??0)+t.amount;});
  const catFreq:Record<string,number>={};
  transactions.forEach(t=>{catFreq[t.category]=(catFreq[t.category]??0)+1;});
  const topFreq=Object.entries(catFreq).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return (
    <div className="pb-4 space-y-4">
      <div className="px-4"><h2 className="text-xl font-bold">Аналитика</h2></div>
      <div className="px-4 grid grid-cols-2 gap-3">
        <StatCard label="Всего доходов" value={fmtUZS(totalIncome)} color="text-emerald-600"/>
        <StatCard label="Всего расходов" value={fmtUZS(totalExpense)} color="text-red-500"/>
        <StatCard label="Средний чек" value={fmtUZS(avgCheck)} sub="расход"/>
        <StatCard label="Накоплено" value={fmtUZS(totalIncome-totalExpense)} color="text-blue-600"/>
      </div>
      <Card className="p-4 mx-4">
        <SectionHeader title="Динамика доходов и расходов"/>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={monthlyData} barSize={9} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)"/>
            <XAxis dataKey="month" tick={{fontSize:10,fill:"currentColor",opacity:0.5}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:9,fill:"currentColor",opacity:0.5}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${Math.round(v/1000)}к`:String(v)}/>
            <Tooltip formatter={(v:number)=>fmtUZS(v)} contentStyle={{borderRadius:12,fontSize:12}}/>
            <Bar dataKey="an_inc" name="Доходы" fill="#10b981" radius={[4,4,0,0]}/>
            <Bar dataKey="an_exp" name="Расходы" fill="#ef4444" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
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
                <span className="text-sm font-bold font-mono text-red-500">−{fmtUZS(val)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Budgets ───────────────────────────────────────────────────────────
export function BudgetsScreen({ budgets,transactions,categories,onAdd,onDelete }: {
  budgets:Budget[]; transactions:Transaction[]; categories:Category[];
  onAdd:(b:any)=>Promise<void>; onDelete:(id:string)=>Promise<void>;
}) {
  const [showAdd,setShowAdd]=useState(false);
  const [cat,setCat]=useState(""); const [limit,setLimit]=useState(""); const [saving,setSaving]=useState(false);
  const mk=monthKey();
  const expCats=categories.filter(c=>c.type==="expense");
  const getSpent=(category:string)=>transactions.filter(t=>t.type==="expense"&&t.category===category&&t.date.startsWith(mk)).reduce((s,t)=>s+t.amount,0);
  const monthBudgets=budgets.filter(b=>b.month===mk);
  return (
    <div className="pb-4">
      <div className="px-4 pb-4 flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Бюджеты</h2><p className="text-xs text-muted-foreground">Лимиты на {MONTHS_RU[parseInt(mk.split("-")[1])-1]}</p></div>
        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Plus size={15}/>Добавить</button>
      </div>
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
                    {over&&<span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={9}/>Превышен</span>}
                    <button onClick={()=>onDelete(b.id)} className="text-muted-foreground hover:text-red-500 p-1"><Trash2 size={13}/></button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between mb-1.5">
                    <span className={`text-xs font-bold ${over?"text-red-500":"text-foreground"}`}>{pct}%</span>
                    <span className={`text-xs font-mono ${over?"text-red-500":"text-muted-foreground"}`}>{fmtUZS(spent)} / {fmtUZS(b.month_limit)}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${over?"bg-red-500":pct>80?"bg-amber-500":"bg-emerald-500"}`} style={{width:`${pct}%`}}/></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-xl py-2"><p className="text-[10px] text-muted-foreground mb-0.5">План</p><p className="text-xs font-bold font-mono">{fmtUZS(b.month_limit)}</p></div>
                  <div className={`rounded-xl py-2 ${over?"bg-red-50":"bg-emerald-50"}`}><p className={`text-[10px] mb-0.5 ${over?"text-red-500":"text-emerald-600"}`}>Факт</p><p className={`text-xs font-bold font-mono ${over?"text-red-500":"text-emerald-600"}`}>{fmtUZS(spent)}</p></div>
                  <div className={`rounded-xl py-2 ${over?"bg-red-50":"bg-blue-50"}`}><p className={`text-[10px] mb-0.5 ${over?"text-red-500":"text-blue-600"}`}>Остаток</p><p className={`text-xs font-bold font-mono ${over?"text-red-500":"text-blue-600"}`}>{fmtUZS(Math.abs(b.month_limit-spent))}{over?" ↑":""}</p></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {showAdd&&(
        <Sheet title="Новый бюджет" onClose={()=>setShowAdd(false)}>
          <div className="space-y-4">
            <Field label="Категория расходов">
              <Select value={cat} onChange={e=>setCat(e.target.value)}>
                <option value="">Выберите</option>
                {expCats.filter(c=>!monthBudgets.some(b=>b.category===c.name)).map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Лимит на месяц"><Input type="number" value={limit} onChange={e=>setLimit(e.target.value)} placeholder="0" inputMode="decimal" autoFocus/></Field>
            <Btn onClick={async()=>{if(!cat||!limit)return;setSaving(true);await onAdd({category:cat,month_limit:parseFloat(limit),month:mk});setSaving(false);setShowAdd(false);setCat("");setLimit("");}} disabled={saving||!cat||!limit}>{saving?"...":"Создать бюджет"}</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── Recurring ─────────────────────────────────────────────────────────
export function RecurringScreen({ payments,categories,userName,onAdd,onDelete,onMarkPaid }: {
  payments:RecurringPayment[]; categories:Category[]; userName:string;
  onAdd:(p:any)=>Promise<void>; onDelete:(id:string)=>Promise<void>; onMarkPaid:(id:string)=>Promise<void>;
}) {
  const [showAdd,setShowAdd]=useState(false);
  const [name,setName]=useState(""); const [cat,setCat]=useState(""); const [amount,setAmount]=useState("");
  const [freq,setFreq]=useState<Frequency>("monthly"); const [nextDate,setNextDate]=useState(new Date().toISOString().split("T")[0]);
  const [saving,setSaving]=useState(false);
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
        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Plus size={15}/>Добавить</button>
      </div>
      {sorted.length===0?(
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Repeat size={48} className="mb-3 opacity-20"/><p className="text-sm">Нет регулярных платежей</p></div>
      ):(
        <div className="px-4 space-y-3">
          {sorted.map(p=>{
            const days=daysUntil(p.next_date);
            const urgent=days<=3;
            return (
              <Card key={p.id} className={`p-4 ${urgent?"border-red-200":""}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${urgent?"bg-red-50":"bg-muted"}`}>
                    <Repeat size={18} className={urgent?"text-red-500":"text-muted-foreground"}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div><p className="text-sm font-bold">{p.name}</p><p className="text-xs text-muted-foreground">{p.category} · {FREQ_LABELS[p.frequency]}</p></div>
                      <p className="text-base font-bold font-mono text-red-500 flex-shrink-0">−{fmtUZS(p.amount)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs font-semibold ${urgent?"text-red-500":days<=7?"text-amber-500":"text-muted-foreground"}`}>
                        {days<0?"Просрочен":days===0?"Сегодня!":days===1?"Завтра":`Через ${days} дн.`} · {new Date(p.next_date).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={()=>onMarkPaid(p.id)} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">✓ Оплачено</button>
                        <button onClick={()=>onDelete(p.id)} className="text-muted-foreground hover:text-red-500 p-1"><Trash2 size={13}/></button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {showAdd&&(
        <Sheet title="Новый регулярный платёж" onClose={()=>setShowAdd(false)}>
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
            <Btn onClick={async()=>{if(!name||!amount)return;setSaving(true);await onAdd({name,category:cat||"Прочее",amount:parseFloat(amount),frequency:freq,next_date:nextDate});setSaving(false);setShowAdd(false);setName("");setCat("");setAmount("");setFreq("monthly");}} disabled={saving||!name||!amount}>{saving?"...":"Добавить"}</Btn>
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
                  <span className={`text-xs font-bold font-mono ${t.type==="income"?"text-emerald-600":"text-red-500"}`}>{t.type==="income"?"+":"−"}{fmtMoney(t.amount,t.currency??"UZS")}</span>
                </div>
              ))}
              {selRecur.map(p=>(
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0 bg-amber-500"/>
                  <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{p.name}</p><p className="text-[10px] text-muted-foreground">Регулярный · {FREQ_LABELS[p.frequency]}</p></div>
                  <span className="text-xs font-bold font-mono text-amber-600">−{fmtUZS(p.amount)}</span>
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
  const income=txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const balance=income-expense;
  const expByCat:Record<string,number>={};
  txs.filter(t=>t.type==="expense").forEach(t=>{expByCat[t.category]=(expByCat[t.category]??0)+t.amount;});
  const topCats=Object.entries(expByCat).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const worstCat=topCats[0]; const bestCat=topCats[topCats.length-1];
  const exportExcel=()=>{
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
              {worstCat&&<Card className="p-3 border-red-100"><p className="text-[10px] text-red-500 font-bold uppercase mb-1">Больший расход</p><p className="text-xs font-bold truncate">{worstCat[0]}</p><p className="text-sm font-bold font-mono text-red-500">{fmtUZS(worstCat[1])}</p></Card>}
              {bestCat&&bestCat!==worstCat&&<Card className="p-3 border-emerald-100"><p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Меньший расход</p><p className="text-xs font-bold truncate">{bestCat[0]}</p><p className="text-sm font-bold font-mono text-emerald-600">{fmtUZS(bestCat[1])}</p></Card>}
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
        <div className="mt-3"><div className="h-2 bg-white/20 rounded-full overflow-hidden"><div className={`h-full rounded-full ${isOver?"bg-red-400":"bg-white"}`} style={{width:`${totalSavings>0?Math.min(100,Math.round(total/totalSavings*100)):0}%`}}/></div>
        <div className="flex justify-between mt-1.5"><p className="text-xs opacity-60">из {fmtUZS(totalSavings)}</p><p className={`text-xs font-semibold ${isOver?"text-red-300":"opacity-70"}`}>{isOver?`⚠ Превышение на ${fmtUZS(Math.abs(unalloc))}`:`Свободно: ${fmtUZS(unalloc)}`}</p></div></div>
      </div>
      {isOver&&<div className="mx-4 mb-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3"><AlertCircle size={16}/><p className="text-sm font-semibold">Распределено больше накоплений!</p></div>}
      <div className="px-4 space-y-3">
        {[...goals].sort((a,b)=>({high:0,medium:1,low:2}[a.priority])-({high:0,medium:1,low:2}[b.priority])).map(g=>{
          const val=parseFloat(amounts[g.id]||"0")||0;
          const gpct=g.target_amount>0?Math.min(100,Math.round((val/g.target_amount)*100)):0;
          return (
            <Card key={g.id} className="p-4">
              <div className="flex justify-between items-start mb-1"><p className="text-sm font-semibold">{g.name}</p>{saved===g.id&&<span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle size={10}/>OK</span>}</div>
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
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.type==="income"?"bg-emerald-50":"bg-red-50"}`}><Tag size={13} className={c.type==="income"?"text-emerald-600":"text-red-500"}/></div>
        <span className="text-sm font-medium flex-1">{c.name}</span>
        {c.is_default?<span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">по умолчанию</span>:<button onClick={()=>onDelete(c.id)} className="text-muted-foreground hover:text-red-500 p-1"><Trash2 size={13}/></button>}
      </div>
    ))}</div></div>
  );
  return (
    <div className="pb-4">
      <div className="px-4 pb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Справочник</h2><button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Plus size={15}/>Добавить</button></div>
      <div className="px-4 space-y-5"><Sec title="Доходы" items={categories.filter(c=>c.type==="income")} color="text-emerald-600"/><Sec title="Расходы" items={categories.filter(c=>c.type==="expense")} color="text-red-500"/></div>
      {showAdd&&<Sheet title="Новая категория" onClose={()=>setShowAdd(false)}>
        <div className="space-y-4">
          <div className="flex bg-muted rounded-xl p-1">{(["expense","income"] as TxType[]).map(t=><button key={t} onClick={()=>setType(t)} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${type===t?"bg-white shadow-sm text-foreground":"text-muted-foreground"}`}>{t==="expense"?"Расход":"Доход"}</button>)}</div>
          <Field label="Название"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Категория..." autoFocus/></Field>
          <Btn onClick={async()=>{if(!name)return;setSaving(true);await onAdd(name,type);setSaving(false);setShowAdd(false);setName("");}} disabled={saving||!name}>{saving?"...":"Добавить"}</Btn>
        </div>
      </Sheet>}
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────────────
export function NotificationsScreen({ notifications,onMarkRead,onMarkAllRead }: {
  notifications:Notification[]; onMarkRead:(id:string)=>void; onMarkAllRead:()=>void;
}) {
  const icons:Record<string,string>={transaction:"💳",goal:"🎯",savings:"💰",member:"👋",system:"ℹ️"};
  const unread=notifications.filter(n=>!n.read).length;
  return (
    <div className="pb-4">
      <div className="px-4 pb-4 flex items-center justify-between"><div className="flex items-center gap-2"><h2 className="text-xl font-bold">Уведомления</h2>{unread>0&&<span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread}</span>}</div>{unread>0&&<button onClick={onMarkAllRead} className="text-xs text-primary font-bold">Прочитать все</button>}</div>
      {notifications.length===0?<div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><Bell size={48} className="mb-3 opacity-20"/><p className="text-sm">Нет уведомлений</p></div>:
      <div className="px-4 space-y-2">{notifications.map(n=>(
        <button key={n.id} onClick={()=>!n.read&&onMarkRead(n.id)} className={`w-full text-left rounded-2xl border p-4 flex items-start gap-3 ${n.read?"bg-card border-border":"bg-blue-50 border-blue-100"}`}>
          <span className="text-xl flex-shrink-0">{icons[n.type]||"ℹ️"}</span>
          <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{n.title}</p><p className="text-xs text-muted-foreground mt-0.5">{n.body}</p><p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p></div>
          {!n.read&&<div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"/>}
        </button>
      ))}</div>}
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
              <div className="flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold">{m.name}</p>{m.role==="owner"&&<Crown size={12} className="text-amber-500"/>}</div><p className="text-xs text-muted-foreground">{m.role==="owner"?"Владелец":"Участник"}{m.id===currentUser.id?" (вы)":""}</p></div>
            </div>
          ))}</div>
        </Card>
      </div>
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────────────
export function ProfileScreen({ userProfile,onLogout }: { userProfile:AppUser; onLogout:()=>void }) {
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
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Shield size={15} className="text-primary"/><p className="text-sm font-bold">Безопасность</p></div>
          {["JWT-авторизация","Изоляция данных по семье","История изменений сохраняется"].map(i=><div key={i} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5"><CheckCircle size={11} className="text-emerald-500"/>{i}</div>)}
        </Card>
        <Btn variant="danger" onClick={onLogout}><div className="flex items-center justify-center gap-2"><LogOut size={16}/>Выйти из аккаунта</div></Btn>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────
export function ExportScreen({ transactions,goals }: { transactions:Transaction[]; goals:Goal[] }) {
  const exportCSV=()=>{
    const rows=[["Дата","Тип","Категория","Сумма","Описание","Автор"],...transactions.sort((a,b)=>b.date.localeCompare(a.date)).map(t=>[t.date,t.type==="income"?"Доход":"Расход",t.category,t.amount,t.description,t.created_by_name])];
    const blob=new Blob(["﻿"+rows.map(r=>r.join(";")).join("\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`бюджет_${new Date().toISOString().split("T")[0]}.csv`;a.click();
  };
  const exportXlsx=()=>{
    const wb=XLSX.utils.book_new();
    const td=[["Дата","Тип","Категория","Сумма","Описание","Автор"],...transactions.sort((a,b)=>b.date.localeCompare(a.date)).map(t=>[t.date,t.type==="income"?"Доход":"Расход",t.category,t.amount,t.description,t.created_by_name])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(td),"Операции");
    const gd=[["Цель","Нужно","Накоплено","Осталось","%"],...goals.map(g=>[g.name,g.target_amount,g.allocated,Math.max(0,g.target_amount-g.allocated),g.target_amount>0?Math.round((g.allocated/g.target_amount)*100):0])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(gd),"Цели");
    XLSX.writeFile(wb,`бюджет_${new Date().toISOString().split("T")[0]}.xlsx`);
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
