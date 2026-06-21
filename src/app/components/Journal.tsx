import { useState, useRef } from "react";
import {
  FileText, Plus, Search, Filter, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Edit2, Trash2, MessageCircle, Camera,
} from "lucide-react";
import { Sheet, Field, Input, Select, Btn } from "./ui";
import { api } from "../../lib/api";
import type { Transaction, Category, Comment, Currency, TxType } from "../../lib/api";

const MONTHS_RU = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
const fmt = (n:number) => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(n);
const fmtUZS = (n:number) => `${fmt(n)} сум`;
const fmtUSD = (n:number) => `$${fmt(n)}`;
const fmtMoney = (n:number, cur:Currency="UZS") => cur==="USD" ? fmtUSD(n) : fmtUZS(n);
const toUZS = (amount:number, cur:Currency, rate:number) => cur==="USD" ? amount*rate : amount;
const monthKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const addMonths = (mk:string,d:number) => { const [y,m]=mk.split("-").map(Number); const dt=new Date(y,m-1+d,1); return monthKey(dt); };
const timeAgo = (ts:string) => { const d=Date.now()-new Date(ts).getTime(); if(d<60000) return "только что"; if(d<3600000) return `${Math.floor(d/60000)} мин. назад`; if(d<86400000) return `${Math.floor(d/3600000)} ч. назад`; return `${Math.floor(d/86400000)} дн. назад`; };

async function uploadReceipt(file: File): Promise<string|null> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => resolve(ev.target?.result as string ?? null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function TxRow({ t, currentUserId, usdRate, onEdit, onDelete }: {
  t: Transaction; currentUserId: string; usdRate: number;
  onEdit:()=>void; onDelete:()=>void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingC, setLoadingC] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    setLoadingC(true);
    try { setComments(await api.comments.list(t.id)); } finally { setLoadingC(false); }
  };

  const handleExpand = () => {
    if (!expanded) loadComments();
    setExpanded(v => !v);
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await api.comments.create(t.id, commentText.trim());
      setComments(await api.comments.list(t.id));
      setCommentText("");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3.5 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type==="income"?"bg-emerald-50":"bg-red-50"}`}>
          {t.receipt_url
            ? <img src={t.receipt_url} className="w-10 h-10 rounded-xl object-cover" alt="чек"/>
            : t.type==="income" ? <TrendingUp size={18} className="text-emerald-600"/> : <TrendingDown size={18} className="text-red-500"/>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{t.category}</p>
          <p className="text-[10px] text-muted-foreground truncate">{t.created_by_name}{t.description&&` · ${t.description}`}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`text-sm font-bold font-mono ${t.type==="income"?"text-emerald-600":"text-red-500"}`}>
            {t.type==="income"?"+":"−"}{fmtMoney(t.amount,t.currency??"UZS")}
          </span>
          <button onClick={handleExpand} className="text-muted-foreground hover:text-primary p-1"><MessageCircle size={13}/></button>
          {t.user_id===currentUserId&&<button onClick={onEdit} className="text-muted-foreground hover:text-primary p-1"><Edit2 size={13}/></button>}
          {t.user_id===currentUserId&&<button onClick={onDelete} className="text-muted-foreground hover:text-red-500 p-1"><Trash2 size={13}/></button>}
        </div>
      </div>
      {expanded&&t.receipt_url&&(
        <div className="px-4 pb-3">
          <img src={t.receipt_url} alt="чек" className="w-full rounded-xl max-h-48 object-contain border border-border"/>
        </div>
      )}
      {expanded&&(
        <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/20">
          {loadingC&&<p className="text-xs text-muted-foreground">Загрузка...</p>}
          {comments.map(c=>(
            <div key={c.id} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0">{c.user_name[0]}</div>
              <div className="flex-1">
                <span className="text-xs font-semibold">{c.user_name} </span>
                <span className="text-xs text-muted-foreground">{c.body}</span>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">{timeAgo(c.created_at)}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <input value={commentText} onChange={e=>setCommentText(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submitComment()}
              className="flex-1 text-xs px-3 py-2 rounded-xl bg-card border border-border outline-none"
              placeholder="Написать комментарий..."/>
            <button onClick={submitComment} disabled={submitting||!commentText.trim()}
              className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50">→</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TxSheet({ categories,initial,onSave,onClose,usdRate }: {
  categories:Category[]; initial?:Transaction;
  onSave:(t:any,id?:string)=>Promise<void>; onClose:()=>void; usdRate:number;
}) {
  const [type,setType] = useState<TxType>(initial?.type??"expense");
  const [currency,setCurrency] = useState<Currency>(initial?.currency??"UZS");
  const [category,setCategory] = useState(initial?.category??"");
  const [amount,setAmount] = useState(initial?String(initial.amount):"");
  const [date,setDate] = useState(initial?.date??new Date().toISOString().split("T")[0]);
  const [desc,setDesc] = useState(initial?.description??"");
  const [receiptUrl,setReceiptUrl] = useState<string|null>(initial?.receipt_url??null);
  const [uploading,setUploading] = useState(false);
  const [saving,setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cats = categories.filter(c=>c.type===type);
  const amtNum = parseFloat(amount)||0;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return;
    setUploading(true);
    const url = await uploadReceipt(file);
    if(url) setReceiptUrl(url);
    setUploading(false);
  };

  return (
    <Sheet title={initial?"Редактировать":"Новая операция"} onClose={onClose}>
      <div className="flex bg-muted rounded-xl p-1 mb-4">
        {(["expense","income"] as TxType[]).map(t=>(
          <button key={t} onClick={()=>{setType(t);if(!initial)setCategory("");}}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${type===t?t==="expense"?"bg-red-500 text-white":"bg-emerald-500 text-white":"text-muted-foreground"}`}>
            {t==="expense"?"Расход":"Доход"}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1.5">Сумма</label>
          <div className="flex gap-2">
            <Input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
              className="flex-1 text-3xl font-bold font-mono py-4" placeholder="0" inputMode="decimal" autoFocus/>
            <div className="flex flex-col gap-1">
              {(["UZS","USD"] as Currency[]).map(c=>(
                <button key={c} onClick={()=>setCurrency(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${currency===c?"border-primary bg-primary text-white":"border-border text-muted-foreground"}`}>
                  {c==="UZS"?"сум":"$"}
                </button>
              ))}
            </div>
          </div>
          {currency==="USD"&&amtNum>0&&<p className="text-xs text-muted-foreground mt-1">≈ {fmtUZS(amtNum*usdRate)} по курсу {usdRate} сум/$</p>}
        </div>
        <Field label="Категория">
          <Select value={category} onChange={e=>setCategory(e.target.value)}>
            <option value="">Выберите</option>
            {cats.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Дата"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
          <Field label="Комментарий"><Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Необязательно"/></Field>
        </div>
        {type==="expense"&&(
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1.5">Фото чека</label>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden"/>
            {receiptUrl?(
              <div className="relative">
                <img src={receiptUrl} alt="чек" className="w-full h-32 object-cover rounded-xl border border-border"/>
                <button onClick={()=>setReceiptUrl(null)} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
              </div>
            ):(
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Camera size={16}/>{uploading?"Загрузка...":"Сфотографировать"}
              </button>
            )}
          </div>
        )}
        <Btn onClick={async()=>{if(!amount||!category)return;setSaving(true);await onSave({type,category,amount:amtNum,currency,date,description:desc,receipt_url:receiptUrl},initial?.id);setSaving(false);onClose();}}
          disabled={saving||uploading||!amount||!category}>
          {saving?"Сохранение...":initial?"Сохранить":`Добавить ${fmtMoney(amtNum,currency)}`}
        </Btn>
      </div>
    </Sheet>
  );
}

export function JournalScreen({ transactions,categories,onSave,onDelete,currentUserId,usdRate }: {
  transactions:Transaction[]; categories:Category[];
  onSave:(t:any,id?:string)=>Promise<void>; onDelete:(id:string)=>Promise<void>;
  currentUserId:string; usdRate:number;
}) {
  const [showSheet,setShowSheet] = useState(false);
  const [editing,setEditing] = useState<Transaction|undefined>();
  const [filterMonth,setFilterMonth] = useState(monthKey());
  const [filterType,setFilterType] = useState<"all"|TxType>("all");
  const [filterCat,setFilterCat] = useState("all");
  const [search,setSearch] = useState("");
  const [showFilters,setShowFilters] = useState(false);

  const filtered = transactions.filter(t=>{
    if(!t.date.startsWith(filterMonth)) return false;
    if(filterType!=="all"&&t.type!==filterType) return false;
    if(filterCat!=="all"&&t.category!==filterCat) return false;
    if(search&&!`${t.category} ${t.description} ${t.amount}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalIn=filtered.filter(t=>t.type==="income").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const totalOut=filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+toUZS(t.amount,t.currency??"UZS",usdRate),0);
  const grouped:Record<string,Transaction[]>={};
  [...filtered].sort((a,b)=>b.date.localeCompare(a.date)).forEach(t=>{(grouped[t.date]??=[]).push(t);});
  const allCats=Array.from(new Set(transactions.map(t=>t.category)));
  const fmtDate=(d:string)=>new Date(d+"T12:00:00").toLocaleDateString("ru-RU",{weekday:"short",day:"numeric",month:"long"});
  const isCurrent=filterMonth===monthKey();

  return (
    <div className="pb-28">
      <div className="px-4 pb-3">
        <h2 className="text-xl font-bold mb-3">Журнал операций</h2>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={()=>setFilterMonth(mk=>addMonths(mk,-1))} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"><ChevronLeft size={18}/></button>
          <div className="flex-1 text-center">
            <p className="text-sm font-bold capitalize">{(()=>{const[y,m]=filterMonth.split("-").map(Number);return`${MONTHS_RU[m-1]} ${y}`;})()}</p>
            {isCurrent&&<p className="text-[10px] text-primary font-bold">текущий месяц</p>}
          </div>
          <button onClick={()=>setFilterMonth(mk=>addMonths(mk,1))} disabled={isCurrent} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center disabled:opacity-30"><ChevronRight size={18}/></button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-center"><p className="text-[10px] text-emerald-600 font-bold uppercase">Доходы</p><p className="text-sm font-bold font-mono text-emerald-600">+{fmtUZS(totalIn)}</p></div>
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-center"><p className="text-[10px] text-red-500 font-bold uppercase">Расходы</p><p className="text-sm font-bold font-mono text-red-500">−{fmtUZS(totalOut)}</p></div>
          <div className={`border rounded-xl px-3 py-2 text-center ${totalIn-totalOut>=0?"bg-blue-50 border-blue-100":"bg-orange-50 border-orange-100"}`}><p className="text-[10px] text-muted-foreground font-bold uppercase">Остаток</p><p className={`text-sm font-bold font-mono ${totalIn-totalOut>=0?"text-blue-600":"text-orange-500"}`}>{fmtUZS(totalIn-totalOut)}</p></div>
        </div>
        <div className="relative mb-2"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9 bg-muted border-0" placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <button onClick={()=>setShowFilters(v=>!v)} className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-2">
          <Filter size={13}/>{showFilters?"Скрыть":"Фильтры"}
          {(filterType!=="all"||filterCat!=="all")&&<span className="bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full">!</span>}
        </button>
        {showFilters&&(
          <div className="space-y-2 mb-2">
            <div className="flex gap-2">
              {([["all","Все"],["income","Доходы"],["expense","Расходы"]] as const).map(([v,l])=>(
                <button key={v} onClick={()=>setFilterType(v)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${filterType===v?v==="income"?"bg-emerald-500 text-white":v==="expense"?"bg-red-500 text-white":"bg-primary text-white":"bg-muted text-muted-foreground"}`}>{l}</button>
              ))}
            </div>
            <Select value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
              <option value="all">Все категории</option>
              {allCats.map(c=><option key={c} value={c}>{c}</option>)}
            </Select>
            {(filterType!=="all"||filterCat!=="all")&&<button onClick={()=>{setFilterType("all");setFilterCat("all");}} className="text-xs text-red-500 font-medium">Сбросить</button>}
          </div>
        )}
      </div>

      {Object.keys(grouped).length===0?(
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText size={48} className="mb-3 opacity-20"/>
          <p className="text-sm">Нет операций</p>
          <button onClick={()=>{setEditing(undefined);setShowSheet(true);}} className="mt-3 text-sm text-primary font-bold">+ Добавить</button>
        </div>
      ):(
        <div>
          {Object.entries(grouped).map(([date,txs])=>(
            <div key={date} className="mb-1">
              <div className="px-4 py-1.5"><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider capitalize">{fmtDate(date)}</p></div>
              <div className="px-4 space-y-2">
                {txs.map(t=><TxRow key={t.id} t={t} currentUserId={currentUserId} usdRate={usdRate} onEdit={()=>{setEditing(t);setShowSheet(true);}} onDelete={()=>onDelete(t.id)}/>)}
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={()=>{setEditing(undefined);setShowSheet(true);}} className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center z-40 active:scale-95 transition-transform"><Plus size={26}/></button>
      {showSheet&&<TxSheet categories={categories} initial={editing} onSave={onSave} usdRate={usdRate} onClose={()=>{setShowSheet(false);setEditing(undefined);}}/>}
    </div>
  );
}
