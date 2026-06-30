import { useState, useEffect } from "react";
import { Home, FileText, PiggyBank, Target, User, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { api } from "../lib/api";
import { ymd } from "../lib/date";
import type { AppUser, Transaction, Category, Goal, Budget, RecurringPayment, AppSettings, Notification, TxType, Frequency, PlannedItem, Space, Contractor } from "../lib/api";
import { Toast } from "./components/ui";
import { InstallPrompt } from "./components/InstallPrompt";
import { LoginScreen } from "./components/Login";
import { DashboardScreen } from "./components/Dashboard";
import { JournalScreen } from "./components/Journal";
import {
  SavingsScreen, GoalsScreen, AnalyticsScreen, BudgetsScreen, RecurringScreen,
  CalendarScreen, MonthlyReportScreen, SettingsScreen, AllocationScreen,
  CategoriesScreen, NotificationsScreen, FamilyScreen, ProfileScreen, ExportScreen,
  PlannedScreen, SpacesScreen, PnLScreen, ContractorsScreen,
} from "./components/Screens";

type TabType = "dashboard" | "journal" | "savings" | "goals" | "more";
type MoreSection = "profile"|"family"|"spaces"|"contractors"|"analytics"|"pnl"|"budgets"|"recurring"|"planned"|"calendar"|"report"|"notifications"|"allocation"|"categories"|"export"|"settings";

const fmt = (n:number) => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(n);
const fmtUZS = (n:number) => `${fmt(n)} сум`;
const toUZS = (amount:number, cur:string, rate:number) => cur==="USD" ? amount*rate : amount;
const nextDateForFrequency = (freq:Frequency, from:Date=new Date()): string => {
  const d=new Date(from);
  if(freq==="daily") d.setDate(d.getDate()+1);
  else if(freq==="weekly") d.setDate(d.getDate()+7);
  else if(freq==="monthly") d.setMonth(d.getMonth()+1);
  else d.setFullYear(d.getFullYear()+1);
  return ymd(d);
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
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)', paddingTop: '20px', background: 'linear-gradient(to bottom, transparent, var(--background) 45%)' }}>
      <div className="glass rounded-[1.4rem] flex" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--glass-border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-all relative rounded-[1.4rem] ${active === t.id ? 'text-white' : 'text-muted-foreground'}`}>
            {active === t.id && (
              <div className="absolute inset-1.5 rounded-2xl" style={{ background: 'var(--grad-brand)', boxShadow: '0 6px 18px rgba(99,102,241,0.4)' }} />
            )}
            <div className="relative z-10">
              {t.icon}
              {t.id === 'more' && unreadNotif > 0 && (
                <span className="absolute -top-1 -right-2 text-white text-[8px] font-bold px-1 py-px rounded-full min-w-[14px] text-center" style={{ background: '#FB7185' }}>
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
  onMarkNotifRead:(id:string)=>void; onMarkAllNotifRead:()=>void; onDeleteNotif:(id:string)=>void; onClearNotifs:()=>void;
  onBudgetAdd:(b:any)=>Promise<void>; onBudgetEdit:(id:string,b:any)=>Promise<void>; onBudgetDelete:(id:string)=>Promise<void>;
  onRecurringAdd:(p:any)=>Promise<void>; onRecurringEdit:(id:string,p:any)=>Promise<void>; onRecurringDelete:(id:string)=>Promise<void>; onRecurringMarkPaid:(id:string)=>Promise<void>;
  plannedItems:PlannedItem[];
  onPlannedAdd:(p:any)=>Promise<void>; onPlannedEdit:(id:string,p:any)=>Promise<void>; onPlannedDelete:(id:string)=>Promise<void>; onPlannedConfirm:(id:string)=>Promise<void>;
  spaces:Space[]; activeSpaceId:string;
  onSpaceSwitch:(id:string)=>void; onSpaceAdd:(s:any)=>Promise<void>; onSpaceEdit:(id:string,s:any)=>Promise<void>; onSpaceDelete:(id:string)=>Promise<void>;
  contractors:Contractor[];
  onContractorAdd:(c:any)=>Promise<void>; onContractorEdit:(id:string,c:any)=>Promise<void>; onContractorDelete:(id:string)=>Promise<void>;
  onChangePassword:(o:string,n:string)=>Promise<void>; onUpdateProfile:(p:{name?:string;phone?:string;color?:string})=>Promise<void>;
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

  if(section==="profile") return <div><Back title="Профиль"/><ProfileScreen userProfile={props.userProfile} onLogout={props.onLogout} onChangePassword={props.onChangePassword} onUpdateProfile={props.onUpdateProfile}/></div>;
  if(section==="family") return <div><Back title="Семья"/><FamilyScreen members={props.familyMembers} currentUser={props.userProfile}/></div>;
  if(section==="spaces") return <div><Back title="Пространства"/><SpacesScreen spaces={props.spaces} activeSpaceId={props.activeSpaceId} onSwitch={props.onSpaceSwitch} onAdd={props.onSpaceAdd} onEdit={props.onSpaceEdit} onDelete={props.onSpaceDelete}/></div>;
  if(section==="analytics") return <div><Back title="Аналитика"/><AnalyticsScreen transactions={props.transactions} usdRate={props.usdRate}/></div>;
  if(section==="pnl") return <div><Back title="P&L · Прибыль/Убыток"/><PnLScreen transactions={props.transactions} usdRate={props.usdRate}/></div>;
  if(section==="contractors") return <div><Back title="Контрагенты"/><ContractorsScreen contractors={props.contractors} transactions={props.transactions} plannedItems={props.plannedItems} usdRate={props.usdRate} onAdd={props.onContractorAdd} onEdit={props.onContractorEdit} onDelete={props.onContractorDelete}/></div>;
  if(section==="budgets") return <div><Back title="Бюджеты"/><BudgetsScreen budgets={props.budgets} transactions={props.transactions} categories={props.categories} onAdd={props.onBudgetAdd} onEdit={props.onBudgetEdit} onDelete={props.onBudgetDelete} usdRate={props.usdRate}/></div>;
  if(section==="recurring") return <div><Back title="Регулярные платежи"/><RecurringScreen payments={props.recurringPayments} categories={props.categories} userName={props.userProfile.name} onAdd={props.onRecurringAdd} onEdit={props.onRecurringEdit} onDelete={props.onRecurringDelete} onMarkPaid={props.onRecurringMarkPaid}/></div>;
  if(section==="planned") return <div><Back title="Планы и прогноз"/><PlannedScreen items={props.plannedItems} categories={props.categories} contractors={props.contractors} usdRate={props.usdRate} onAdd={props.onPlannedAdd} onEdit={props.onPlannedEdit} onDelete={props.onPlannedDelete} onConfirm={props.onPlannedConfirm}/></div>;
  if(section==="calendar") return <div><Back title="Финансовый календарь"/><CalendarScreen transactions={props.transactions} recurringPayments={props.recurringPayments}/></div>;
  if(section==="report") return <div><Back title="Ежемесячный отчёт"/><MonthlyReportScreen transactions={props.transactions} usdRate={props.usdRate}/></div>;
  if(section==="notifications") return <div><Back title="Уведомления"/><NotificationsScreen notifications={props.notifications} onMarkRead={props.onMarkNotifRead} onMarkAllRead={props.onMarkAllNotifRead} onDelete={props.onDeleteNotif} onClear={props.onClearNotifs}/></div>;
  if(section==="allocation") return <div><Back title="Распределение"/><AllocationScreen goals={props.goals} totalSavings={props.totalSavings} onUpdate={props.onAllocationUpdate}/></div>;
  if(section==="categories") return <div><Back title="Справочник"/><CategoriesScreen categories={props.categories} onAdd={props.onCategoryAdd} onDelete={props.onCategoryDelete}/></div>;
  if(section==="export") return <div><Back title="Экспорт"/><ExportScreen transactions={props.transactions} goals={props.goals}/></div>;
  if(section==="settings") return <div><Back title="Настройки"/><SettingsScreen settings={props.settings} onUpdate={props.onSettingsUpdate} darkMode={props.darkMode} onToggleDark={props.onToggleDark}/></div>;

  const activeSpace = props.spaces.find(s=>s.id===props.activeSpaceId) || props.spaces[0];
  const isBusiness = activeSpace?.type==="business";

  const groups = [
    // Бизнес-блок — только в бизнес-пространстве
    ...(isBusiness ? [{title:"Бизнес",items:[
      {id:"pnl" as MoreSection,icon:"💹",label:"P&L · Прибыль/Убыток",sub:"Выручка − расходы = прибыль"},
      {id:"contractors" as MoreSection,icon:"🤝",label:"Контрагенты",sub:`${props.contractors.length} · клиенты, поставщики`},
    ]}] : []),
    {title:"Обзор",items:[
      {id:"analytics" as MoreSection,icon:"📊",label:"Аналитика",sub:"Графики, динамика"},
      {id:"calendar" as MoreSection,icon:"📅",label:"Финансовый календарь",sub:"Операции по дням"},
      {id:"report" as MoreSection,icon:"📋",label:"Ежемесячный отчёт",sub:"Отчёт с экспортом"},
    ]},
    {title:"Планирование",items:[
      {id:"planned" as MoreSection,icon:"🔮",label:"Планы и прогноз",sub:`${props.plannedItems.filter(p=>p.status==="planned").length} ожидается`},
      {id:"budgets" as MoreSection,icon:"🎯",label:"Бюджеты",sub:`${props.budgets.length} лимитов`},
      {id:"recurring" as MoreSection,icon:"🔄",label:isBusiness?"Регулярные платежи":"Регулярные платежи",sub:`${props.recurringPayments.length} платежей`},
      ...(!isBusiness ? [{id:"allocation" as MoreSection,icon:"💎",label:"Распределение",sub:`${props.goals.length} целей`}] : []),
    ]},
    {title:"Пространства и доступ",items:[
      {id:"spaces" as MoreSection,icon:"🗂",label:"Пространства",sub:`${props.spaces.length} · личное + бизнесы`},
      {id:"profile" as MoreSection,icon:"👤",label:"Профиль",sub:props.userProfile.name},
      {id:"family" as MoreSection,icon:"👨‍👩‍👧",label:"Участники",sub:"Доступ к учёту"},
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
  const [plannedItems, setPlannedItems] = useState<PlannedItem[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string>(()=>localStorage.getItem("fb_space")||"");
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [darkMode, setDarkMode] = useState(()=>localStorage.getItem("theme")!=="light"); // тёмная тема по умолчанию
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'|'warning'|'info'}|null>(null);
  const showToast = (msg:string, type:'success'|'error'|'warning'|'info'='info') => setToast({msg,type});

  useEffect(()=>{ document.documentElement.classList.toggle("light",!darkMode); localStorage.setItem("theme",darkMode?"dark":"light"); },[darkMode]);

  useEffect(()=>{ if(localStorage.getItem("fb_token") && userProfile) loadAll(); },[userProfile?.id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      // allSettled: сбой одного эндпоинта не обнуляет ВСЕ данные
      const [txs,cats,gls,sets,notifs,recurs,buds,members,planned,spcs,contrs] = await Promise.allSettled([
        api.transactions.list(), api.categories.list(), api.goals.list(),
        api.settings.get(), api.notifications.list(), api.recurring.list(),
        api.budgets.list(), api.auth.familyMembers(), api.planned.list(), api.spaces.list(),
        api.contractors.list(),
      ]);
      if(contrs.status==="fulfilled") setContractors(contrs.value);
      if(spcs.status==="fulfilled"){
        setSpaces(spcs.value);
        // если активное пространство не из списка — берём дефолтное (первое)
        if(spcs.value.length && !spcs.value.some(s=>s.id===activeSpaceId)){
          const def=spcs.value[0].id; setActiveSpaceId(def); localStorage.setItem("fb_space",def);
        }
      }
      if(txs.status==="fulfilled") setTransactions(txs.value);
      if(cats.status==="fulfilled") setCategories(cats.value);
      if(gls.status==="fulfilled") setGoals(gls.value);
      if(sets.status==="fulfilled") setSettings(sets.value);
      if(notifs.status==="fulfilled") setNotifications(notifs.value);
      if(recurs.status==="fulfilled") setRecurringPayments(recurs.value);
      if(buds.status==="fulfilled") setBudgets(buds.value);
      if(members.status==="fulfilled") setFamilyMembers(members.value);
      if(planned.status==="fulfilled") setPlannedItems(planned.value);
      const failed=[txs,cats,gls,sets,notifs,recurs,buds,members,planned,spcs,contrs].filter(r=>r.status==="rejected");
      if(failed.length) console.error("loadAll: часть запросов не удалась", failed);
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
    try {
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
            const rate = settings.usd_rate;
            const spent = transactions.filter(tx=>tx.type==="expense"&&tx.category===t.category&&tx.date.startsWith(mk)).reduce((s,tx)=>s+toUZS(tx.amount,tx.currency??"UZS",rate),0) + toUZS(t.amount,t.currency??"UZS",rate);
            const pct = Math.round((spent/budget.month_limit)*100);
            if(spent>budget.month_limit) showToast(`⚠️ Бюджет "${t.category}" превышен! ${fmtUZS(spent)} из ${fmtUZS(budget.month_limit)}`,'warning');
            else if(pct>=80) showToast(`⚠️ Бюджет "${t.category}" использован на ${pct}%`,'warning');
          }
        }
      }
    } catch (e:any) {
      showToast(e?.message || 'Не удалось сохранить операцию', 'error');
      throw e; // пробрасываем — TxSheet оставит лист открытым для повтора
    }
  };

  // Обёртка: показывает тост ошибки и пробрасывает её дальше
  const guard = async <R,>(fn:()=>Promise<R>, errMsg:string):Promise<R> => {
    try { return await fn(); }
    catch (e:any) { showToast(e?.message || errMsg, 'error'); throw e; }
  };

  const deleteTransaction = (id:string) => guard(async()=>{ await api.transactions.delete(id); setTransactions(prev=>prev.filter(t=>t.id!==id)); showToast('Операция удалена', 'info'); }, 'Не удалось удалить операцию');
  const addCategory = (name:string, type:TxType) => guard(async()=>{ const c=await api.categories.create(name,type); setCategories(prev=>[...prev,c]); showToast('Категория добавлена','success'); }, 'Не удалось добавить категорию');
  const deleteCategory = (id:string) => guard(async()=>{ await api.categories.delete(id); setCategories(prev=>prev.filter(c=>c.id!==id)); }, 'Не удалось удалить категорию');

  const addGoal = (g:any) => guard(async()=>{
    const goal=await api.goals.create(g); setGoals(prev=>[...prev,goal]);
    showToast('🎯 Цель создана','success');
    await notify(`${userProfile?.name} создал цель`,`«${g.name}» — ${fmtUZS(g.target_amount)}`,"goal");
  }, 'Не удалось создать цель');
  const updateGoal = (id:string, g:any) => guard(async()=>{
    const updated=await api.goals.update(id,g);
    setGoals(prev=>prev.map(x=>x.id===id?updated:x));
    showToast('Цель обновлена','success');
  }, 'Не удалось обновить цель');
  const deleteGoal = (id:string) => guard(async()=>{ await api.goals.delete(id); setGoals(prev=>prev.filter(g=>g.id!==id)); showToast('Цель удалена','info'); }, 'Не удалось удалить цель');

  const updateAllocation = (goalId:string, amount:number) => guard(async()=>{
    const res=await api.goals.updateAllocation(goalId,amount);
    setGoals(prev=>prev.map(g=>{
      if(g.id!==goalId) return g;
      if(g.allocated<g.target_amount&&amount>=g.target_amount&&g.target_amount>0) notify("🎯 Цель достигнута!",`«${g.name}» полностью накоплена`,"goal");
      return {...g,allocated:res.amount};
    }));
  }, 'Не удалось обновить накопления');

  const updateSettings = (s:Partial<AppSettings>) => guard(async()=>{ const u=await api.settings.update(s); setSettings(u); showToast('Настройки сохранены','success'); }, 'Не удалось сохранить настройки');
  const markNotifRead = (id:string) => { api.notifications.markRead(id).catch(()=>{}); setNotifications(prev=>prev.map(n=>n.id===id?{...n,read:true}:n)); };
  const markAllNotifRead = () => { api.notifications.markAllRead().catch(()=>{}); setNotifications(prev=>prev.map(n=>({...n,read:true}))); };
  const deleteNotif = (id:string) => { api.notifications.delete(id).catch(()=>{}); setNotifications(prev=>prev.filter(n=>n.id!==id)); };
  const clearNotifs = () => { api.notifications.clearAll().catch(()=>{}); setNotifications([]); showToast('Уведомления очищены','info'); };
  const addBudget = (b:any) => guard(async()=>{ const bud=await api.budgets.create(b); setBudgets(prev=>[...prev,bud]); showToast('Бюджет создан','success'); }, 'Не удалось создать бюджет');
  const updateBudget = (id:string,b:any) => guard(async()=>{ const bud=await api.budgets.update(id,b); setBudgets(prev=>prev.map(x=>x.id===id?bud:x)); showToast('Бюджет обновлён','success'); }, 'Не удалось обновить бюджет');
  const deleteBudget = (id:string) => guard(async()=>{ await api.budgets.delete(id); setBudgets(prev=>prev.filter(b=>b.id!==id)); }, 'Не удалось удалить бюджет');
  const addRecurring = (p:any) => guard(async()=>{ const r=await api.recurring.create(p); setRecurringPayments(prev=>[...prev,r]); showToast('Платёж добавлен','success'); }, 'Не удалось добавить платёж');
  const updateRecurring = (id:string,p:any) => guard(async()=>{ const r=await api.recurring.update(id,p); setRecurringPayments(prev=>prev.map(x=>x.id===id?r:x)); showToast('Платёж обновлён','success'); }, 'Не удалось обновить платёж');
  const deleteRecurring = (id:string) => guard(async()=>{ await api.recurring.delete(id); setRecurringPayments(prev=>prev.filter(r=>r.id!==id)); }, 'Не удалось удалить платёж');

  const addPlanned = (p:any) => guard(async()=>{ const x=await api.planned.create(p); setPlannedItems(prev=>[...prev,x]); showToast(`${p.type==="income"?"📈 Ожидаемый доход":"📉 Ожидаемая трата"} добавлен`,'success'); }, 'Не удалось добавить план');
  const updatePlanned = (id:string,p:any) => guard(async()=>{ const x=await api.planned.update(id,p); setPlannedItems(prev=>prev.map(i=>i.id===id?x:i)); showToast('План обновлён','success'); }, 'Не удалось обновить план');
  const deletePlanned = (id:string) => guard(async()=>{ await api.planned.delete(id); setPlannedItems(prev=>prev.filter(i=>i.id!==id)); }, 'Не удалось удалить план');
  const confirmPlanned = (id:string) => guard(async()=>{
    const res=await api.planned.confirm(id);
    setTransactions(prev=>[res.transaction,...prev]);
    setPlannedItems(prev=>prev.map(i=>i.id===id?res.planned:i));
    showToast('✅ План подтверждён — операция создана','success');
  }, 'Не удалось подтвердить план');

  // ── Контрагенты ─────────────────────────────────────────────────
  const addContractor = (c:any) => guard(async()=>{ const x=await api.contractors.create(c); setContractors(prev=>[...prev,x]); showToast('Контрагент добавлен','success'); }, 'Не удалось добавить контрагента');
  const updateContractor = (id:string,c:any) => guard(async()=>{ const x=await api.contractors.update(id,c); setContractors(prev=>prev.map(i=>i.id===id?x:i)); showToast('Контрагент обновлён','success'); }, 'Не удалось обновить контрагента');
  const deleteContractor = (id:string) => guard(async()=>{ await api.contractors.delete(id); setContractors(prev=>prev.filter(i=>i.id!==id)); showToast('Контрагент удалён','info'); }, 'Не удалось удалить контрагента');

  // ── Пространства (бизнесы) ──────────────────────────────────────
  const switchSpace = (id:string) => {
    if(id===activeSpaceId) return;
    localStorage.setItem("fb_space", id);   // заголовок X-Space-Id берётся отсюда
    setActiveSpaceId(id);
    loadAll();                               // перезагружаем данные в новом scope
  };
  const addSpace = (s:any) => guard(async()=>{
    const sp=await api.spaces.create(s);
    setSpaces(prev=>[...prev,sp]);
    showToast(`Пространство «${sp.name}» создано`,'success');
    switchSpace(sp.id);                      // сразу переходим в новый бизнес
  }, 'Не удалось создать пространство');
  const updateSpace = (id:string,s:any) => guard(async()=>{
    const sp=await api.spaces.update(id,s);
    setSpaces(prev=>prev.map(x=>x.id===id?sp:x));
    showToast('Пространство обновлено','success');
  }, 'Не удалось обновить пространство');
  const deleteSpace = (id:string) => guard(async()=>{
    await api.spaces.delete(id);
    const rest=spaces.filter(x=>x.id!==id);
    setSpaces(rest);
    showToast('Пространство удалено','info');
    if(id===activeSpaceId && rest.length) switchSpace(rest[0].id);
  }, 'Не удалось удалить пространство');

  const markRecurringPaid = (id:string) => guard(async()=>{
    const p=recurringPayments.find(r=>r.id===id); if(!p) return;
    const nextDate=nextDateForFrequency(p.frequency,new Date(p.next_date));
    const updated=await api.recurring.markPaid(id,nextDate);
    setRecurringPayments(prev=>prev.map(r=>r.id===id?updated:r));
    await saveTransaction({type:"expense",category:p.category,amount:p.amount,currency:"UZS",date:p.next_date,description:p.name,receipt_url:null});
    showToast('Платёж отмечен оплаченным','success');
  }, 'Не удалось отметить платёж');

  const changePassword = (oldP:string,newP:string) => guard(async()=>{
    await api.auth.changePassword(oldP,newP); showToast('Пароль изменён','success');
  }, 'Не удалось изменить пароль');
  const updateProfile = (p:{name?:string;phone?:string;color?:string}) => guard(async()=>{
    const u=await api.auth.updateProfile(p);
    setUserProfile(u); localStorage.setItem("fb_session",JSON.stringify(u));
    showToast('Профиль обновлён','success');
  }, 'Не удалось обновить профиль');

  const logout = () => {
    localStorage.removeItem("fb_token"); localStorage.removeItem("fb_session");
    setUserProfile(null); setTransactions([]); setCategories([]); setGoals([]);
    setNotifications([]); setRecurringPayments([]); setBudgets([]); setPlannedItems([]);
    setSpaces([]); setContractors([]);
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
    onSettingsUpdate:updateSettings, onMarkNotifRead:markNotifRead, onMarkAllNotifRead:markAllNotifRead, onDeleteNotif:deleteNotif, onClearNotifs:clearNotifs,
    onBudgetAdd:addBudget, onBudgetEdit:updateBudget, onBudgetDelete:deleteBudget, onRecurringAdd:addRecurring,
    onRecurringEdit:updateRecurring, onRecurringDelete:deleteRecurring, onRecurringMarkPaid:markRecurringPaid,
    plannedItems, onPlannedAdd:addPlanned, onPlannedEdit:updatePlanned, onPlannedDelete:deletePlanned, onPlannedConfirm:confirmPlanned,
    spaces, activeSpaceId, onSpaceSwitch:switchSpace, onSpaceAdd:addSpace, onSpaceEdit:updateSpace, onSpaceDelete:deleteSpace,
    contractors, onContractorAdd:addContractor, onContractorEdit:updateContractor, onContractorDelete:deleteContractor,
    onChangePassword:changePassword, onUpdateProfile:updateProfile,
    darkMode, onToggleDark:()=>setDarkMode(d=>!d), onLogout:logout, defaultSection:moreDefaultSection,
  };

  const renderScreen = () => {
    switch(activeTab) {
      case "dashboard": return <DashboardScreen transactions={transactions} goals={goals} usdRate={settings.usd_rate} userProfile={userProfile} familyMembers={familyMembers} categories={categories} recurringPayments={recurringPayments} plannedItems={plannedItems} settings={settings} contractors={contractors} spaces={spaces} activeSpaceId={activeSpaceId} onSpaceSwitch={switchSpace} onSave={saveTransaction} onMoreSection={handleMoreSection} onTabChange={setActiveTab} darkMode={darkMode} onToggleDark={()=>setDarkMode(d=>!d)}/>;
      case "journal": return <JournalScreen transactions={transactions} categories={categories} contractors={contractors} onSave={saveTransaction} onDelete={deleteTransaction} currentUserId={userProfile.id} usdRate={settings.usd_rate}/>;
      case "savings": return <SavingsScreen transactions={transactions} usdRate={settings.usd_rate}/>;
      case "goals": return <GoalsScreen goals={goals} transactions={transactions} onAdd={addGoal} onEdit={updateGoal} onDelete={deleteGoal} onUpdateAllocation={updateAllocation} usdRate={settings.usd_rate}/>;
      case "more": return <MoreScreen {...moreProps}/>;
    }
  };

  return (
    <div className="bg-background min-h-dvh max-w-md mx-auto relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 max-w-md mx-auto pointer-events-none overflow-hidden">
        <div className="float-orb absolute -top-32 -right-16 w-72 h-72 rounded-full opacity-[0.12] blur-3xl" style={{ background: 'var(--primary)' }} />
        <div className="float-orb absolute top-1/3 -left-24 w-60 h-60 rounded-full opacity-[0.10] blur-3xl" style={{ background: '#a855f7', animationDelay: '4s' }} />
        <div className="float-orb absolute bottom-10 right-0 w-52 h-52 rounded-full opacity-[0.06] blur-3xl" style={{ background: '#22d3ee', animationDelay: '8s' }} />
      </div>
      <div className="relative min-h-dvh overflow-y-auto"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}>{renderScreen()}</div>
      <BottomNav active={activeTab} onChange={t=>{if(t!=="more")setMoreDefaultSection(undefined);setActiveTab(t);}} unreadNotif={unreadNotif} profileName={userProfile.name}/>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <InstallPrompt/>
    </div>
  );
}
