'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  ShoppingBag, Smartphone, Zap, TrendingUp, ArrowRight, Download,
  Star, Shield, Truck, ChevronDown, Globe,
  MessageCircle, Mail, Phone, CheckCircle,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────── */
interface CMS { [key: string]: string }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/* ─── Fade-in on scroll component ────────────────────────────────────── */
function FadeIn({ children, className = '', delay = 0, direction = 'up' }: {
  children: React.ReactNode; className?: string; delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const initial: any = { opacity: 0 };
  const animate: any = isInView ? { opacity: 1 } : {};
  if (direction === 'up')    { initial.y = 40; animate.y = 0; }
  if (direction === 'down')  { initial.y = -40; animate.y = 0; }
  if (direction === 'left')  { initial.x = 40; animate.x = 0; }
  if (direction === 'right') { initial.x = -40; animate.x = 0; }

  return (
    <motion.div ref={ref} initial={initial} animate={animate}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Counter animation ──────────────────────────────────────────────── */
function AnimatedCount({ value, suffix = '' }: { value: string; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');
  const num = parseInt(value.replace(/[^0-9]/g, '')) || 0;

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = num;
    const duration = 2000;
    const step = Math.max(1, Math.floor(end / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { start = end; clearInterval(timer); }
      setDisplay(start.toLocaleString());
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, num]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ─── Service icon mapping ───────────────────────────────────────────── */
const SERVICE_ICONS: Record<string, any> = {
  shopping: ShoppingBag, grocery: ShoppingBag,
  sim: Smartphone, phone: Smartphone, mobile: Smartphone,
  topup: Zap, recharge: Zap, flash: Zap,
  exchange: TrendingUp, rate: TrendingUp, money: TrendingUp,
  delivery: Truck, shipping: Truck,
  global: Globe, international: Globe,
};

function getServiceIcon(iconKey: string) {
  const lower = (iconKey || '').toLowerCase();
  for (const [key, Icon] of Object.entries(SERVICE_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return Star;
}

const SERVICE_COLORS = [
  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
];

/* ─── 3D Isometric City Background — Canvas-based realistic delivery scene ── */
function DeliveryMapAnimation({ primaryColor }: { primaryColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, animId = 0;

    /* ── Resize handling ── */
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    /* ── Isometric projection ── */
    const TW = 56, TH = 28; // tile width / height
    const iso = (gx: number, gy: number): [number, number] => [
      (gx - gy) * TW / 2 + W * 0.52,
      (gx + gy) * TH / 2 - 80,
    ];

    /* ── Seeded random for consistent city layout ── */
    let _s = 54321;
    const srand = () => { _s = (_s * 16807) % 2147483647; return (_s & 0x7fffffff) / 0x7fffffff; };

    /* ── City grid: 20×20  (0=road, >0=building height, -1=tree, -2=park) ── */
    const G = 20;
    const grid: number[][] = [];
    for (let y = 0; y < G; y++) {
      grid[y] = [];
      for (let x = 0; x < G; x++) {
        if (x % 5 === 0 || y % 5 === 0) { grid[y][x] = 0; }
        else {
          const r = srand();
          if (r < 0.07) grid[y][x] = -1;
          else if (r < 0.12) grid[y][x] = -2;
          else grid[y][x] = 2 + Math.floor(srand() * 7);
        }
      }
    }

    /* ── Building colour palettes ── */
    const hexAlpha = (hex: string, a: string) => hex.length >= 7 ? hex + a : hex;
    const pals = [
      { top: '#d2e6f5', left: '#7aacd4', right: '#5088b4', win: 'rgba(170,215,255,0.6)', edge: 'rgba(60,110,160,0.12)' },
      { top: '#dde2e8', left: '#9ba8b8', right: '#6e7f94', win: 'rgba(255,255,255,0.35)', edge: 'rgba(0,0,0,0.08)' },
      { top: '#f2e8d4', left: '#ccb490', right: '#a89070', win: 'rgba(255,240,200,0.4)', edge: 'rgba(120,90,50,0.1)' },
      { top: hexAlpha(primaryColor, '50'), left: hexAlpha(primaryColor, 'a0'), right: hexAlpha(primaryColor, 'c8'), win: 'rgba(255,255,255,0.35)', edge: hexAlpha(primaryColor, '20') },
      { top: '#b0c4cc', left: '#556670', right: '#3c4c58', win: 'rgba(160,200,240,0.55)', edge: 'rgba(0,0,0,0.1)' },
    ];
    const pal = (gx: number, gy: number) => pals[(gx * 7 + gy * 13) % pals.length];

    /* ── Drawing helpers ── */

    /* Flat isometric diamond */
    const drawDiamond = (sx: number, sy: number, col: string) => {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + TW / 2, sy + TH / 2);
      ctx.lineTo(sx, sy + TH);
      ctx.lineTo(sx - TW / 2, sy + TH / 2);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    };

    /* 3D building with top / left / right faces, windows, edge highlights */
    const drawBuilding = (sx: number, sy: number, h: number, p: typeof pals[0]) => {
      const pH = h * 10; // pixel height
      const hw = TW / 2, hh = TH / 2;

      /* — Ground shadow — */
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.beginPath();
      ctx.moveTo(sx + 4, sy + hh + 4);
      ctx.lineTo(sx + hw + 4, sy + TH + 4);
      ctx.lineTo(sx + hw + pH * 0.28, sy + TH + pH * 0.16);
      ctx.lineTo(sx + pH * 0.28, sy + hh + pH * 0.16);
      ctx.closePath();
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();

      /* — Left face — */
      ctx.beginPath();
      ctx.moveTo(sx - hw, sy + hh);
      ctx.lineTo(sx, sy + TH);
      ctx.lineTo(sx, sy + TH - pH);
      ctx.lineTo(sx - hw, sy + hh - pH);
      ctx.closePath();
      ctx.fillStyle = p.left;
      ctx.fill();
      ctx.strokeStyle = p.edge;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      /* Windows — left face */
      const floors = Math.min(h - 1, 7);
      const fH = pH / h;
      for (let f = 0; f < floors; f++) {
        for (let w = 0; w < 2; w++) {
          const wy = sy + hh - pH + 4 + f * fH;
          const wx = sx - hw + 5 + w * (hw - 8);
          ctx.fillStyle = p.win;
          ctx.fillRect(wx, wy, 8, Math.min(5, fH - 3));
          /* Glass highlight */
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(wx, wy, 8, 2);
        }
      }

      /* — Right face — */
      ctx.beginPath();
      ctx.moveTo(sx, sy + TH);
      ctx.lineTo(sx + hw, sy + hh);
      ctx.lineTo(sx + hw, sy + hh - pH);
      ctx.lineTo(sx, sy + TH - pH);
      ctx.closePath();
      ctx.fillStyle = p.right;
      ctx.fill();
      ctx.strokeStyle = p.edge;
      ctx.stroke();

      /* Windows — right face */
      for (let f = 0; f < floors; f++) {
        for (let w = 0; w < 2; w++) {
          const wy = sy + hh - pH + 4 + f * fH;
          const wx = sx + 4 + w * (hw - 8);
          ctx.fillStyle = p.win;
          ctx.fillRect(wx, wy, 8, Math.min(5, fH - 3));
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(wx, wy, 8, 2);
        }
      }

      /* — Top face — */
      ctx.beginPath();
      ctx.moveTo(sx, sy - pH);
      ctx.lineTo(sx + hw, sy + hh - pH);
      ctx.lineTo(sx, sy + TH - pH);
      ctx.lineTo(sx - hw, sy + hh - pH);
      ctx.closePath();
      ctx.fillStyle = p.top;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      /* Roof AC unit on taller buildings */
      if (h >= 6) {
        ctx.fillStyle = 'rgba(120,130,140,0.35)';
        ctx.fillRect(sx - 5, sy - pH + hh - 3, 10, 4);
      }
    };

    /* 3D tree */
    const drawTree = (sx: number, sy: number) => {
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.beginPath();
      ctx.ellipse(sx + 4, sy + TH / 2 + 3, 10, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#7c6a50';
      ctx.fillRect(sx - 1.5, sy - 4, 3, 12);

      const layers: [number, number, number, string][] = [
        [0, -16, 11, 'rgba(22,163,74,0.75)'],
        [-5, -12, 8, 'rgba(34,197,94,0.65)'],
        [5, -13, 7, 'rgba(74,222,128,0.55)'],
        [0, -20, 6, 'rgba(34,197,94,0.5)'],
      ];
      for (const [dx, dy, r, c] of layers) {
        ctx.beginPath();
        ctx.arc(sx + dx, sy + dy, r, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
      }
    };

    /* Road lane markings */
    const drawRoadTile = (sx: number, sy: number, gx: number, gy: number) => {
      drawDiamond(sx, sy, '#b8bec6');
      /* Center dashes */
      if (gx % 5 === 0 && gy % 2 === 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(sx - 1, sy + TH / 2 - 1, 3, 3);
      }
      if (gy % 5 === 0 && gx % 2 === 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(sx - 1, sy + TH / 2 - 1, 3, 3);
      }
      /* Intersection crosswalk */
      if (gx % 5 === 0 && gy % 5 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(sx - 4, sy + TH / 2 - 2, 8, 4);
      }
    };

    /* ── Vehicles ── */
    type VehicleData = { path: number[][]; progress: number; speed: number; color: string; size: number };
    const vehicles: VehicleData[] = [
      { path: [[0,5],[5,5],[10,5],[15,5],[19,5],[19,10],[19,15],[15,15],[10,15],[5,15],[0,15]], progress: 0, speed: 0.00035, color: primaryColor, size: 1 },
      { path: [[5,0],[5,5],[5,10],[5,15],[5,19],[10,19],[15,19],[15,15],[15,10],[15,5],[15,0]], progress: 0.45, speed: 0.00028, color: '#6366f1', size: 0.85 },
      { path: [[10,0],[10,5],[10,10],[10,15],[10,19]], progress: 0.15, speed: 0.0005, color: '#f59e0b', size: 0.7 },
    ];

    const vehiclePos = (v: VehicleData): [number, number] => {
      const n = v.path.length - 1;
      const e = v.progress * n;
      const i = Math.min(Math.floor(e), n - 1);
      const f = e - i;
      const a = v.path[i], b = v.path[i + 1];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    };

    const drawVehicle = (gx: number, gy: number, v: VehicleData) => {
      const [sx, sy] = iso(gx, gy);
      const s = v.size;

      /* Shadow */
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.ellipse(sx, sy + 6 * s, 14 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();

      /* Cargo — left face */
      ctx.beginPath();
      ctx.moveTo(sx - 13 * s, sy - 2 * s);
      ctx.lineTo(sx, sy + 5 * s);
      ctx.lineTo(sx, sy + 5 * s - 14 * s);
      ctx.lineTo(sx - 13 * s, sy - 2 * s - 14 * s);
      ctx.closePath();
      ctx.fillStyle = v.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      /* Cargo — right face */
      ctx.beginPath();
      ctx.moveTo(sx, sy + 5 * s);
      ctx.lineTo(sx + 10 * s, sy - 1 * s);
      ctx.lineTo(sx + 10 * s, sy - 1 * s - 14 * s);
      ctx.lineTo(sx, sy + 5 * s - 14 * s);
      ctx.closePath();
      ctx.fillStyle = v.color + 'bb';
      ctx.fill();
      ctx.stroke();

      /* Cargo — top face */
      ctx.beginPath();
      ctx.moveTo(sx - 3 * s, sy - 12 * s);
      ctx.lineTo(sx + 10 * s, sy - 1 * s - 14 * s);
      ctx.lineTo(sx, sy + 5 * s - 14 * s);
      ctx.lineTo(sx - 13 * s, sy - 2 * s - 14 * s);
      ctx.closePath();
      ctx.fillStyle = v.color + '88';
      ctx.fill();

      /* Cab windshield */
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(sx + 5 * s, sy - 12 * s, 6 * s, 7 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(sx + 5 * s, sy - 12 * s, 6 * s, 3 * s);

      /* Headlight */
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(sx + 11 * s, sy - 3 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();

      /* Wheels */
      [[-8, 3], [5, 0]].forEach(([dx, dy]) => {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(sx + dx * s, sy + dy * s, 3.5 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(sx + dx * s, sy + dy * s, 1.8 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(sx + dx * s, sy + dy * s, 0.7 * s, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    /* ── Location pin ── */
    let pulse = 0;
    const drawPin = (gx: number, gy: number, color: string) => {
      const [sx, sy] = iso(gx, gy);
      const r = 14 + Math.sin(pulse) * 5;
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(pulse) * 0.06;
      ctx.beginPath();
      ctx.arc(sx, sy - 10, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(sx, sy + 4);
      ctx.bezierCurveTo(sx - 10, sy - 10, sx - 10, sy - 26, sx, sy - 28);
      ctx.bezierCurveTo(sx + 10, sy - 26, sx + 10, sy - 10, sx, sy + 4);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sx, sy - 16, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    };

    /* ── Delivery route dashes (drawn on road surface) ── */
    const drawRoute = (from: number[], to: number[], t: number) => {
      const [x1, y1] = iso(from[0], from[1]);
      const [x2, y2] = iso(to[0], to[1]);
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 30;
      ctx.strokeStyle = primaryColor;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1 + TH / 2);
      ctx.lineTo(x2, y2 + TH / 2);
      ctx.stroke();
      ctx.restore();
    };

    /* ══════════════════════════════════════════════════════════════════════
       RENDER LOOP
    ══════════════════════════════════════════════════════════════════════ */
    let time = 0;
    const render = () => {
      ctx.clearRect(0, 0, W, H);

      /* Sky / ground gradient */
      const sky = ctx.createLinearGradient(0, 0, W * 0.3, H);
      sky.addColorStop(0, '#f4f7fa');
      sky.addColorStop(1, '#e8eef4');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      /* Collect all drawables and sort by depth (gx+gy) for painter's algorithm */
      type Drawable = { depth: number; draw: () => void };
      const drawables: Drawable[] = [];

      for (let y = 0; y < G; y++) {
        for (let x = 0; x < G; x++) {
          const [sx, sy] = iso(x, y);
          if (sx < -60 || sx > W + 60 || sy < -120 || sy > H + 120) continue;

          const v = grid[y][x];
          const d = x + y;

          if (v === 0) {
            drawables.push({ depth: d, draw: () => drawRoadTile(sx, sy, x, y) });
          } else if (v === -1) {
            drawables.push({ depth: d, draw: () => { drawDiamond(sx, sy, '#c8e8c8'); drawTree(sx, sy); } });
          } else if (v === -2) {
            drawables.push({ depth: d, draw: () => drawDiamond(sx, sy, '#bce0b8') });
          } else {
            drawables.push({ depth: d + v * 0.1, draw: () => { drawDiamond(sx, sy, '#d0d4d8'); drawBuilding(sx, sy, v, pal(x, y)); } });
          }
        }
      }

      /* Insert vehicles into draw order */
      for (const v of vehicles) {
        const [vx, vy] = vehiclePos(v);
        drawables.push({ depth: vx + vy + 0.05, draw: () => drawVehicle(vx, vy, v) });
      }

      /* Sort and draw */
      drawables.sort((a, b) => a.depth - b.depth);
      for (const d of drawables) d.draw();

      /* Delivery route (animated dashes along road surface) */
      const routeWaypoints = [[1, 5], [5, 5], [10, 5], [15, 5], [15, 10], [15, 15]];
      for (let i = 0; i < routeWaypoints.length - 1; i++) {
        drawRoute(routeWaypoints[i], routeWaypoints[i + 1], time);
      }

      /* Location pins (drawn last — always on top) */
      drawPin(1, 15, primaryColor);
      drawPin(17, 3, '#ef4444');

      /* Update state */
      for (const v of vehicles) {
        v.progress += v.speed;
        if (v.progress >= 1) v.progress = 0;
      }
      pulse += 0.045;
      time += 0.016;

      animId = requestAnimationFrame(render);
    };

    render();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [primaryColor]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/55 via-white/20 to-white/10" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN LANDING PAGE — all content from Admin Panel CMS                 */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [cms, setCms] = useState<CMS>({});
  const { scrollYProgress } = useScroll();
  const headerBg = useTransform(scrollYProgress, [0, 0.05], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)']);
  const headerShadow = useTransform(scrollYProgress, [0, 0.05], ['0 0 0 transparent', '0 1px 20px rgba(0,0,0,0.08)']);

  useEffect(() => {
    fetch(`${API_URL}/admin/public-settings`)
      .then(r => r.json())
      .then(data => setCms(data || {}))
      .catch(() => {});
  }, []);

  // CMS getter with default
  const g = (key: string, fallback: string) => cms[key] || fallback;
  const appName = g('APP_NAME', 'Our App');
  const appLogo = cms['APP_LOGO'] || '';
  const primaryColor = g('PRIMARY_COLOR', '#10B981');

  // ── Hero ──
  const heroTitle = g('LP_HERO_TITLE', 'Everything You Need, Delivered');
  const heroSubtitle = g('LP_HERO_SUBTITLE', 'Shop groceries, recharge phones, get SIM cards, and compare exchange rates — all from one powerful app.');
  const heroCta1 = g('LP_HERO_CTA_PRIMARY', 'Download App');
  const heroCta2 = g('LP_HERO_CTA_SECONDARY', 'Learn More');

  // ── Stats ──
  const stats = [
    { value: g('LP_STATS_CUSTOMERS', '10000'), label: 'Happy Customers', suffix: '+' },
    { value: g('LP_STATS_PRODUCTS', '5000'), label: 'Products', suffix: '+' },
    { value: g('LP_STATS_SELLERS', '200'), label: 'Trusted Sellers', suffix: '+' },
    { value: g('LP_STATS_DELIVERIES', '50000'), label: 'Deliveries Made', suffix: '+' },
  ];

  // ── Services ──
  const services = [1, 2, 3, 4].map((i) => ({
    title: g(`LP_SERVICE_${i}_TITLE`, ['Grocery Shopping', 'Mobile Top-Up', 'SIM Cards', 'Exchange Rates'][i - 1]),
    desc: g(`LP_SERVICE_${i}_DESC`, [
      'Fresh produce, meat, dairy, and household essentials delivered to your door.',
      'Instant mobile recharge for any carrier, local or international.',
      'Browse and reserve phone numbers. Pick your perfect last 4 digits.',
      'Compare real-time exchange rates from multiple providers to get the best deal.',
    ][i - 1]),
    icon: g(`LP_SERVICE_${i}_ICON`, ['shopping', 'topup', 'sim', 'exchange'][i - 1]),
  }));

  // ── Why choose us ──
  const whyTitle = g('LP_WHY_TITLE', 'Why Choose Us');
  const whySubtitle = g('LP_WHY_SUBTITLE', 'Built for convenience, designed for trust');
  const features = [1, 2, 3].map((i) => ({
    title: g(`LP_FEATURE_${i}_TITLE`, ['Fast & Reliable', 'Secure Payments', '24/7 Support'][i - 1]),
    desc: g(`LP_FEATURE_${i}_DESC`, [
      'Get your orders delivered quickly with real-time tracking.',
      'Your transactions are protected with bank-grade security.',
      'Our support team is always here to help you.',
    ][i - 1]),
  }));
  const featureIcons = [Truck, Shield, MessageCircle];

  // ── How it works ──
  const stepsTitle = g('LP_STEPS_TITLE', 'How It Works');
  const steps = [1, 2, 3].map((i) => ({
    title: g(`LP_STEP_${i}_TITLE`, ['Download the App', 'Browse & Order', 'Get it Delivered'][i - 1]),
    desc: g(`LP_STEP_${i}_DESC`, [
      'Available on Android and iOS. Quick setup, no hassle.',
      'Explore products, services, and deals curated for you.',
      'Sit back and relax. We handle the rest.',
    ][i - 1]),
  }));

  // ── Testimonials ──
  const testimonials = [1, 2, 3].map((i) => ({
    quote: g(`LP_TESTIMONIAL_${i}_QUOTE`, [
      'The best delivery app I\'ve ever used. Fresh products every time!',
      'SIM card ordering is so easy. Love the number selection feature!',
      'Exchange rates comparison saved me so much money. Highly recommend!',
    ][i - 1]),
    name: g(`LP_TESTIMONIAL_${i}_NAME`, ['Sarah K.', 'Ahmed M.', 'Ji-Young P.'][i - 1]),
    company: g(`LP_TESTIMONIAL_${i}_COMPANY`, ['Customer', 'Customer', 'Customer'][i - 1]),
  }));

  // ── Download ──
  const downloadTitle = g('LP_DOWNLOAD_TITLE', 'Download the App Now');
  const downloadSubtitle = g('LP_DOWNLOAD_SUBTITLE', 'Available on Android and iOS. Start shopping in minutes.');
  const playStoreUrl = g('LP_PLAY_STORE_URL', '#');
  const appStoreUrl = g('LP_APP_STORE_URL', '#');
  const qrAndroid = cms['LP_QR_ANDROID'] || '';
  const qrIos = cms['LP_QR_IOS'] || '';

  // ── Support / Footer ──
  const supportTitle = g('LP_SUPPORT_TITLE', 'Need Help?');
  const supportDesc = g('LP_SUPPORT_DESC', 'Our support team is available around the clock to assist you.');
  const supportEmail = g('SUPPORT_EMAIL', 'support@example.com');
  const supportPhone = g('SUPPORT_PHONE', '');
  const footerText = g('LP_FOOTER_TEXT', appName + ' — Your trusted marketplace for groceries, mobile services, and more.');
  const footerCopyright = g('LP_FOOTER_COPYRIGHT', `© ${new Date().getFullYear()} ${appName}. All rights reserved.`);

  // ── Nav labels ──
  const navFeatures = g('LP_NAV_FEATURES', 'Services');
  const navHow = g('LP_NAV_HOW_IT_WORKS', 'How It Works');
  const navTestimonials = g('LP_NAV_TESTIMONIALS', 'Reviews');
  const navContact = g('LP_NAV_CONTACT', 'Contact');

  // ── Hero background ──
  const heroBgType = g('LP_HERO_BG_TYPE', 'animation'); // 'animation' | 'image' | 'video' | 'none'
  const heroBgImage = cms['LP_HERO_BG_IMAGE'] || '';
  const heroBgVideo = cms['LP_HERO_BG_VIDEO'] || '';

  // ── Screenshots ──
  const screenshot1 = cms['LP_APP_SCREENSHOT_1'] || '';

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ═══════════════ FIXED HEADER ═══════════════ */}
      <motion.header
        style={{ backgroundColor: headerBg, boxShadow: headerShadow }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {appLogo ? (
              <img src={appLogo} alt={appName} className="h-9 w-auto object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: primaryColor }}>
                {appName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-lg hidden sm:block">{appName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: navFeatures, id: 'services' },
              { label: navHow, id: 'how-it-works' },
              { label: navTestimonials, id: 'reviews' },
              { label: navContact, id: 'contact' },
            ].map((item) => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                {item.label}
              </button>
            ))}
          </nav>
          <button onClick={() => scrollTo('download')}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
            style={{ backgroundColor: primaryColor }}>
            {heroCta1}
          </button>
        </div>
      </motion.header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Dynamic background — admin can switch between animation/image/video/none */}
        <div className="absolute inset-0 z-0">
          {heroBgType === 'animation' && <DeliveryMapAnimation primaryColor={primaryColor} />}
          {heroBgType === 'image' && heroBgImage && (
            <div className="absolute inset-0">
              <img src={heroBgImage} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-white/70" />
            </div>
          )}
          {heroBgType === 'video' && heroBgVideo && (
            <div className="absolute inset-0">
              <video autoPlay muted loop playsInline className="w-full h-full object-cover">
                <source src={heroBgVideo} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-white/70" />
            </div>
          )}
          {heroBgType === 'none' && (
            <>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-15"
                style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }} />
              <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10"
                style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }} />
            </>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <FadeIn>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm text-sm font-medium text-gray-700 mb-6">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                  Available on Android &amp; iOS
                </div>
              </FadeIn>
              <FadeIn delay={0.1}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
                  {heroTitle.split(' ').map((word, i, arr) =>
                    i >= arr.length - 2
                      ? <span key={i} style={{ color: primaryColor }}>{word} </span>
                      : <span key={i}>{word} </span>
                  )}
                </h1>
              </FadeIn>
              <FadeIn delay={0.2}>
                <p className="text-lg text-gray-600 mb-8 max-w-lg leading-relaxed">{heroSubtitle}</p>
              </FadeIn>
              <FadeIn delay={0.3}>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => scrollTo('download')}
                    className="group px-7 py-3.5 rounded-full text-white font-semibold text-base flex items-center gap-2 transition-all hover:scale-105 hover:shadow-xl"
                    style={{ backgroundColor: primaryColor }}>
                    <Download className="w-5 h-5" /> {heroCta1}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <button onClick={() => scrollTo('services')}
                    className="px-7 py-3.5 rounded-full border-2 border-gray-200 font-semibold text-base hover:border-gray-400 transition-all">
                    {heroCta2}
                  </button>
                </div>
              </FadeIn>
            </div>

            {/* Phone mockup */}
            <FadeIn direction="right" delay={0.3}>
              <div className="relative flex justify-center">
                <div className="relative">
                  <div className="w-[280px] h-[560px] rounded-[3rem] border-[8px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-gray-900 rounded-b-2xl z-10" />
                    {screenshot1 ? (
                      <img src={screenshot1} alt="App Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white p-6"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, #1a1a2e)` }}>
                        {appLogo ? (
                          <img src={appLogo} alt={appName} className="w-24 h-24 object-contain mb-4" />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                            <span className="text-3xl font-bold">{appName.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                        <p className="text-xl font-bold">{appName}</p>
                        <p className="text-sm text-white/70 mt-1">{g('APP_TAGLINE', 'Your trusted marketplace')}</p>
                      </div>
                    )}
                  </div>
                  {/* Floating badges */}
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -left-16 top-20 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Order Delivered</p>
                      <p className="text-[10px] text-gray-500">Just now</p>
                    </div>
                  </motion.div>
                  <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -right-12 bottom-32 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
                      <Zap className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Top-Up Success</p>
                      <p className="text-[10px] text-gray-500">Instant recharge</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>

        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <ChevronDown className="w-6 h-6 text-gray-500" />
        </motion.div>
      </section>

      {/* ═══════════════ STATS ═══════════════ */}
      <section className="py-16 border-y border-gray-100" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${primaryColor}03)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-extrabold" style={{ color: primaryColor }}>
                    <AnimatedCount value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-sm text-gray-600 mt-1 font-medium">{stat.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SERVICES ═══════════════ */}
      <section id="services" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>Our Services</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold">
                {g('LP_MARKET_TITLE', 'One App, Everything You Need')}
              </h2>
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
                {g('LP_MARKET_SUBTITLE', 'From daily groceries to mobile services, we\'ve got you covered.')}
              </p>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((svc, i) => {
              const Icon = getServiceIcon(svc.icon);
              const color = SERVICE_COLORS[i % SERVICE_COLORS.length];
              return (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className={`p-6 rounded-2xl border ${color.border} ${color.bg} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full`}>
                    <div className={`w-12 h-12 rounded-xl ${color.bg} ${color.text} flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{svc.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{svc.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ WHY CHOOSE US ═══════════════ */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>Why Choose Us</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold">{whyTitle}</h2>
              <p className="text-gray-600 mt-4 max-w-xl mx-auto">{whySubtitle}</p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feat, i) => {
              const Icon = featureIcons[i];
              return (
                <FadeIn key={i} delay={i * 0.15}>
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center">
                    <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5"
                      style={{ backgroundColor: primaryColor + '15', color: primaryColor }}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{feat.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>Simple Steps</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold">{stepsTitle}</h2>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-16 left-[16.5%] right-[16.5%] h-0.5 bg-gray-200" />
            {steps.map((step, i) => (
              <FadeIn key={i} delay={i * 0.2}>
                <div className="text-center relative">
                  <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white font-bold text-xl mb-5 relative z-10 shadow-lg"
                    style={{ backgroundColor: primaryColor }}>
                    {i + 1}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <section id="reviews" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>Testimonials</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold">What Our Customers Say</h2>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 0.15}>
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 italic mb-6 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: primaryColor }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.company}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ DOWNLOAD ═══════════════ */}
      <section id="download" className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 -z-10"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }} />
        <div className="absolute inset-0 -z-10 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{downloadTitle}</h2>
            <p className="text-white/80 max-w-xl mx-auto mb-12 text-lg">{downloadSubtitle}</p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-12">
              {/* Android */}
              <div className="flex flex-col items-center gap-4">
                {qrAndroid && (
                  <div className="bg-white p-3 rounded-2xl shadow-lg">
                    <img src={qrAndroid} alt="Android QR Code" className="w-40 h-40 object-contain" />
                  </div>
                )}
                <a href={playStoreUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 rounded-xl px-6 py-3 transition-all hover:scale-105">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.144 1.24a1 1 0 0 1 0 1.732l-2.144 1.24-2.53-2.53 2.53-2.53-.001.001zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wider text-white/70">Get it on</p>
                    <p className="font-semibold text-base -mt-0.5">Google Play</p>
                  </div>
                </a>
              </div>

              {/* iOS */}
              <div className="flex flex-col items-center gap-4">
                {qrIos && (
                  <div className="bg-white p-3 rounded-2xl shadow-lg">
                    <img src={qrIos} alt="iOS QR Code" className="w-40 h-40 object-contain" />
                  </div>
                )}
                <a href={appStoreUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 rounded-xl px-6 py-3 transition-all hover:scale-105">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wider text-white/70">Download on the</p>
                    <p className="font-semibold text-base -mt-0.5">App Store</p>
                  </div>
                </a>
              </div>
            </div>
          </FadeIn>

          {!qrAndroid && !qrIos && (
            <FadeIn delay={0.3}>
              <p className="text-white/50 text-sm">QR codes can be uploaded from the Admin Panel &rarr; Landing Page settings</p>
            </FadeIn>
          )}
        </div>
      </section>

      {/* ═══════════════ CONTACT ═══════════════ */}
      <section id="contact" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <FadeIn>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{supportTitle}</h2>
              <p className="text-gray-600 mb-10">{supportDesc}</p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <a href={`mailto:${supportEmail}`}
                  className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow transition-all">
                  <Mail className="w-5 h-5" style={{ color: primaryColor }} />
                  <span className="font-medium text-sm">{supportEmail}</span>
                </a>
                <a href={`tel:${supportPhone}`}
                  className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow transition-all">
                  <Phone className="w-5 h-5" style={{ color: primaryColor }} />
                  <span className="font-medium text-sm">{supportPhone}</span>
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-gray-100 py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {appLogo ? (
                <img src={appLogo} alt={appName} className="h-8 w-auto object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: primaryColor }}>
                  {appName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-gray-600">{footerText}</span>
            </div>
            <p className="text-xs text-gray-400">{footerCopyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
