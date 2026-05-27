import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Device classification ─────────────────────────────────────────────────
export const isTablet = SCREEN_WIDTH >= 768;
export const isLargeTablet = SCREEN_WIDTH >= 1024;
export const isPhone = !isTablet;
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isIPad = isIOS && isTablet;

export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

// ── Base design dimensions (designed for iPhone 14 @ 390pt wide) ──────────
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// ── Scale utilities ───────────────────────────────────────────────────────

/**
 * Horizontally scale a value relative to the base design width.
 * Use for widths, paddings, margins.
 */
export const scale = (size: number): number => {
  const ratio = isTablet ? Math.min(SCREEN_WIDTH / BASE_WIDTH, 1.5) : SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(size * ratio));
};

/**
 * Vertically scale a value relative to the base design height.
 * Use for heights, vertical paddings.
 */
export const verticalScale = (size: number): number => {
  const ratio = isTablet ? Math.min(SCREEN_HEIGHT / BASE_HEIGHT, 1.4) : SCREEN_HEIGHT / BASE_HEIGHT;
  return Math.round(PixelRatio.roundToNearestPixel(size * ratio));
};

/**
 * Scale with a moderation factor so values don't grow too fast on large screens.
 * factor=0 → no scaling, factor=1 → full scaling.
 * Use for font sizes.
 */
export const moderateScale = (size: number, factor = 0.4): number => {
  return Math.round(size + (scale(size) - size) * factor);
};

// ── Font sizes — auto-scaled ──────────────────────────────────────────────
export const fontSize = {
  xs: moderateScale(11),
  sm: moderateScale(12),
  base: moderateScale(14),
  md: moderateScale(15),
  lg: moderateScale(16),
  xl: moderateScale(18),
  '2xl': moderateScale(20),
  '3xl': moderateScale(24),
  '4xl': moderateScale(28),
  '5xl': moderateScale(32),
};

// ── Spacing — auto-scaled ─────────────────────────────────────────────────
export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  base: scale(16),
  lg: scale(20),
  xl: scale(24),
  '2xl': scale(32),
  '3xl': scale(48),
};

// ── Grid helpers ──────────────────────────────────────────────────────────

/** Number of columns for product grids */
export const PRODUCT_GRID_COLUMNS = isLargeTablet ? 4 : isTablet ? 3 : 2;

/** Number of columns for category grids */
export const CATEGORY_GRID_COLUMNS = isLargeTablet ? 6 : isTablet ? 5 : 4;

/** Max content width for iPad (constrain so it doesn't stretch too wide) */
export const MAX_CONTENT_WIDTH = isTablet ? 680 : SCREEN_WIDTH;

/** Card width for horizontal scrolls */
export const CARD_WIDTH = isTablet ? scale(220) : scale(160);

/** Product card width in grid */
export function productCardWidth(columns = PRODUCT_GRID_COLUMNS, gutter = scale(12)): number {
  const totalGutter = gutter * (columns + 1);
  return (SCREEN_WIDTH - totalGutter) / columns;
}

// ── Keyboard-aware bottom padding ─────────────────────────────────────────
export const BOTTOM_TAB_HEIGHT = isTablet ? 60 : isIOS ? 84 : 64;
export const SAFE_BOTTOM_PADDING = isIOS && !isTablet ? 34 : 16;

// ── Tablet-specific layout ────────────────────────────────────────────────
export const TABLET_SIDEBAR_WIDTH = 260;
export const TABLET_CONTENT_PADDING = isTablet ? scale(32) : scale(16);

// ── Hit slop for touch targets (44pt minimum per Apple HIG) ───────────────
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const LARGE_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 } as const;

// ── Listen for dimension changes (orientation) ────────────────────────────
export function useScreenDimensions() {
  const [dimensions, setDimensions] = React.useState({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  });

  React.useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    return () => sub.remove();
  }, []);

  return {
    ...dimensions,
    isTablet: dimensions.width >= 768,
    isLandscape: dimensions.width > dimensions.height,
  };
}

import React from 'react';
