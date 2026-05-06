/**
 * HarborMesh - Theme Hook
 * Manages day/night mode and system theme detection
 */

import { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '@/store';
import { ThemeMode } from '@/types';

interface ThemeState {
  theme: ThemeMode;
  effectiveTheme: 'day' | 'night';
  isNight: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export function useTheme(): ThemeState {
  const { userPreferences, updateUserPreferences } = useSettingsStore();
  const theme = userPreferences.theme;

  const [effectiveTheme, setEffectiveTheme] = useState<'day' | 'night'>('day');

  // Determine effective theme based on mode and system/time
  const calculateEffectiveTheme = useCallback((): 'day' | 'night' => {
    if (theme === ThemeMode.DAY) return 'day';
    if (theme === ThemeMode.NIGHT) return 'night';

    // Auto mode - check system preference or time of day
    if (typeof window !== 'undefined') {
      // Check system preference first
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      // Also check time of day (night = 20:00 - 06:00)
      const hour = new Date().getHours();
      const isNightTime = hour >= 20 || hour < 6;

      return systemPrefersDark || isNightTime ? 'night' : 'day';
    }

    return 'day';
  }, [theme]);

  // Update effective theme when theme changes
  useEffect(() => {
    setEffectiveTheme(calculateEffectiveTheme());
  }, [calculateEffectiveTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== ThemeMode.AUTO) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      setEffectiveTheme(calculateEffectiveTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, calculateEffectiveTheme]);

  // Update time-based theme every minute
  useEffect(() => {
    if (theme !== ThemeMode.AUTO) return;

    const interval = setInterval(() => {
      setEffectiveTheme(calculateEffectiveTheme());
    }, 60000);

    return () => clearInterval(interval);
  }, [theme, calculateEffectiveTheme]);

  // Apply theme class to document — 'dark' class activates Tailwind dark mode
  useEffect(() => {
    const root = document.documentElement;
    const isNight = effectiveTheme === 'night';

    // Tailwind requires 'dark' class on <html> for dark: variants to work
    root.classList.toggle('dark', isNight);
    root.classList.toggle('night-mode', isNight);
    root.classList.toggle('day-mode', !isNight);
  }, [effectiveTheme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    updateUserPreferences({ theme: newTheme });
  }, [updateUserPreferences]);

  const toggleTheme = useCallback(() => {
    const newTheme = effectiveTheme === 'day' ? ThemeMode.NIGHT : ThemeMode.DAY;
    updateUserPreferences({ theme: newTheme });
  }, [effectiveTheme, updateUserPreferences]);

  return {
    theme,
    effectiveTheme,
    isNight: effectiveTheme === 'night',
    setTheme,
    toggleTheme,
  };
}

// Hook for accessing CSS variables based on theme
export function useThemeColors() {
  const { effectiveTheme } = useTheme();

  const colors = {
    day: {
      background: '#ffffff',
      surface: '#f8fafc',
      surfaceElevated: '#ffffff',
      border: '#e2e8f0',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      accent: '#0ea5e9',
      accentHover: '#0284c7',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6',
    },
    night: {
      background: '#0f172a',
      surface: '#1e293b',
      surfaceElevated: '#334155',
      border: '#334155',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#64748b',
      accent: '#38bdf8',
      accentHover: '#7dd3fc',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#60a5fa',
    },
  };

  return colors[effectiveTheme];
}