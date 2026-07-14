import { ChevronUp, ChevronDown, ScanLine, Truck, ShieldAlert, LayoutGrid, ScrollText, Activity, Bell, Download, Settings, BookOpen, Lock, LayoutDashboard, Search, Database, BarChart3, FileSpreadsheet, DollarSign, Building2, User, Lightbulb, CheckCircle } from 'lucide-react';

const ICON_MAP = {
  ScanLine, Truck, ShieldAlert, LayoutGrid, ScrollText, Activity, Bell, Download, Settings, BookOpen,
  Lock, LayoutDashboard, Search, Database, BarChart3, FileSpreadsheet, DollarSign, Building2, User,
};

export default function ManualSection({ section, isOpen, onToggle }) {
  const Icon = ICON_MAP[section.icon] || BookOpen;
  return (
    <div className={`border rounded-2xl overflow-hidden bg-card shadow-sm transition-all ${isOpen ? 'border-primary/30 shadow-md' : 'border-border'}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-primary text-primary-foreground' : 'bg-primary/10'}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-heading font-bold block">{section.title}</span>
            <span className="text-xs text-muted-foreground">{section.topics.length} tópico{section.topics.length > 1 ? 's' : ''}</span>
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 slide-up-fade">
          {section.image && (
            <div className="relative rounded-xl overflow-hidden border border-border mb-4 group">
              <img src={section.image} alt={section.title} className="w-full h-48 sm:h-56 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-2 left-3 right-3">
                <p className="text-white text-xs font-medium drop-shadow-lg">{section.title}</p>
              </div>
            </div>
          )}
          {section.topics.map((t, i) => (
            <div key={i} className="mb-4 last:mb-0 pb-4 last:pb-0 border-b border-border/50 last:border-0">
              <div className="flex items-start gap-2 mb-1.5">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{t.title}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2 pl-7">{t.content}</p>
              {t.steps && (
                <div className="pl-7 space-y-1.5 mb-2">
                  {t.steps.map((step, si) => (
                    <div key={si} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              )}
              {t.tip && (
                <div className="flex items-start gap-2 pl-7">
                  <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-xl p-2.5 w-full">
                    <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary/90 leading-relaxed"><span className="font-semibold">Dica: </span>{t.tip}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}