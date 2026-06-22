// Локальная дата в формате YYYY-MM-DD — БЕЗ UTC-сдвига.
// Критично для UTC+5 (Узбекистан): toISOString() ночью даёт «вчера».
export const ymd = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
