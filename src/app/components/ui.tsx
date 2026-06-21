import { X } from "lucide-react";

export function Card({ children, className="" }: { children:React.ReactNode; className?:string }) {
  return <div className={`bg-card rounded-2xl border border-border shadow-sm ${className}`}>{children}</div>;
}

export function StatCard({ label,value,color,sub,onClick }: { label:string; value:string; color?:string; sub?:string; onClick?:()=>void }) {
  return (
    <div onClick={onClick} className={`bg-card rounded-2xl border border-border p-4 shadow-sm ${onClick?"cursor-pointer active:scale-95 transition-transform":""}`}>
      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-base font-bold font-mono leading-tight ${color??"text-foreground"}`}>{value}</p>
      {sub&&<p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function Sheet({ title,onClose,children }: { title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={e=>e.target===e.currentTarget&&onClose()} style={{background:"rgba(0,0,0,0.55)"}}>
      <div className="bg-card rounded-t-3xl p-6 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted"><X size={16}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label,children }: { label:string; children:React.ReactNode }) {
  return <div><label className="text-sm font-medium text-muted-foreground block mb-1.5">{label}</label>{children}</div>;
}

export function Input({ className="",...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full px-4 py-3 rounded-xl bg-input-background border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/20 ${className}`}/>;
}

export function Select({ className="",...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full px-4 py-3 rounded-xl bg-input-background border border-border text-foreground text-sm outline-none ${className}`}/>;
}

export function Btn({ children,variant="primary",className="",...props }: { variant?:"primary"|"ghost"|"danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = variant==="primary"?"bg-primary text-white disabled:opacity-60":variant==="danger"?"border-2 border-red-100 text-red-500 hover:bg-red-50":"bg-muted text-foreground";
  return <button {...props} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${v} ${className}`}>{children}</button>;
}

export function SectionHeader({ title,action }: { title:string; action?:React.ReactNode }) {
  return <div className="flex items-center justify-between mb-4"><p className="text-sm font-bold text-foreground">{title}</p>{action}</div>;
}
