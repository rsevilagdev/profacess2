import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function DropdownCell({ values, displayValue }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!values || values.length <= 1) {
    return <span>{displayValue || '—'}</span>;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-primary hover:underline"
      >
        <span className="truncate max-w-[150px]">{displayValue}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
        <span className="text-xs text-muted-foreground shrink-0">({values.length})</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl p-1.5 max-h-52 overflow-y-auto min-w-[200px]">
          {values.map((v, i) => (
            <div key={i} className="text-xs py-1 px-2 hover:bg-muted rounded whitespace-normal break-words">
              {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}