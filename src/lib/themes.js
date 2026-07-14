// 10 temas profissionais para o sistema
export const THEMES = [
  { id: 'verde-teal', name: 'Verde Teal', primary: '173 100% 21%', accent: '173 40% 92%', ring: '173 100% 21%', chart2: '200 60% 45%', swatch: 'hsl(173 100% 21%)' },
  { id: 'azul-oceano', name: 'Azul Oceano', primary: '210 80% 30%', accent: '210 40% 92%', ring: '210 80% 30%', chart2: '180 60% 45%', swatch: 'hsl(210 80% 30%)' },
  { id: 'roxo-real', name: 'Roxo Real', primary: '270 60% 45%', accent: '270 40% 92%', ring: '270 60% 45%', chart2: '320 60% 50%', swatch: 'hsl(270 60% 45%)' },
  { id: 'vermelho-escarlate', name: 'Vermelho Escarlate', primary: '0 72% 40%', accent: '0 40% 92%', ring: '0 72% 40%', chart2: '30 80% 50%', swatch: 'hsl(0 72% 40%)' },
  { id: 'laranja-ambar', name: 'Laranja Âmbar', primary: '35 90% 42%', accent: '35 40% 92%', ring: '35 90% 42%', chart2: '15 80% 50%', swatch: 'hsl(35 90% 42%)' },
  { id: 'verde-floresta', name: 'Verde Floresta', primary: '140 60% 25%', accent: '140 30% 92%', ring: '140 60% 25%', chart2: '100 50% 40%', swatch: 'hsl(140 60% 25%)' },
  { id: 'cinza-grafite', name: 'Cinza Grafite', primary: '220 15% 30%', accent: '220 10% 92%', ring: '220 15% 30%', chart2: '200 15% 50%', swatch: 'hsl(220 15% 30%)' },
  { id: 'rosa-magenta', name: 'Rosa Magenta', primary: '320 70% 42%', accent: '320 40% 92%', ring: '320 70% 42%', chart2: '280 60% 50%', swatch: 'hsl(320 70% 42%)' },
  { id: 'azul-ciano', name: 'Azul Ciano', primary: '190 90% 33%', accent: '190 40% 92%', ring: '190 90% 33%', chart2: '210 70% 50%', swatch: 'hsl(190 90% 33%)' },
  { id: 'marrom-terracota', name: 'Marrom Terracota', primary: '20 55% 35%', accent: '20 30% 92%', ring: '20 55% 35%', chart2: '40 60% 45%', swatch: 'hsl(20 55% 35%)' },
];

export const FONT_SIZES = [
  { id: 'pequena', name: 'Pequena', root: '14px' },
  { id: 'media', name: 'Média', root: '16px' },
  { id: 'grande', name: 'Grande', root: '18px' },
];

const STORAGE_KEY = 'profarma_appearance';

export function getStoredAppearance() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { theme: 'verde-teal', fontSize: 'media' };
}

export function applyAppearance(themeId, fontSizeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const font = FONT_SIZES.find(f => f.id === fontSizeId) || FONT_SIZES[1];
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--ring', theme.ring);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--chart-1', theme.primary);
  root.style.setProperty('--chart-2', theme.chart2);
  root.style.setProperty('--sidebar-primary', theme.primary);
  root.style.setProperty('--sidebar-ring', theme.ring);
  root.style.setProperty('--font-size-base', font.root);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: theme.id, fontSize: font.id }));
}

export function initAppearance() {
  const { theme, fontSize } = getStoredAppearance();
  applyAppearance(theme, fontSize);
}