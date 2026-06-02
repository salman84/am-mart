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
  const [activeStep, setActiveStep] = useState(0);

  /* Parse primary color for rgba usage in JSX */
  const hexToRgb = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '').substring(0, 6);
    return [parseInt(h.substring(0, 2), 16) || 0, parseInt(h.substring(2, 4), 16) || 0, parseInt(h.substring(4, 6), 16) || 0];
  };
  const [pcR, pcG, pcB] = hexToRgb(primaryColor);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, animId = 0;

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

    /* ═══ Colour helpers ═══ */
    const hexRgb = (hex: string): [number, number, number] => {
      const h = hex.replace('#', '').substring(0, 6);
      return [parseInt(h.substring(0, 2), 16) || 0, parseInt(h.substring(2, 4), 16) || 0, parseInt(h.substring(4, 6), 16) || 0];
    };
    const [pR, pG, pB] = hexRgb(primaryColor);

    /* ═══ Animation timing ═══ */
    const CYCLE = 14; // seconds per full delivery cycle
    let elapsed = 0;
    let lastTime = performance.now();

    /* Phase boundaries (seconds) */
    const P = {
      ENTER: 0,        // 0-3s: Truck enters from right
      STOP: 3,         // 3-4.5s: Truck stopped, person exits
      WALK: 4.5,       // 4.5-6.5s: Person walks to customer
      HANDOFF: 6.5,    // 6.5-8.5s: Package handoff
      RETURN: 8.5,     // 8.5-10s: Person walks back
      LEAVE: 10,       // 10-13s: Truck leaves
      PAUSE: 13,       // 13-14s: Reset pause
    };

    /* ═══ Easing ═══ */
    const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    /* ═══ Draw sky ═══ */
    const drawSky = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
      grad.addColorStop(0, '#e8f4fd');
      grad.addColorStop(0.5, '#d4ecf9');
      grad.addColorStop(1, '#c5e4f5');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H * 0.55);

      /* Soft clouds */
      ctx.save();
      ctx.globalAlpha = 0.4;
      const drawCloud = (cx: number, cy: number, s: number) => {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 40 * s, 14 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - 25 * s, cy + 4 * s, 28 * s, 10 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 30 * s, cy + 2 * s, 32 * s, 11 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      drawCloud(W * 0.15, H * 0.1, 1.2);
      drawCloud(W * 0.55, H * 0.08, 0.9);
      drawCloud(W * 0.85, H * 0.14, 1.0);
      ctx.restore();
    };

    /* ═══ Draw background buildings (skyline) ═══ */
    const drawSkyline = () => {
      const groundY = H * 0.52;
      const bldgs: { x: number; w: number; h: number; color: string; windows: boolean }[] = [
        { x: W * 0.02, w: 50, h: 120, color: '#8a9bb0', windows: true },
        { x: W * 0.08, w: 35, h: 80, color: '#94a8be', windows: true },
        { x: W * 0.13, w: 60, h: 160, color: '#7b8fa5', windows: true },
        { x: W * 0.22, w: 45, h: 100, color: '#a0b0c2', windows: true },
        { x: W * 0.30, w: 55, h: 140, color: '#8696ab', windows: true },
        { x: W * 0.38, w: 40, h: 70, color: '#9aacbe', windows: false },
        { x: W * 0.55, w: 50, h: 130, color: '#8293a8', windows: true },
        { x: W * 0.63, w: 65, h: 170, color: '#7a8c9f', windows: true },
        { x: W * 0.72, w: 40, h: 90, color: '#96a6b8', windows: true },
        { x: W * 0.80, w: 55, h: 110, color: '#889aae', windows: true },
        { x: W * 0.90, w: 45, h: 150, color: '#7e90a4', windows: true },
      ];

      for (const b of bldgs) {
        const by = groundY - b.h;
        /* Building body */
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, by, b.w, b.h);
        /* Darker edge */
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(b.x + b.w - 3, by, 3, b.h);
        /* Top */
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(b.x, by, b.w, 3);

        if (b.windows) {
          const cols = Math.floor(b.w / 12);
          const rows = Math.floor(b.h / 18);
          for (let r = 1; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const wx = b.x + 5 + c * 12;
              const wy = by + 8 + r * 18;
              ctx.fillStyle = (r + c) % 3 === 0 ? 'rgba(255,240,180,0.7)' : 'rgba(180,210,240,0.5)';
              ctx.fillRect(wx, wy, 7, 10);
            }
          }
        }
      }
    };

    /* ═══ Draw foreground building (delivery destination — right side) ═══ */
    const drawDestBuilding = () => {
      const groundY = H * 0.52;
      const bx = W * 0.48;
      const bw = W * 0.18;
      const bh = H * 0.32;
      const by = groundY - bh;

      /* Main structure */
      const bGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      bGrad.addColorStop(0, '#d4c4b0');
      bGrad.addColorStop(1, '#c2ae96');
      ctx.fillStyle = bGrad;
      ctx.fillRect(bx, by, bw, bh);

      /* Right edge shading */
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(bx + bw - 5, by, 5, bh);

      /* Top accent */
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(bx, by, bw, 4);

      /* Windows - glass facade */
      const winCols = 4;
      const winRows = 5;
      const ww = bw * 0.16;
      const wh = bh * 0.10;
      const wGapX = (bw - winCols * ww) / (winCols + 1);
      const wGapY = (bh * 0.75 - winRows * wh) / (winRows + 1);

      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const wx = bx + wGapX + c * (ww + wGapX);
          const wy = by + 10 + wGapY + r * (wh + wGapY);
          /* Window glass */
          ctx.fillStyle = (r + c) % 4 === 0 ? 'rgba(255,245,200,0.8)' : 'rgba(160,210,255,0.6)';
          ctx.fillRect(wx, wy, ww, wh);
          /* Window frame */
          ctx.strokeStyle = 'rgba(120,90,60,0.2)';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(wx, wy, ww, wh);
          /* Reflection */
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(wx, wy, ww, wh * 0.3);
        }
      }

      /* Door / entrance */
      const doorW = bw * 0.22;
      const doorH = bh * 0.18;
      const doorX = bx + bw * 0.39;
      const doorY = groundY - doorH;
      /* Door recess */
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(doorX - 3, doorY - 3, doorW + 6, doorH + 3);
      /* Door glass */
      ctx.fillStyle = 'rgba(120,180,220,0.5)';
      ctx.fillRect(doorX, doorY, doorW, doorH);
      /* Door frame */
      ctx.strokeStyle = 'rgba(80,60,40,0.3)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(doorX, doorY, doorW, doorH);
      /* Door handle */
      ctx.fillStyle = '#a08060';
      ctx.fillRect(doorX + doorW * 0.75, doorY + doorH * 0.45, 3, 8);

      /* Small awning over door */
      ctx.fillStyle = `rgba(${pR},${pG},${pB},0.7)`;
      ctx.beginPath();
      ctx.moveTo(doorX - 10, doorY - 2);
      ctx.lineTo(doorX + doorW + 10, doorY - 2);
      ctx.lineTo(doorX + doorW + 5, doorY + 8);
      ctx.lineTo(doorX - 5, doorY + 8);
      ctx.closePath();
      ctx.fill();
    };

    /* ═══ Draw road ═══ */
    const drawRoad = () => {
      const roadTop = H * 0.52;
      const roadH = H * 0.18;

      /* Sidewalk top */
      ctx.fillStyle = '#c8bfb0';
      ctx.fillRect(0, roadTop, W, 12);

      /* Road surface */
      const rGrad = ctx.createLinearGradient(0, roadTop + 12, 0, roadTop + roadH);
      rGrad.addColorStop(0, '#5a5e65');
      rGrad.addColorStop(0.5, '#4a4e55');
      rGrad.addColorStop(1, '#3e4248');
      ctx.fillStyle = rGrad;
      ctx.fillRect(0, roadTop + 12, W, roadH - 12);

      /* Lane markings (dashed center line) */
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 15]);
      ctx.beginPath();
      ctx.moveTo(0, roadTop + roadH * 0.5);
      ctx.lineTo(W, roadTop + roadH * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      /* Edge lines */
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, roadTop + 14);
      ctx.lineTo(W, roadTop + 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, roadTop + roadH - 2);
      ctx.lineTo(W, roadTop + roadH - 2);
      ctx.stroke();

      /* Sidewalk bottom */
      ctx.fillStyle = '#c8bfb0';
      ctx.fillRect(0, roadTop + roadH, W, 10);

      /* Ground below */
      const gGrad = ctx.createLinearGradient(0, roadTop + roadH + 10, 0, H);
      gGrad.addColorStop(0, '#8ab87a');
      gGrad.addColorStop(1, '#6fa060');
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, roadTop + roadH + 10, W, H - (roadTop + roadH + 10));
    };

    /* ═══ Draw trees ═══ */
    const drawTrees = () => {
      const treeY = H * 0.52;
      const treePositions = [W * 0.05, W * 0.20, W * 0.35, W * 0.75, W * 0.92];
      for (const tx of treePositions) {
        /* Trunk */
        ctx.fillStyle = '#6b5a42';
        ctx.fillRect(tx - 3, treeY - 40, 6, 40);

        /* Foliage layers */
        ctx.fillStyle = 'rgba(34,140,60,0.85)';
        ctx.beginPath();
        ctx.arc(tx, treeY - 50, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(46,170,75,0.7)';
        ctx.beginPath();
        ctx.arc(tx - 10, treeY - 42, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tx + 12, treeY - 44, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(60,190,90,0.5)';
        ctx.beginPath();
        ctx.arc(tx, treeY - 60, 11, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    /* ═══ Draw delivery truck (side view) ═══ */
    const drawTruck = (tx: number, ty: number, scale: number, flipped: boolean) => {
      ctx.save();
      ctx.translate(tx, ty);
      if (flipped) ctx.scale(-1, 1);
      const s = scale;

      /* Shadow */
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.ellipse(0, 10 * s, 55 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();

      /* ── Cargo body ── */
      const cargoW = 70 * s, cargoH = 45 * s;
      const cargoX = -35 * s, cargoY = -50 * s;

      /* Body */
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.roundRect(cargoX, cargoY, cargoW, cargoH, [4 * s, 4 * s, 2 * s, 2 * s]);
      ctx.fill();

      /* Body shading */
      const bodyGrad = ctx.createLinearGradient(cargoX, cargoY, cargoX, cargoY + cargoH);
      bodyGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
      bodyGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
      bodyGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(cargoX, cargoY, cargoW, cargoH);

      /* "Deliver" text on cargo */
      ctx.save();
      if (flipped) ctx.scale(-1, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `bold ${11 * s}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      const textX = flipped ? 0 : 0;
      ctx.fillText('Deliver', textX, cargoY + cargoH * 0.45);
      ctx.font = `${6 * s}px Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('Door-to-Door Delivery', textX, cargoY + cargoH * 0.68);
      ctx.restore();

      /* ── Cab ── */
      const cabW = 30 * s, cabH = 35 * s;
      const cabX = 35 * s, cabY = -40 * s;

      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.roundRect(cabX, cabY, cabW, cabH, [0, 8 * s, 2 * s, 0]);
      ctx.fill();

      /* Cab darker shade */
      const [cr, cg, cb] = hexRgb(primaryColor);
      ctx.fillStyle = `rgb(${Math.max(0, cr - 25)},${Math.max(0, cg - 25)},${Math.max(0, cb - 25)})`;
      ctx.fillRect(cabX, cabY, cabW, cabH);

      /* Windshield */
      ctx.fillStyle = '#a8d8ea';
      ctx.beginPath();
      ctx.roundRect(cabX + 4 * s, cabY + 4 * s, cabW - 8 * s, cabH * 0.55, [2 * s]);
      ctx.fill();
      /* Windshield reflection */
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(cabX + 6 * s, cabY + 5 * s, cabW * 0.3, cabH * 0.25);

      /* Headlight */
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(cabX + cabW - 3 * s, cabY + cabH * 0.6, 5 * s, 8 * s, [2 * s]);
      ctx.fill();

      /* ── Wheels ── */
      const wheelY = -2 * s;
      const wheels = [-20 * s, 42 * s];
      for (const wx of wheels) {
        /* Tire */
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(wx, wheelY, 10 * s, 0, Math.PI * 2);
        ctx.fill();
        /* Rim */
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(wx, wheelY, 6 * s, 0, Math.PI * 2);
        ctx.fill();
        /* Hub */
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(wx, wheelY, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      /* ── Bumper ── */
      ctx.fillStyle = '#64748b';
      ctx.fillRect(cabX + cabW - 2 * s, cabY + cabH - 5 * s, 5 * s, 10 * s);

      ctx.restore();
    };

    /* ═══ Draw person (delivery man or customer) ═══ */
    const drawPerson = (px: number, py: number, scale: number, isDelivery: boolean, hasPackage: boolean, facingLeft: boolean) => {
      ctx.save();
      ctx.translate(px, py);
      const s = scale;
      const dir = facingLeft ? -1 : 1;

      /* Shadow */
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.ellipse(0, 2 * s, 10 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();

      /* Legs */
      ctx.fillStyle = isDelivery ? '#2d3748' : '#6b7280';
      ctx.fillRect(-5 * s, -14 * s, 4 * s, 16 * s);
      ctx.fillRect(1 * s, -14 * s, 4 * s, 16 * s);

      /* Shoes */
      ctx.fillStyle = isDelivery ? '#1a202c' : '#92400e';
      ctx.fillRect(-6 * s, 0, 6 * s, 3 * s);
      ctx.fillRect(0, 0, 6 * s, 3 * s);

      /* Body / torso */
      ctx.fillStyle = isDelivery ? primaryColor : '#ec4899';
      ctx.beginPath();
      ctx.roundRect(-7 * s, -30 * s, 14 * s, 18 * s, [2 * s]);
      ctx.fill();

      /* Arms */
      if (hasPackage) {
        /* Arms holding package */
        ctx.fillStyle = isDelivery ? primaryColor : '#ec4899';
        ctx.fillRect(dir * 4 * s, -26 * s, dir * 10 * s, 4 * s);
        /* Package */
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(dir * 10 * s, -30 * s, 10 * s, 10 * s);
        ctx.strokeStyle = 'rgba(140,90,40,0.3)';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(dir * 10 * s, -30 * s, 10 * s, 10 * s);
        /* Tape on package */
        ctx.strokeStyle = 'rgba(180,140,80,0.6)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(dir * 10 * s + 5 * s, -30 * s);
        ctx.lineTo(dir * 10 * s + 5 * s, -20 * s);
        ctx.stroke();
      } else {
        /* Arms at sides */
        ctx.fillStyle = isDelivery ? primaryColor : '#ec4899';
        ctx.fillRect(-9 * s, -28 * s, 3 * s, 12 * s);
        ctx.fillRect(6 * s, -28 * s, 3 * s, 12 * s);
      }

      /* Head */
      ctx.fillStyle = '#f5d6b8';
      ctx.beginPath();
      ctx.arc(0, -36 * s, 7 * s, 0, Math.PI * 2);
      ctx.fill();

      /* Hat (delivery) or hair (customer) */
      if (isDelivery) {
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.ellipse(0, -41 * s, 9 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-7 * s, -43 * s, 14 * s, 5 * s);
      } else {
        /* Hair for customer (woman) */
        ctx.fillStyle = '#4a3728';
        ctx.beginPath();
        ctx.arc(0, -38 * s, 8 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-8 * s, -38 * s, 16 * s, 3 * s);
        /* Long hair sides */
        ctx.fillRect(-8 * s, -38 * s, 3 * s, 14 * s);
        ctx.fillRect(5 * s, -38 * s, 3 * s, 14 * s);
      }

      /* Face — simple */
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(dir * 2.5 * s, -37 * s, 1 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    /* ═══ Render loop ═══ */
    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      elapsed = (elapsed + dt) % CYCLE;

      ctx.clearRect(0, 0, W, H);

      /* Scene layers */
      drawSky();
      drawSkyline();
      drawDestBuilding();
      drawTrees();
      drawRoad();

      /* ── Compute animation positions ── */
      const roadY = H * 0.52 + H * 0.18 * 0.35; // truck vertical center on road
      const truckStopX = W * 0.32; // truck stops left of building, person walks right to door
      const truckScale = 1.3;
      const personScale = 1.1;

      /* Customer position — standing near building entrance */
      const customerX = W * 0.55;
      const customerY = H * 0.52 - 2;

      /* Delivery person: exits from right/back of truck (truck faces left), walks right to customer */
      const deliveryStartX = truckStopX + 65;
      const deliveryEndX = customerX - 18;
      const deliveryY = H * 0.52 - 2;

      let truckX = 0;
      let showDeliveryPerson = false;
      let deliveryPersonX = deliveryStartX;
      let deliveryHasPackage = true;
      let showCustomer = true;
      let customerHasPackage = false;
      let deliveryFacingLeft = false;
      let truckFlipped = true; // truck ALWAYS faces left (cab on left, cargo back on right)
      let step = 0;

      if (elapsed < P.STOP) {
        /* Phase 0: Truck enters from right, driving left */
        const t = ease(elapsed / P.STOP);
        truckX = W + 100 - (W + 100 - truckStopX) * t;
        step = 1; // In Transit
      } else if (elapsed < P.WALK) {
        /* Phase 1: Truck stopped, delivery person exits from back of truck */
        truckX = truckStopX;
        showDeliveryPerson = true;
        deliveryPersonX = deliveryStartX;
        deliveryHasPackage = true;
        deliveryFacingLeft = false; // facing right toward customer
        step = 2; // Out for Delivery
      } else if (elapsed < P.HANDOFF) {
        /* Phase 2: Person walks right toward customer at building */
        truckX = truckStopX;
        showDeliveryPerson = true;
        const t = ease((elapsed - P.WALK) / (P.HANDOFF - P.WALK));
        deliveryPersonX = deliveryStartX + (deliveryEndX - deliveryStartX) * t;
        deliveryHasPackage = true;
        deliveryFacingLeft = false; // facing right
        step = 2;
      } else if (elapsed < P.RETURN) {
        /* Phase 3: Package handoff at building door */
        truckX = truckStopX;
        showDeliveryPerson = true;
        deliveryPersonX = deliveryEndX;
        const ht = (elapsed - P.HANDOFF) / (P.RETURN - P.HANDOFF);
        deliveryHasPackage = ht < 0.4;
        customerHasPackage = ht >= 0.4;
        deliveryFacingLeft = false;
        step = 3; // Delivered
      } else if (elapsed < P.LEAVE) {
        /* Phase 4: Person walks back left to truck */
        truckX = truckStopX;
        showDeliveryPerson = true;
        const t = ease((elapsed - P.RETURN) / (P.LEAVE - P.RETURN));
        deliveryPersonX = deliveryEndX - (deliveryEndX - deliveryStartX) * t;
        deliveryHasPackage = false;
        customerHasPackage = true;
        deliveryFacingLeft = true; // facing left back to truck
        step = 3;
      } else if (elapsed < P.PAUSE) {
        /* Phase 5: Truck leaves to left */
        const t = ease((elapsed - P.LEAVE) / (P.PAUSE - P.LEAVE));
        truckX = truckStopX - (truckStopX + 150) * t;
        customerHasPackage = true;
        step = 3;
      } else {
        /* Phase 6: Pause / reset */
        truckX = W + 200;
        step = 0;
      }

      /* Draw truck */
      drawTruck(truckX, roadY, truckScale, truckFlipped);

      /* Draw customer */
      if (showCustomer) {
        drawPerson(customerX, customerY, personScale, false, customerHasPackage, true);
      }

      /* Draw delivery person */
      if (showDeliveryPerson) {
        drawPerson(deliveryPersonX, deliveryY, personScale, true, deliveryHasPackage, deliveryFacingLeft);
      }

      /* Update step for React state (throttled) */
      if (step !== activeStep) {
        setActiveStep(step);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [primaryColor]);

  /* ═══ Delivery progress steps ═══ */
  const steps = [
    { label: 'Order Confirmed', icon: '✓' },
    { label: 'In Transit', icon: '🚛' },
    { label: 'Out for Delivery', icon: '📦' },
    { label: 'Delivered', icon: '🏠' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* ── Delivery Progress Card (left) ── */}
      <div className="hidden lg:block absolute top-8 left-8 w-56 z-[1]">
        <div className="rounded-2xl p-4 shadow-lg border border-white/30"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
          <p className="text-xs font-bold text-gray-700 mb-3 tracking-wide uppercase">Delivery Progress</p>
          <div className="space-y-0">
            {steps.map((s, i) => {
              const done = i <= activeStep;
              const current = i === activeStep;
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-500 ${
                        done
                          ? 'border-transparent text-white shadow-md'
                          : 'border-gray-200 text-gray-400 bg-white'
                      }`}
                      style={done ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                    >
                      {done ? s.icon : (i + 1)}
                    </div>
                    {i < steps.length - 1 && (
                      <div className="w-0.5 h-5 my-0.5 rounded transition-all duration-500"
                        style={{ backgroundColor: i < activeStep ? primaryColor : '#e5e7eb' }} />
                    )}
                  </div>
                  <div className="pt-1">
                    <p className={`text-xs font-semibold transition-colors duration-500 ${
                      current ? 'text-gray-900' : done ? 'text-gray-600' : 'text-gray-400'
                    }`}>{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Map Card (right) ── */}
      <div className="hidden lg:block absolute top-8 right-8 w-52 z-[1]">
        <div className="rounded-2xl p-3 shadow-lg border border-white/30"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
          <p className="text-xs font-bold text-gray-700 mb-2 tracking-wide uppercase">Live Tracking</p>
          {/* Mini map SVG */}
          <div className="relative w-full h-28 rounded-xl overflow-hidden bg-green-50 mb-2">
            <svg viewBox="0 0 200 120" className="w-full h-full">
              {/* Map roads */}
              <rect x="0" y="50" width="200" height="8" fill="#d1d5db" rx="2" />
              <rect x="80" y="0" width="8" height="120" fill="#d1d5db" rx="2" />
              <rect x="0" y="90" width="200" height="6" fill="#e5e7eb" rx="2" />
              <rect x="140" y="0" width="6" height="120" fill="#e5e7eb" rx="2" />

              {/* Route line (animated) */}
              <path d="M 30 54 L 84 54 L 84 20" fill="none"
                stroke={primaryColor} strokeWidth="3" strokeDasharray="6 4"
                strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.5s" repeatCount="indefinite" />
              </path>

              {/* Start point */}
              <circle cx="30" cy="54" r="5" fill={primaryColor} opacity="0.5">
                <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="30" cy="54" r="3" fill={primaryColor} />

              {/* Destination pin */}
              <g>
                <circle cx="84" cy="20" r="8" fill={primaryColor} opacity="0.2">
                  <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.2;0.05;0.2" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="84" cy="20" r="5" fill={primaryColor} />
                <circle cx="84" cy="20" r="2" fill="white" />
              </g>

              {/* Truck dot moving along route */}
              <circle r="3.5" fill="white" stroke={primaryColor} strokeWidth="1.5">
                <animateMotion dur="3s" repeatCount="indefinite" path="M 30 54 L 84 54 L 84 20" />
              </circle>

              {/* Buildings as small rectangles */}
              <rect x="95" y="35" width="12" height="16" fill="#cbd5e1" rx="1" />
              <rect x="112" y="30" width="10" height="21" fill="#94a3b8" rx="1" />
              <rect x="95" y="60" width="15" height="12" fill="#b0bec5" rx="1" />
              <rect x="50" y="60" width="10" height="10" fill="#b0bec5" rx="1" />
              <rect x="155" y="40" width="18" height="14" fill="#a0aab4" rx="1" />
              <rect x="10" y="60" width="14" height="10" fill="#cbd5e1" rx="1" />
            </svg>
          </div>
          {/* ETA bar */}
          <div className="rounded-lg p-2" style={{ backgroundColor: `rgba(${pcR},${pcG},${pcB},0.08)` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold" style={{ color: primaryColor }}>Arriving Soon</span>
              <span className="text-[10px] text-gray-500">2.1 km</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full animate-pulse" style={{ width: '65%', backgroundColor: primaryColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* White overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/50 via-white/15 to-white/5" />
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
  const heroBgVideoLoop = g('LP_HERO_VIDEO_LOOP', 'true') === 'true';
  const heroBgVideoFit = g('LP_HERO_VIDEO_FIT', 'cover') as 'cover' | 'contain' | 'fill';
  const heroBgVideoPosition = g('LP_HERO_VIDEO_POSITION', 'center');
  const heroBgVideoOverlay = parseInt(g('LP_HERO_VIDEO_OVERLAY', '40'), 10);

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
              <video
                autoPlay
                muted
                playsInline
                loop={heroBgVideoLoop}
                className="w-full h-full"
                style={{
                  objectFit: heroBgVideoFit,
                  objectPosition: heroBgVideoPosition,
                }}
              >
                <source src={heroBgVideo} type="video/mp4" />
                <source src={heroBgVideo} type="video/webm" />
              </video>
              {heroBgVideoOverlay > 0 && (
                <div className="absolute inset-0" style={{ backgroundColor: `rgba(255,255,255,${heroBgVideoOverlay / 100})` }} />
              )}
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
