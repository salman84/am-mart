import { useSelector } from 'react-redux';
import { RootState } from '../store';

/**
 * Returns the dynamic primary color from appSettings (loaded from backend).
 * Falls back to the static default '#10B981' if settings have not loaded yet.
 *
 * Usage:
 *   const primary = usePrimaryColor();
 *   <View style={{ backgroundColor: primary }} />
 */
export function usePrimaryColor(): string {
  return useSelector((state: RootState) => (state.appSettings as any)?.primaryColor || '#10B981');
}
