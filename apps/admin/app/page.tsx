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
      return [
        parseInt(h.substring(0, 2), 16) || 0,
        parseInt(h.substring(2, 4), 16) || 0,
        parseInt(h.substring(4, 6), 16) || 0,
      ];
    };
    const shade = (hex: string, f: number) => {
      const [r, g, b] = hexRgb(hex);
      return `rgb(${Math.min(255, Math.round(r * f))},${Math.min(255, Math.round(g * f))},${Math.min(255, Math.round(b * f))})`;
    };

    /* ═══ TRUE 3D Perspective Projection ═══ */
    const FOV = 5;
    let vpX = 0, vpY = 0, groundMax = 0;
    const recalcVP = () => { vpX = W * 0.50; vpY = H * 0.22; groundMax = H * 0.62; };
    recalcVP();

    /* wx = world horizontal offset, wz = depth (0=near, bigger=far) */
    const proj = (wx: number, wz: number): { x: number; y: number; s: number } => {
      const s = FOV / (wz + FOV);
      return { x: vpX + wx * s, y: vpY + (groundMax - vpY) * s, s };
    };

    /* ═══ SKY ═══ */
    const drawSky = () => {
      const g = ctx.createLinearGradient(0, 0, 0, vpY + 40);
      g.addColorStop(0, '#dbeafe');
      g.addColorStop(0.6, '#e0f2fe');
      g.addColorStop(1, '#d1fae5');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, vpY + 40);
    };

    /* ═══ CLOUDS ═══ */
    const cloudData = [
      { bx: 0.10, by: 0.06, r: 52 },
      { bx: 0.35, by: 0.10, r: 40 },
      { bx: 0.58, by: 0.04, r: 58 },
      { bx: 0.78, by: 0.12, r: 34 },
      { bx: 0.93, by: 0.07, r: 44 },
    ];
    const drawClouds = (t: number) => {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#fff';
      for (const c of cloudData) {
        const cx = ((c.bx * W + t * 6) % (W + 300)) - 150;
        const cy = c.by * H;
        const r = c.r;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
        ctx.arc(cx - r * 0.45, cy + 4, r * 0.38, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.45, cy + 2, r * 0.42, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.15, cy - r * 0.28, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    /* ═══ GROUND (green landscape) ═══ */
    const drawGround = () => {
      const g = ctx.createLinearGradient(0, vpY, 0, H);
      g.addColorStop(0, '#86c06e');
      g.addColorStop(0.5, '#6db356');
      g.addColorStop(1, '#5ca844');
      ctx.fillStyle = g;
      ctx.fillRect(0, vpY - 2, W, H - vpY + 4);
    };

    /* ═══ PERSPECTIVE ROAD ═══ */
    const ROAD_HW = 140;
    const drawRoad = (t: number) => {
      const minZ = -3;
      const maxZ = 30;
      const N = 55;

      /* Road surface */
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const z = minZ + (i / N) * (maxZ - minZ);
        const p = proj(-ROAD_HW, z);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      for (let i = N; i >= 0; i--) {
        const z = minZ + (i / N) * (maxZ - minZ);
        const p = proj(ROAD_HW, z);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      const rg = ctx.createLinearGradient(0, vpY, 0, H);
      rg.addColorStop(0, '#71787f');
      rg.addColorStop(1, '#4b5563');
      ctx.fillStyle = rg;
      ctx.fill();

      /* Edge lines */
      for (const sign of [-1, 1]) {
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const z = minZ + (i / N) * (maxZ - minZ);
          const p = proj(ROAD_HW * sign * 0.96, z);
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      /* Animated center lane dashes */
      const dashW = 0.35, gapW = 0.35;
      const off = (t * 5) % (dashW + gapW);
      for (let z = -off; z < maxZ; z += dashW + gapW) {
        const z1 = Math.max(z, 0);
        const z2 = Math.min(z + dashW, maxZ);
        if (z2 <= z1) continue;
        const p1 = proj(0, z1);
        const p2 = proj(0, z2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(255,255,200,${Math.min(0.7 * p1.s, 0.7)})`;
        ctx.lineWidth = Math.max(3.5 * p1.s, 0.5);
        ctx.stroke();
      }

      /* Sidewalk strips */
      for (const sign of [-1, 1]) {
        ctx.beginPath();
        const sw = ROAD_HW * 1.15;
        for (let i = 0; i <= N; i++) {
          const z = minZ + (i / N) * (maxZ - minZ);
          const p1 = proj(ROAD_HW * sign, z);
          if (i === 0) { ctx.moveTo(p1.x, p1.y); } else { ctx.lineTo(p1.x, p1.y); }
        }
        for (let i = N; i >= 0; i--) {
          const z = minZ + (i / N) * (maxZ - minZ);
          const p2 = proj(sw * sign, z);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.closePath();
        ctx.fillStyle = '#94a3b0';
        ctx.fill();
      }
    };

    /* ═══ 3D DELIVERY TRUCK (hero element) ═══ */
    const drawTruck = (wx: number, wz: number, color: string, sz: number) => {
      const { x, y, s } = proj(wx, wz);
      const sc = s * sz;
      if (sc < 0.04) return;

      const bw = 145 * sc;   /* cargo length */
      const bh = 88 * sc;    /* cargo height */
      const d3 = 22 * sc;    /* 3D depth offset */
      const cw = 48 * sc;    /* cab width */
      const ch = bh * 0.68;  /* cab height */
      const wR = 14 * sc;    /* wheel radius */

      /* ── Ground shadow ── */
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.ellipse(x, y + 5 * sc, (bw + cw) * 0.52, 12 * sc, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();

      const bx = x - bw * 0.55;
      const by = y - bh;

      /* ── Cargo: SIDE face (main) ── */
      const sideGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
      sideGrad.addColorStop(0, shade(color, 1.05));
      sideGrad.addColorStop(1, color);
      ctx.fillStyle = sideGrad;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);

      /* ── Cargo: TOP face (3D) ── */
      ctx.fillStyle = shade(color, 1.2);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + d3, by - d3);
      ctx.lineTo(bx + bw + d3, by - d3);
      ctx.lineTo(bx + bw, by);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.stroke();

      /* ── Cargo: DEPTH face (3D right side) ── */
      ctx.fillStyle = shade(color, 0.7);
      ctx.beginPath();
      ctx.moveTo(bx + bw, by);
      ctx.lineTo(bx + bw + d3, by - d3);
      ctx.lineTo(bx + bw + d3, by + bh - d3);
      ctx.lineTo(bx + bw, by + bh);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.stroke();

      /* ── Brand stripe on cargo ── */
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(bx, by + bh * 0.75, bw, bh * 0.08);

      /* ── Package icon on cargo side ── */
      const iS = 24 * sc;
      const iX = bx + bw * 0.5;
      const iY = by + bh * 0.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = Math.max(2 * sc, 0.5);
      ctx.strokeRect(iX - iS / 2, iY - iS / 2, iS, iS);
      ctx.beginPath();
      ctx.moveTo(iX, iY - iS / 2); ctx.lineTo(iX, iY + iS / 2);
      ctx.moveTo(iX - iS / 2, iY); ctx.lineTo(iX + iS / 2, iY);
      ctx.stroke();
      /* small arrow on package */
      ctx.beginPath();
      ctx.moveTo(iX, iY - iS * 0.35);
      ctx.lineTo(iX - iS * 0.15, iY - iS * 0.15);
      ctx.moveTo(iX, iY - iS * 0.35);
      ctx.lineTo(iX + iS * 0.15, iY - iS * 0.15);
      ctx.stroke();

      /* ── Cab: SIDE ── */
      const cx = bx + bw + 3 * sc;
      const cy = y - ch;
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.strokeRect(cx, cy, cw, ch);

      /* ── Cab: TOP (3D) ── */
      ctx.fillStyle = '#d1d5db';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + d3 * 0.55, cy - d3 * 0.55);
      ctx.lineTo(cx + cw + d3 * 0.55, cy - d3 * 0.55);
      ctx.lineTo(cx + cw, cy);
      ctx.closePath();
      ctx.fill();

      /* ── Cab: DEPTH face (3D) ── */
      ctx.fillStyle = '#bfc5cc';
      ctx.beginPath();
      ctx.moveTo(cx + cw, cy);
      ctx.lineTo(cx + cw + d3 * 0.55, cy - d3 * 0.55);
      ctx.lineTo(cx + cw + d3 * 0.55, cy + ch - d3 * 0.55);
      ctx.lineTo(cx + cw, cy + ch);
      ctx.closePath();
      ctx.fill();

      /* ── Windshield ── */
      const wsX = cx + cw * 0.1;
      const wsY = cy + ch * 0.08;
      const wsW = cw * 0.8;
      const wsH = ch * 0.5;
      const gl = ctx.createLinearGradient(wsX, wsY, wsX, wsY + wsH);
      gl.addColorStop(0, '#93c5fd');
      gl.addColorStop(0.5, '#60a5fa');
      gl.addColorStop(1, '#3b82f6');
      ctx.fillStyle = gl;
      ctx.fillRect(wsX, wsY, wsW, wsH);
      /* Glass highlight */
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fillRect(wsX, wsY, wsW, wsH * 0.28);
      /* Window divider */
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(wsX + wsW * 0.48, wsY, wsW * 0.04, wsH);

      /* ── Headlights ── */
      const hlX = cx + cw - 2 * sc;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(hlX, cy + ch * 0.56, 4.5 * sc, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath(); ctx.arc(hlX, cy + ch * 0.76, 3.5 * sc, 0, Math.PI * 2); ctx.fill();

      /* ── Headlight glow ── */
      ctx.save();
      ctx.globalAlpha = 0.1;
      const glow = ctx.createRadialGradient(hlX + 4 * sc, cy + ch * 0.66, 0, hlX + 4 * sc, cy + ch * 0.66, 22 * sc);
      glow.addColorStop(0, '#fef08a');
      glow.addColorStop(1, 'rgba(254,240,138,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(hlX - 20 * sc, cy + ch * 0.35, 50 * sc, ch * 0.55);
      ctx.restore();

      /* ── Side mirror ── */
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(cx + cw + 1 * sc, cy + ch * 0.2, 4 * sc, 6 * sc);

      /* ── Bumper ── */
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(cx + cw - 3 * sc, y - 8 * sc, 6 * sc, 8 * sc);

      /* ── Exhaust pipe ── */
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(bx + 2 * sc, y - 4 * sc, 5 * sc, 4 * sc);

      /* ── Wheels (detailed) ── */
      const wheelXs = [bx + bw * 0.15, bx + bw * 0.42, bx + bw * 0.72, cx + cw * 0.5];
      for (const wx2 of wheelXs) {
        /* tire */
        ctx.fillStyle = '#1f2937';
        ctx.beginPath(); ctx.arc(wx2, y, wR, 0, Math.PI * 2); ctx.fill();
        /* rim */
        ctx.fillStyle = '#4b5563';
        ctx.beginPath(); ctx.arc(wx2, y, wR * 0.6, 0, Math.PI * 2); ctx.fill();
        /* hub cap */
        ctx.fillStyle = '#9ca3af';
        ctx.beginPath(); ctx.arc(wx2, y, wR * 0.25, 0, Math.PI * 2); ctx.fill();
        /* tire tread highlight */
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(wx2, y, wR * 0.85, -0.5, 0.5); ctx.stroke();
      }

      /* ── Wheel fender ── */
      ctx.fillStyle = shade(color, 0.6);
      for (const wx2 of [bx + bw * 0.15, bx + bw * 0.72]) {
        ctx.beginPath();
        ctx.arc(wx2, y - wR * 0.3, wR * 1.2, Math.PI, 0);
        ctx.lineTo(wx2 + wR * 1.2, y);
        ctx.lineTo(wx2 - wR * 1.2, y);
        ctx.closePath();
        ctx.fill();
      }
    };

    /* ═══ TREE ═══ */
    const drawTree = (wx: number, wz: number, ts: number) => {
      const { x, y, s } = proj(wx, wz);
      if (s < 0.04) return;
      const sc = s * ts;

      /* shadow */
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.beginPath();
      ctx.ellipse(x + 5 * sc, y + 2 * sc, 16 * sc, 5 * sc, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000'; ctx.fill();
      ctx.restore();

      /* trunk */
      ctx.fillStyle = '#78604a';
      ctx.fillRect(x - 3 * sc, y - 24 * sc, 6 * sc, 26 * sc);

      /* foliage */
      const layers: [number, number, number, string][] = [
        [0, -32, 20, 'rgba(22,163,74,0.8)'],
        [-9, -26, 14, 'rgba(34,197,94,0.7)'],
        [8, -28, 13, 'rgba(74,222,128,0.6)'],
        [0, -40, 12, 'rgba(34,197,94,0.55)'],
      ];
      for (const [dx, dy, r, c] of layers) {
        ctx.beginPath();
        ctx.arc(x + dx * sc, y + dy * sc, r * sc, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
      }
    };

    /* ═══ SMALL HOUSE (just context — NOT the focus) ═══ */
    const drawHouse = (wx: number, wz: number, roofCol: string) => {
      const { x, y, s } = proj(wx, wz);
      if (s < 0.06) return;
      const hw = 32 * s, hh = 26 * s, rh = 15 * s, d = 8 * s;

      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(x - hw / 2, y - hh, hw, hh);
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.strokeRect(x - hw / 2, y - hh, hw, hh);

      /* side (3D) */
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(x + hw / 2, y - hh); ctx.lineTo(x + hw / 2 + d, y - hh - d * 0.4);
      ctx.lineTo(x + hw / 2 + d, y - d * 0.4); ctx.lineTo(x + hw / 2, y);
      ctx.closePath(); ctx.fill();

      /* roof */
      ctx.fillStyle = roofCol;
      ctx.beginPath();
      ctx.moveTo(x - hw / 2 - 4 * s, y - hh);
      ctx.lineTo(x, y - hh - rh);
      ctx.lineTo(x + hw / 2 + 4 * s, y - hh);
      ctx.closePath(); ctx.fill();

      /* roof side (3D) */
      ctx.fillStyle = shade(roofCol, 0.65);
      ctx.beginPath();
      ctx.moveTo(x + hw / 2 + 4 * s, y - hh);
      ctx.lineTo(x, y - hh - rh);
      ctx.lineTo(x + d * 0.5, y - hh - rh - d * 0.3);
      ctx.lineTo(x + hw / 2 + 4 * s + d, y - hh - d * 0.4);
      ctx.closePath(); ctx.fill();

      /* door */
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x - 4 * s, y - 14 * s, 8 * s, 14 * s);
      /* window */
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(x + 6 * s, y - hh + 5 * s, 9 * s, 7 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x + 6 * s, y - hh + 5 * s, 9 * s, 2.5 * s);
    };

    /* ═══ 3D PACKAGE ═══ */
    const drawPackage = (wx: number, wz: number, wy: number) => {
      const { x, y: gy, s } = proj(wx, wz);
      if (s < 0.06) return;
      const py = gy - wy * 65 * s;
      const ps = 20 * s;
      const d = 6 * s;

      /* shadow */
      ctx.save(); ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.ellipse(x, gy + 2 * s, ps * 0.6, 3 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();

      /* front */
      ctx.fillStyle = '#d4a574';
      ctx.fillRect(x - ps / 2, py - ps / 2, ps, ps);
      ctx.strokeStyle = 'rgba(140,90,40,0.25)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x - ps / 2, py - ps / 2, ps, ps);

      /* top (3D) */
      ctx.fillStyle = '#e8c49a';
      ctx.beginPath();
      ctx.moveTo(x - ps / 2, py - ps / 2);
      ctx.lineTo(x - ps / 2 + d, py - ps / 2 - d);
      ctx.lineTo(x + ps / 2 + d, py - ps / 2 - d);
      ctx.lineTo(x + ps / 2, py - ps / 2);
      ctx.closePath(); ctx.fill();

      /* right (3D) */
      ctx.fillStyle = '#c09060';
      ctx.beginPath();
      ctx.moveTo(x + ps / 2, py - ps / 2);
      ctx.lineTo(x + ps / 2 + d, py - ps / 2 - d);
      ctx.lineTo(x + ps / 2 + d, py + ps / 2 - d);
      ctx.lineTo(x + ps / 2, py + ps / 2);
      ctx.closePath(); ctx.fill();

      /* tape */
      ctx.strokeStyle = 'rgba(180,140,80,0.5)';
      ctx.lineWidth = Math.max(1.5 * s, 0.5);
      ctx.beginPath();
      ctx.moveTo(x, py - ps / 2); ctx.lineTo(x, py + ps / 2);
      ctx.moveTo(x - ps / 2, py); ctx.lineTo(x + ps / 2, py);
      ctx.stroke();
    };

    /* ═══ PULSING LOCATION PIN ═══ */
    let pulse = 0;
    const drawPin = (wx: number, wz: number, color: string) => {
      const { x, y, s } = proj(wx, wz);
      if (s < 0.06) return;

      /* pulse ring */
      const r = (20 + Math.sin(pulse) * 7) * s;
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.sin(pulse) * 0.08;
      ctx.beginPath();
      ctx.arc(x, y - 24 * s, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.restore();

      /* pin body */
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - 15 * s, y - 20 * s, x - 15 * s, y - 44 * s, x, y - 48 * s);
      ctx.bezierCurveTo(x + 15 * s, y - 44 * s, x + 15 * s, y - 20 * s, x, y);
      ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      /* white dot */
      ctx.beginPath();
      ctx.arc(x, y - 30 * s, 6 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
    };

    /* ═══ GPS DELIVERY ROUTE ═══ */
    const drawRoute = (pts: [number, number][], t: number) => {
      if (pts.length < 2) return;
      ctx.save();
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -t * 50;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = primaryColor;
      ctx.globalAlpha = 0.4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = proj(pts[i][0], pts[i][1]);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    };

    /* ══════════════════════════════════════════════════
       SCENE OBJECTS — trucks are THE STAR
    ══════════════════════════════════════════════════ */
    type TruckData = { wx: number; wz: number; color: string; sz: number; speed: number };
    const truckList: TruckData[] = [
      { wx: 55, wz: 2, color: primaryColor, sz: 1.35, speed: 2.2 },
      { wx: -60, wz: 7, color: '#6366f1', sz: 1.15, speed: 1.6 },
      { wx: 45, wz: 12, color: '#f59e0b', sz: 1.05, speed: 2.5 },
      { wx: -50, wz: 18, color: primaryColor, sz: 1.0, speed: 1.8 },
      { wx: 52, wz: 24, color: '#ef4444', sz: 0.95, speed: 2.0 },
    ];

    const houseList = [
      { wx: -300, wz: 5, roof: '#dc2626' },
      { wx: 310, wz: 14, roof: '#2563eb' },
    ];

    const treeList = [
      { wx: -210, wz: 2.5, sz: 1.0 },
      { wx: 230, wz: 4, sz: 0.9 },
      { wx: -250, wz: 8, sz: 0.85 },
      { wx: 260, wz: 7, sz: 0.95 },
      { wx: -200, wz: 13, sz: 0.8 },
      { wx: 220, wz: 16, sz: 0.85 },
      { wx: -240, wz: 20, sz: 0.7 },
      { wx: 250, wz: 19, sz: 0.75 },
      { wx: -220, wz: 25, sz: 0.65 },
      { wx: 235, wz: 24, sz: 0.7 },
    ];

    const pkgList = [
      { wx: -290, wz: 5.5, wy: 0 },
      { wx: 320, wz: 14.5, wy: 0 },
      { wx: 70, wz: 4.5, wy: 0.4 },
      { wx: -60, wz: 15, wy: 0.35 },
      { wx: 55, wz: 20, wy: 0.3 },
    ];

    const pinList = [
      { wx: -300, wz: 5, color: primaryColor },
      { wx: 310, wz: 14, color: '#ef4444' },
    ];

    const routePts: [number, number][] = [
      [55, 0], [55, 5], [-60, 9], [45, 13], [-50, 18], [52, 24],
    ];

    /* ══════════════════════════════════════════════════
       RENDER LOOP
    ══════════════════════════════════════════════════ */
    let time = 0;
    const render = () => {
      recalcVP();
      ctx.clearRect(0, 0, W, H);

      drawSky();
      drawClouds(time);
      drawGround();
      drawRoad(time);
      drawRoute(routePts, time);

      /* Depth-sort all objects (farthest first = painter's algorithm) */
      type SceneObj = { wz: number; draw: () => void };
      const scene: SceneObj[] = [];
      for (const h of houseList) scene.push({ wz: h.wz, draw: () => drawHouse(h.wx, h.wz, h.roof) });
      for (const tr of treeList) scene.push({ wz: tr.wz, draw: () => drawTree(tr.wx, tr.wz, tr.sz) });
      for (const p of pkgList) scene.push({ wz: p.wz, draw: () => drawPackage(p.wx, p.wz, p.wy) });
      for (const tk of truckList) scene.push({ wz: tk.wz, draw: () => drawTruck(tk.wx, tk.wz, tk.color, tk.sz) });
      scene.sort((a, b) => b.wz - a.wz);
      for (const o of scene) o.draw();

      /* Pins always on top */
      for (const pin of pinList) drawPin(pin.wx, pin.wz, pin.color);

      /* ── Animate trucks driving toward viewer ── */
      for (const tk of truckList) {
        tk.wz -= tk.speed * 0.016;
        if (tk.wz < -3) tk.wz = 28;
      }
      /* floating packages bob */
      for (const p of pkgList) {
        if (p.wy > 0) p.wy = 0.35 + Math.sin(time * 2 + p.wx) * 0.12;
      }
      pulse += 0.04;
      time += 0.016;

      animId = requestAnimationFrame(render);
    };

    render();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [primaryColor]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/8 to-transparent" />
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
