import { useState, useEffect } from "react";
import { Home, FileText, PiggyBank, Target, User, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { api } from "../lib/api";
import type { AppUser, Transaction, Category, Goal, Budget, RecurringPayment, AppSettings, Notification, TxType, Frequency } from "../lib/api";
import { Toast } from "./components/ui";
import { LoginScreen } from "./components/Login";
import { DashboardScreen } from "./components/Dashboard";
import { JournalScreen } from "./components/Journal";
import {
  SavingsScreen, GoalsScreen, AnalyticsScreen, BudgetsScreen, RecurringScreen,
  CalendarScreen, MonthlyReportScreen, SettingsScreen, AllocationScreen,
  CategoriesScreen, NotificationsScreen, FamilyScreen, ProfileScreen, ExportScreen,
} from "./components/Screens";

type TabType = "dashboard" | "journal" | "savings" | "goals" | "more";
type MoreSection = "profile"|"family"|"analytics"|"budgets"|"recurring"|"calendar"|"report"|"notifications"|"allocation"|"categories"|"export"|"settings";

const fmt = (n:number) => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(n);
const fmtUZS = (n:number) => `${fmt(n)} сум`;
const toUZS = (amount:number, cur:string, rate:number) => cur==="USD" ? amount*rate : amount;
const nextDateForFrequency = (freq:Frequency, from:Date=new Date()): string => {
  const d=new Date(from);
  if(freq==="daily") d.setDate(d.getDate()+1);
  else if(freq==="weekly") d.setDate(d.getDate()+7);
  else if(freq==="monthly") d.setMonth(d.getMonth()+1);
  else d.setFullYear(d.getFullYear()+1);
  return d.toISOString().split("T")[0];
};

function BottomNav({ active,onChange,unreadNotif,profileName }: { active:TabType; onChange:(t:TabType)=>void; unreadNotif:number; profileName:string }) {
  const tabs: {id:TabType;label:string;icon:React.ReactNode}[] = [
    {id:"dashboard",label:"Главная",icon:<Home size={21}/>},
    {id:"journal",label:"Журнал",icon:<FileText size={21}/>},
    {id:"savings",label:"Копилка",icon:<PiggyBank size={21}/>},
    {id:"goals",label:"Цели",icon:<Target size={21}/>},
    {id:"more",label:profileName.split(" ")[0],icon:<User size={21}/>},
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 px-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)', paddingTop: '8px' }}>
      <div className="glass rounded-2xl flex shadow-lg" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--glass-border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-all relative rounded-2xl ${active === t.id ? 'text-primary' : 'text-muted-foreground'}`}>
            {active === t.id && (
              <div className="absolute inset-1 rounded-xl opacity-10 bg-primary" />
            )}
            <div className="relative z-10">
              {t.icon}
              {t.id === 'more' && unreadNotif > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 py-px rounded-full min-w-[14px] text-center">
                  {unreadNotif}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold z-10">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function MoreScreen(props: {
  userProfile:AppUser; familyMembers:AppUser[];
  goals:Goal[]; categories:Category[]; settings:AppSettings; notifications:Notification[];
  transactions:Transaction[]; usdRate:number; budgets:Budget[]; recurringPayments:RecurringPayment[];
  totalSavings:number;
  onAllocationUpdate:(gid:string,amt:number)=>Promise<void>;
  onCategoryAdd:(n:string,t:TxType)=>Promise<void>; onCategoryDelete:(id:string)=>Promise<void>;
  onSettingsUpdate:(s:Partial<AppSettings>)=>Promise<void>;
  onMarkNotifRead:(id:string)=>void; onMarkAllNotifRead:()=>void;
  onBudgetAdd:(b:any)=>Promise<void>; onBudgetDelete:(id:string)=>Promise<void>;
  onRecurringAdd:(p:any)=>Promise<void>; onRecurringDelete:(id:string)=>Promise<void>; onRecurringMarkPaid:(id:string)=>Promise<void>;
  darkMode:boolean; onToggleDark:()=>void; onLogout:()=>void; defaultSection?:string;
}) {
  const [section,setSection]=useState<MoreSection|null>((props.defaultSection as MoreSection)||null);
  const unread=props.notifications.filter(n=>!n.read).length;
  useEffect(()=>{ if(props.defaultSection) setSection(props.defaultSection as MoreSection); },[props.defaultSection]);

  const Back=({title}:{title:string})=>(
    <div className="flex items-center gap-3 px-4 pb-4">
      <button onClick={()=>setSection(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted"><ChevronLeft size={18}/></button>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );

  if(section==="profile") return <div><Back title="Профиль"/><ProfileScreen userProfile={props.userProfile} onLogout={props.onLogout}/></div>;
  if(section==="family") return <div><Back title="Семья"/><FamilyScreen members={props.familyMembers} currentUser={props.userProfile}/></div>;
  if(section==="analytics") return <div><Back title="Аналитика"/><AnalyticsScreen transactions={props.transactions} usdRate={props.usdRate}/></div>;
  if(section==="budgets") return <div><Back title="Бюджеты"/><BudgetsScreen budgets={props.budgets} transactions={props.transactions} categories={props.categories} onAdd={props.onBudgetAdd} onDelete={props.onBudgetDelete}/></div>;
  if(section==="recurring") return <div><Back title="Регулярные платежи"/><RecurringScreen payments={props.recurringPayments} categories={props.categories} userName={props.userProfile.name} onAdd={props.onRecurringAdd} onDelete={props.onRecurringDelete} onMarkPaid={props.onRecurringMarkPaid}/></div>;
  if(section==="calendar") return <div><Back title="Финансовый календарь"/><CalendarScreen transactions={props.transactions} recurringPayments={props.recurringPayments}/></div>;
  if(section==="report") return <div><Back title="Ежемесячный отчёт"/><MonthlyReportScreen transactions={props.transactions} usdRate={props.usdRate}/></div>;
  if(section==="notifications") return <div><Back title="Уведомления"/><NotificationsScreen notifications={props.notifications} onMarkRead={props.onMarkNotifRead} onMarkAllRead={props.onMarkAllNotifRead}/></div>;
  if(section==="allocation") return <div><Back title="Распределение"/><AllocationScreen goals={props.goals} totalSavings={props.totalSavings} onUpdate={props.onAllocationUpdate}/></div>;
  if(section==="categories") return <div><Back title="Справочник"/><CategoriesScreen categories={props.categories} onAdd={props.onCategoryAdd} onDelete={props.onCategoryDelete}/></div>;
  if(section==="export") return <div><Back title="Экспорт"/><ExportScreen transactions={props.transactions} goals={props.goals}/></div>;
  if(section==="settings") return <div><Back title="Настройки"/><SettingsScreen settings={props.settings} onUpdate={props.onSettingsUpdate} darkMode={props.darkMode} onToggleDark={props.onToggleDark}/></div>;

  const groups = [
    {title:"Обзор",items:[
      {id:"analytics" as MoreSection,icon:"📊",label:"Аналитика",sub:"Графики, динамика"},
      {id:"calendar" as MoreSection,icon:"📅",label:"Финансовый календарь",sub:"Операции по дням"},
      {id:"report" as MoreSection,icon:"📋",label:"Ежемесячный отчёт",sub:"Отчёт с экспортом"},
    ]},
    {title:"Планирование",items:[
      {id:"budgets" as MoreSection,icon:"🎯",label:"Бюджеты",sub:`${props.budgets.length} лимитов`},
      {id:"recurring" as MoreSection,icon:"🔄",label:"Регулярные платежи",sub:`${props.recurringPayments.length} платежей`},
      {id:"allocation" as MoreSection,icon:"💎",label:"Распределение",sub:`${props.goals.length} целей`},
    ]},
    {title:"Семья",items:[
      {id:"profile" as MoreSection,icon:"👤",label:"Профиль",sub:props.userProfile.name},
      {id:"family" as MoreSection,icon:"👨‍👩‍👧",label:"Семья",sub:"Наша семья"},
      {id:"notifications" as MoreSection,icon:"🔔",label:"Уведомления",sub:"Действия участников",badge:unread||undefined},
    ]},
    {title:"Прочее",items:[
      {id:"categories" as MoreSection,icon:"🏷",label:"Справочник",sub:`${props.categories.length} категорий`},
      {id:"export" as MoreSection,icon:"📤",label:"Экспорт",sub:"CSV, Excel, PDF"},
      {id:"settings" as MoreSection,icon:"⚙️",label:"Настройки",sub:`USD: ${props.settings.usd_rate} сум`},
    ]},
  ];

  return (
    <div className="pb-4">
      <div className="mx-4 mb-4 bg-primary rounded-2xl p-4 text-white flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">{props.userProfile.name[0]}</div>
        <div className="flex-1"><p className="font-bold">{props.userProfile.name}</p><div className="flex items-center gap-1">{props.userProfile.role==="owner"&&<Crown size={11} className="text-amber-300"/>}<p className="text-xs opacity-70">Наша семья</p></div></div>
        <button onClick={()=>setSection("profile")} className="text-xs text-white/60 font-medium">Профиль →</button>
      </div>
      <div className="px-4 space-y-5">
        {groups.map(g=>(
          <div key={g.title}>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{g.title}</p>
            <div className="space-y-1.5">
              {g.items.map(item=>(
                <button key={item.id} onClick={()=>setSection(item.id)} className="w-full bg-card rounded-2xl border border-border px-4 py-3.5 flex items-center gap-3.5 text-left active:bg-muted/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg flex-shrink-0 relative">
                    {item.icon}
                    {(item as any).badge>0&&<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-px rounded-full">{(item as any).badge}</span>}
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{item.label}</p><p className="text-xs text-muted-foreground mt-0.5 truncate">{item.sub}</p></div>
                  <ChevronRight size={15} className="text-muted-foreground flex-shrink-0"/>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [userProfile, setUserProfile] = useState<AppUser|null>(() => {
    try { return JSON.parse(localStorage.getItem("fb_session")||"null"); } catch { return null; }
  });
  const [familyMembers, setFamilyMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(!!localStorage.getItem("fb_token"));
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [moreDefaultSection, setMoreDefaultSection] = useState<string|undefined>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ id:"", family_id:"", usd_rate:12700, dark_mode:false, quick_actions:"Продукты,Такси,Кафе,Интернет" });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [darkMode, setDarkMode] = useState(()=>localStorage.getItem("theme")==="dark");
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'|'warning'|'info'}|null>(null);
  const showToast = (msg:string, type:'success'|'error'|'warning'|'info'='info') => setToast({msg,type});

  useEffect(()=>{ document.documentElement.classList.toggle("dark",darkMode); localStorage.setItem("theme",darkMode?"dark":"light"); },[darkMode]);

  useEffect(()=>{ if(localStorage.getItem("fb_token") && userProfile) loadAll(); },[userProfile?.id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [txs,cats,gls,sets,notifs,recurs,buds,members] = await Promise.all([
        api.transactions.list(), api.categories.list(), api.goals.list(),
        api.settings.get(), api.notifications.list(), api.recurring.list(),
        api.budgets.list(), api.auth.familyMembers(),
      ]);
      setTransactions(txs); setCategories(cats); setGoals(gls); setSettings(sets);
      setNotifications(notifs); setRecurringPayments(recurs); setBudgets(buds); setFamilyMembers(members);
    } catch(e) { console.error("loadAll", e); }
    finally { setLoading(false); }
  };

  const handleLogin = (u: AppUser) => {
    setUserProfile(u);
    localStorage.setItem("fb_session", JSON.stringify(u));
  };

  const notify = async (title:string, body:string, type:string) => {
    try { const n=await api.notifications.create(title,body,type); setNotifications(prev=>[n,...prev]); } catch {}
  };

  const saveTransaction = async (t:any, id?:string) => {
    if(id) {
      const u=await api.transactions.update(id,t);
      setTransactions(prev=>prev.map(tx=>tx.id===id?u:tx));
      showToast('Операция обновлена', 'success');
    } else {
      const c=await api.transactions.create({...t,receipt_url:t.receipt_url??null});
      setTransactions(prev=>[c,...prev]);
      showToast(`${t.type==="income"?"💰 Доход":"💸 Расход"} ${fmtUZS(t.amount)} добавлен`, t.type==="income"?'success':'info');
      await notify(`${userProfile?.name} добавил ${t.type==="income"?"доход":"расход"}`,`${t.category}: ${fmtUZS(t.amount)}`,"transaction");
      // Проверка бюджетных лимитов при расходе
      if(t.type==="expense") {
        const mk = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
        const budget = budgets.find(b=>b.category===t.category&&b.month===mk);
        if(budget) {
          const spent = transactions.filter(tx=>tx.type==="expense"&&tx.category===t.category&&tx.date.startsWith(mk)).reduce((s,tx)=>s+tx.amount,0) + t.amount;
          const pct = Math.round((spent/budget.month_limit)*100);
          if(spent>budget.month_limit) showToast(`⚠️ Бюджет "${t.category}" превышен! ${fmtUZS(spent)} из ${fmtUZS(budget.month_limit)}`,'warning');
          else if(pct>=80) showToast(`⚠️ Бюджет "${t.category}" использован на ${pct}%`,'warning');
        }
      }
    }
  };

  const deleteTransaction = async (id:string) => { await api.transactions.delete(id); setTransactions(prev=>prev.filter(t=>t.id!==id)); showToast('Операция удалена', 'info'); };
  const addCategory = async (name:string, type:TxType) => { const c=await api.categories.create(name,type); setCategories(prev=>[...prev,c]); };
  const deleteCategory = async (id:string) => { await api.categories.delete(id); setCategories(prev=>prev.filter(c=>c.id!==id)); };

  const addGoal = async (g:any) => {
    const goal=await api.goals.create(g); setGoals(prev=>[...prev,goal]);
    await notify(`${userProfile?.name} создал цель`,`«${g.name}» — ${fmtUZS(g.target_amount)}`,"goal");
  };
  const deleteGoal = async (id:string) => { await api.goals.delete(id); setGoals(prev=>prev.filter(g=>g.id!==id)); };

  const updateAllocation = async (goalId:string, amount:number) => {
    const res=await api.goals.updateAllocation(goalId,amount);
    setGoals(prev=>prev.map(g=>{
      if(g.id!==goalId) return g;
      if(g.allocated<g.target_amount&&amount>=g.target_amount&&g.target_amount>0) notify("🎯 Цель достигнута!",`«${g.name}» полностью накоплена`,"goal");
      return {...g,allocated:res.amount};
    }));
  };

  const updateSettings = async (s:Partial<AppSettings>) => { const u=await api.settings.update(s); setSettings(u); };
  const markNotifRead = (id:string) => { api.notifications.markRead(id); setNotifications(prev=>prev.map(n=>n.id===id?{...n,read:true}:n)); };
  const markAllNotifRead = () => { api.notifications.markAllRead(); setNotifications(prev=>prev.map(n=>({...n,read:true}))); };
  const addBudget = async (b:any) => { const bud=await api.budgets.create(b); setBudgets(prev=>[...prev,bud]); };
  const deleteBudget = async (id:string) => { await api.budgets.delete(id); setBudgets(prev=>prev.filter(b=>b.id!==id)); };
  const addRecurring = async (p:any) => { const r=await api.recurring.create(p); setRecurringPayments(prev=>[...prev,r]); };
  const deleteRecurring = async (id:string) => { await api.recurring.delete(id); setRecurringPayments(prev=>prev.filter(r=>r.id!==id)); };

  const markRecurringPaid = async (id:string) => {
    const p=recurringPayments.find(r=>r.id===id); if(!p) return;
    const nextDate=nextDateForFrequency(p.frequency,new Date(p.next_date));
    const updated=await api.recurring.markPaid(id,nextDate);
    setRecurringPayments(prev=>prev.map(r=>r.id===id?updated:r));
    await saveTransaction({type:"expense",category:p.category,amount:p.amount,currency:"UZS",date:p.next_date,description:p.name,receipt_url:null});
  };

  const logout = () => {
    localStorage.removeItem("fb_token"); localStorage.removeItem("fb_session");
    setUserProfile(null); setTransactions([]); setCategories([]); setGoals([]);
    setNotifications([]); setRecurringPayments([]); setBudgets([]);
  };

  const totalSavings = transactions.filter(t=>t.type==="income").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",settings.usd_rate),0)
    - transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",settings.usd_rate),0);
  const unreadNotif = notifications.filter(n=>!n.read).length;
  const handleMoreSection = (s:string) => { setMoreDefaultSection(s); setActiveTab("more"); };

  if(loading) return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-3xl bg-primary mx-auto mb-4 flex items-center justify-center text-3xl shadow-xl shadow-primary/30 animate-pulse">💰</div>
        <p className="text-muted-foreground text-sm font-medium">Загрузка...</p>
      </div>
    </div>
  );

  if(!userProfile) return <LoginScreen onLogin={handleLogin}/>;

  const moreProps = {
    userProfile, familyMembers, goals, categories, settings, notifications,
    transactions, usdRate:settings.usd_rate, budgets, recurringPayments, totalSavings,
    onAllocationUpdate:updateAllocation, onCategoryAdd:addCategory, onCategoryDelete:deleteCategory,
    onSettingsUpdate:updateSettings, onMarkNotifRead:markNotifRead, onMarkAllNotifRead:markAllNotifRead,
    onBudgetAdd:addBudget, onBudgetDelete:deleteBudget, onRecurringAdd:addRecurring,
    onRecurringDelete:deleteRecurring, onRecurringMarkPaid:markRecurringPaid,
    darkMode, onToggleDark:()=>setDarkMode(d=>!d), onLogout:logout, defaultSection:moreDefaultSection,
  };

  const renderScreen = () => {
    switch(activeTab) {
      case "dashboard": return <DashboardScreen transactions={transactions} goals={goals} usdRate={settings.usd_rate} userProfile={userProfile} familyMembers={familyMembers} categories={categories} recurringPayments={recurringPayments} settings={settings} onSave={saveTransaction} onMoreSection={handleMoreSection} onTabChange={setActiveTab}/>;
      case "journal": return <JournalScreen transactions={transactions} categories={categories} onSave={saveTransaction} onDelete={deleteTransaction} currentUserId={userProfile.id} usdRate={settings.usd_rate}/>;
      case "savings": return <SavingsScreen transactions={transactions} usdRate={settings.usd_rate}/>;
      case "goals": return <GoalsScreen goals={goals} transactions={transactions} onAdd={addGoal} onDelete={deleteGoal} onUpdateAllocation={updateAllocation}/>;
      case "more": return <MoreScreen {...moreProps}/>;
    }
  };

  return (
    <div className="bg-background min-h-dvh max-w-md mx-auto relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 max-w-md mx-auto pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-16 w-72 h-72 rounded-full opacity-[0.07] blur-3xl" style={{ background: 'var(--primary)' }} />
        <div className="absolute top-1/2 -left-20 w-56 h-56 rounded-full opacity-[0.05] blur-3xl" style={{ background: '#10b981' }} />
      </div>
      <div className="relative pb-24 pt-2 min-h-dvh overflow-y-auto">{renderScreen()}</div>
      <BottomNav active={activeTab} onChange={t=>{if(t!=="more")setMoreDefaultSection(undefined);setActiveTab(t);}} unreadNotif={unreadNotif} profileName={userProfile.name}/>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}
