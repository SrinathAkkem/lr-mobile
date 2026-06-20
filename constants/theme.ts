import { useColorScheme } from "react-native";

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  shieldColor: string;
  background: string;
  white: string;
  text: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  border: string;
  card: string;
  inputBg: string;
  headerSubtitle: string;
  tabBar: string;
  tabBarBorder: string;
  iconBg: string;
  skeleton: string;
}

const lightColors: ThemeColors = {
  primary: "#5B21B6",
  primaryLight: "#7C3AED",
  shieldColor: "#f5a623",
  background: "#F8FAFC",
  white: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  success: "#059669",
  warning: "#D97706",
  error: "#DC2626",
  info: "#2563EB",
  border: "#E2E8F0",
  card: "#FFFFFF",
  inputBg: "#F8FAFC",
  headerSubtitle: "#C4B5FD",
  tabBar: "#FFFFFF",
  tabBarBorder: "#F1F5F9",
  iconBg: "#F5F3FF",
  skeleton: "#E2E8F0",
};

const darkColors: ThemeColors = {
  primary: "#5B21B6",
  primaryLight: "#7C3AED",
  shieldColor: "#f5a623",
  background: "#0F172A",
  white: "#1E293B",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  border: "#334155",
  card: "#1E293B",
  inputBg: "#1E293B",
  headerSubtitle: "#C4B5FD",
  tabBar: "#1E293B",
  tabBarBorder: "#334155",
  iconBg: "#2D2150",
  skeleton: "#334155",
};

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkColors : lightColors;
}

/** @deprecated Use useThemeColors() hook instead for dark mode support */
export const colors = lightColors;
