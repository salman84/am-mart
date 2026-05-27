import { useWindowDimensions } from 'react-native';
import {
  scale, verticalScale, moderateScale, fontSize, spacing,
  PRODUCT_GRID_COLUMNS, TABLET_CONTENT_PADDING, MAX_CONTENT_WIDTH,
  BOTTOM_TAB_HEIGHT, isIOS, isAndroid,
} from '../utils/responsive';

/**
 * Hook that returns responsive values that update on orientation change.
 * Use this instead of the static exports when you need layout to adapt to rotation.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;
  const isLandscape = width > height;

  const gridColumns = isLargeTablet ? 4 : isTablet ? 3 : 2;
  const contentPadding = isTablet ? scale(32) : scale(16);
  const maxWidth = isTablet ? 680 : width;

  return {
    width,
    height,
    isTablet,
    isLargeTablet,
    isPhone: !isTablet,
    isLandscape,
    isPortrait: !isLandscape,
    isIOS,
    isAndroid,
    gridColumns,
    contentPadding,
    maxWidth,
    scale,
    verticalScale,
    moderateScale,
    fontSize,
    spacing,
    PRODUCT_GRID_COLUMNS: gridColumns,
    TABLET_CONTENT_PADDING: contentPadding,
    MAX_CONTENT_WIDTH: maxWidth,
    BOTTOM_TAB_HEIGHT,
  };
}
