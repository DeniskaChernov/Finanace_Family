import { randomUUID } from 'crypto';

// Безопасный алфавит без похожих символов (0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Публичный человекочитаемый ID: FIN-XXXXXX (общий между приложениями)
export function genPublicId() {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `FIN-${s}`;
}

// Внутренние id с префиксом
export const genUserId = () => `usr-${randomUUID().slice(0, 8)}`;
export const genFamilyId = () => `fam-${randomUUID().slice(0, 8)}`;
