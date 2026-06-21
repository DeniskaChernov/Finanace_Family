// Генератор настоящих PNG-иконок (без внешних зависимостей).
// Рисуем премиум-иконку: диагональный градиент + растущие столбцы со стрелкой.
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// ---- CRC32 ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---- helpers ----
const lerp = (a, b, t) => a + (b - a) * t;
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// Рисуем на canvas с супер-сэмплингом SS, затем даунсэмплим
function renderIcon(size, { monochrome = false } = {}) {
  const SS = 4;
  const S = size * SS;
  const buf = Buffer.alloc(S * S * 4); // float-ish accumulation not needed; we draw directly

  const C1 = [99, 102, 241];   // #6366f1 indigo
  const C2 = [139, 92, 246];   // #8b5cf6 violet
  const C3 = [168, 85, 247];   // #a855f7 purple

  // фон-градиент по диагонали
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      if (monochrome) {
        buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0;
        continue;
      }
      const t = (x / S + y / S) / 2; // 0..1 диагональ
      let col = t < 0.5 ? mix(C1, C2, t * 2) : mix(C2, C3, (t - 0.5) * 2);
      // мягкий радиальный блик сверху-слева
      const dx = x / S - 0.32, dy = y / S - 0.28;
      const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 1.6);
      col = [
        Math.min(255, col[0] + glow * 30),
        Math.min(255, col[1] + glow * 30),
        Math.min(255, col[2] + glow * 35),
      ];
      buf[i] = col[0] | 0; buf[i + 1] = col[1] | 0; buf[i + 2] = col[2] | 0; buf[i + 3] = 255;
    }
  }

  // Растущие столбцы (3 шт.) + точка-стрелка
  const bars = [
    { x: 0.30, h: 0.26 },
    { x: 0.46, h: 0.40 },
    { x: 0.62, h: 0.54 },
  ];
  const barW = 0.11 * S;
  const baseY = 0.70 * S;
  const radius = barW * 0.42;

  function fillRoundRect(px, py, w, h, r, color, alpha) {
    const x0 = Math.floor(px), y0 = Math.floor(py);
    const x1 = Math.ceil(px + w), y1 = Math.ceil(py + h);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (x < 0 || y < 0 || x >= S || y >= S) continue;
        // скруглённые углы (только верхние сильнее)
        let inside = true;
        const corners = [
          [px + r, py + r], [px + w - r, py + r],
          [px + r, py + h - r], [px + w - r, py + h - r],
        ];
        // верхние углы скруглены
        if (x < px + r && y < py + r) inside = (x - corners[0][0]) ** 2 + (y - corners[0][1]) ** 2 <= r * r;
        else if (x > px + w - r && y < py + r) inside = (x - corners[1][0]) ** 2 + (y - corners[1][1]) ** 2 <= r * r;
        else if (x < px + r && y > py + h - r) inside = (x - corners[2][0]) ** 2 + (y - corners[2][1]) ** 2 <= r * r;
        else if (x > px + w - r && y > py + h - r) inside = (x - corners[3][0]) ** 2 + (y - corners[3][1]) ** 2 <= r * r;
        if (!inside) continue;
        const i = (y * S + x) * 4;
        if (monochrome) {
          buf[i] = 255; buf[i + 1] = 255; buf[i + 2] = 255; buf[i + 3] = 255;
        } else {
          // белый с лёгкой прозрачностью поверх градиента
          const a = alpha;
          buf[i] = lerp(buf[i], color[0], a) | 0;
          buf[i + 1] = lerp(buf[i + 1], color[1], a) | 0;
          buf[i + 2] = lerp(buf[i + 2], color[2], a) | 0;
          buf[i + 3] = 255;
        }
      }
    }
  }

  bars.forEach((b, idx) => {
    const px = b.x * S;
    const h = b.h * S;
    const alpha = monochrome ? 1 : 0.78 + idx * 0.07;
    fillRoundRect(px, baseY - h, barW, h, radius, [255, 255, 255], alpha);
  });

  // даунсэмпл box-filter SSxSS -> size
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, bl = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * S + (x * SS + sx)) * 4;
          r += buf[i]; g += buf[i + 1]; bl += buf[i + 2]; a += buf[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = (r / n) | 0; out[o + 1] = (g / n) | 0; out[o + 2] = (bl / n) | 0; out[o + 3] = (a / n) | 0;
    }
  }
  return encodePNG(size, size, out);
}

mkdirSync('public/icons', { recursive: true });
const targets = [
  ['public/icons/icon-512.png', 512, {}],
  ['public/icons/icon-192.png', 192, {}],
  ['public/icons/icon-180.png', 180, {}],
  ['public/icons/badge-72.png', 72, { monochrome: true }],
];
for (const [path, size, opts] of targets) {
  writeFileSync(path, renderIcon(size, opts));
  console.log('✓', path, size + 'px');
}
console.log('Готово.');
