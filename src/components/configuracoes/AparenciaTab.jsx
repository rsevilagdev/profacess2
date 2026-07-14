import { useState } from 'react';
import { Palette, Type, Check } from 'lucide-react';
import { THEMES, FONT_SIZES, getStoredAppearance, applyAppearance } from '@/lib/themes.js';

export default function AparenciaTab() {
  const [current, setCurrent] = useState(getStoredAppearance());

  const selectTheme = (themeId) => {
    applyAppearance(themeId, current.fontSize);
    setCurrent({ theme: themeId, fontSize: current.fontSize });
  };

  const selectFont = (fontSizeId) => {
    applyAppearance(current.theme, fontSizeId);
    setCurrent({ theme: current.theme, fontSize: fontSizeId });
  };

  return (
    <div className="space-y-4">
      {/* Themes */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Temas do Sistema</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => selectTheme(theme.id)}
              className={`relative rounded-2xl border-2 p-3 flex flex-col items-center gap-2 transition-all hover:scale-105 ${current.theme === theme.id ? 'border-primary shadow-md' : 'border-border'}`}
            >
              <div className="h-12 w-12 rounded-full shadow-sm" style={{ background: theme.swatch }} />
              <span className="text-xs font-medium text-center leading-tight">{theme.name}</span>
              {current.theme === theme.id && (
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Type className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Tamanho da Fonte</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {FONT_SIZES.map(font => (
            <button
              key={font.id}
              onClick={() => selectFont(font.id)}
              className={`rounded-2xl border-2 p-4 flex flex-col items-center gap-1 transition-all ${current.fontSize === font.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
            >
              <span className="font-bold" style={{ fontSize: font.root === '14px' ? '0.875rem' : font.root === '16px' ? '1rem' : '1.125rem' }}>Aa</span>
              <span className="text-xs font-medium text-muted-foreground">{font.name}</span>
              {current.fontSize === font.id && <Check className="h-3 w-3 text-primary" />}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">As preferências são salvas automaticamente neste dispositivo.</p>
      </div>
    </div>
  );
}