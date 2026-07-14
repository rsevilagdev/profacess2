import { ChevronUp, ChevronDown, ScanLine, Truck, ShieldAlert, LayoutGrid, ScrollText, Activity, Bell, Download, Settings, BookOpen } from 'lucide-react';

const ICON_MAP = { ScanLine, Truck, ShieldAlert, LayoutGrid, ScrollText, Activity, Bell, Download, Settings, BookOpen };

export default function ManualSection({ section, isOpen, onToggle }) {
  const Icon = ICON_MAP[section.icon] || BookOpen;
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-heading font-bold">{section.title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 fade-in">
          {section.image && (
            <img src={section.image} alt={section.title} className="w-full h-44 object-cover rounded-xl border border-border mb-3" />
          )}
          {section.topics.map((t, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <p className="text-sm font-medium text-foreground mb-0.5">{t.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}