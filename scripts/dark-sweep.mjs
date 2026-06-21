// Замена захардкоженных светлых tailwind-утилит на тёмно-дружелюбные тинты.
// Полупрозрачные акценты красиво смотрятся и на тёмном, и на светлом фоне.
import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  'src/app/components/Dashboard.tsx',
  'src/app/components/Journal.tsx',
  'src/app/components/Screens.tsx',
  'src/app/components/ui.tsx',
];

// [regex, replacement]. Word-boundary \b защищает от bg-emerald-500 → corruption.
const map = [
  // фоновые пастели → полупрозрачные тинты
  [/\bbg-emerald-50\b/g, 'bg-emerald-500/10'],
  [/\bbg-green-50\b/g, 'bg-emerald-500/10'],
  [/\bbg-red-50\b/g, 'bg-rose-500/10'],
  [/\bbg-blue-50\b/g, 'bg-indigo-500/10'],
  [/\bbg-amber-50\b/g, 'bg-amber-500/10'],
  [/\bbg-orange-50\b/g, 'bg-orange-500/10'],
  [/\bbg-purple-50\b/g, 'bg-violet-500/10'],
  // текстовые цвета → светлее на тон (читаемо на тёмном)
  [/\btext-emerald-600\b/g, 'text-emerald-400'],
  [/\btext-green-600\b/g, 'text-emerald-400'],
  [/\btext-red-500\b/g, 'text-rose-400'],
  [/\btext-red-600\b/g, 'text-rose-400'],
  [/\btext-red-400\b/g, 'text-rose-300'],
  [/\btext-red-700\b/g, 'text-rose-300'],
  [/\btext-blue-600\b/g, 'text-indigo-400'],
  [/\btext-blue-700\b/g, 'text-indigo-300'],
  [/\btext-blue-500\b/g, 'text-indigo-400'],
  [/\btext-amber-600\b/g, 'text-amber-400'],
  [/\btext-amber-700\b/g, 'text-amber-300'],
  [/\btext-amber-500\b/g, 'text-amber-400'],
  [/\btext-orange-500\b/g, 'text-orange-400'],
  // бордеры → полупрозрачные
  [/\bborder-emerald-100\b/g, 'border-emerald-500/20'],
  [/\bborder-emerald-200\b/g, 'border-emerald-500/30'],
  [/\bborder-red-100\b/g, 'border-rose-500/20'],
  [/\bborder-red-200\b/g, 'border-rose-500/30'],
  [/\bborder-blue-100\b/g, 'border-indigo-500/20'],
  [/\bborder-amber-100\b/g, 'border-amber-500/20'],
  [/\bborder-amber-200\b/g, 'border-amber-500/30'],
  [/\bborder-orange-100\b/g, 'border-orange-500/20'],
  // solid white (НЕ bg-white/20 на градиентах) → поверхность
  [/\bbg-white(?![\w/-])/g, 'bg-[var(--surface-2)]'],
];

let total = 0;
for (const f of files) {
  let src = readFileSync(f, 'utf8');
  let count = 0;
  for (const [re, rep] of map) {
    src = src.replace(re, () => { count++; return rep; });
  }
  writeFileSync(f, src);
  console.log(`${f}: ${count} замен`);
  total += count;
}
console.log(`Итого: ${total} замен`);
