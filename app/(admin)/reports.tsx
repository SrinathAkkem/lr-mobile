import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api, API_URL, getToken } from "@/lib/api";
import type { DashboardStats, LRRequest } from "@/lib/types";
import { formatINR } from "@/components/StatusBadge";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

const ZERO: DashboardStats = {
  totalLrs: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  delivered: 0,
  inTransit: 0,
  freightTotal: 0,
  approvalRate: 0,
};

export default function AdminReports() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(ZERO);
  const [topRoutes, setTopRoutes] = useState<
    { route: string; count: number; freight: number }[]
  >([]);
  const [recent, setRecent] = useState<LRRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    const r = await api.getDashboard();
    if (r.success && r.data) {
      setStats(r.data.stats);
      setTopRoutes(r.data.topRoutes ?? []);
      setRecent(r.data.recentLrs ?? []);
    }
    setRefreshing(false);
    setInitialLoad(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function exportPdf() {
    if (recent.length === 0) {
      Alert.alert("Nothing to export", "No approved LRs in the period.");
      return;
    }
    const approved = recent.find((l) => l.pdfUrl);
    if (!approved) {
      Alert.alert(
        "Bulk export coming soon",
        "Per-LR PDFs are available from each LR detail screen.",
      );
      return;
    }
    const token = await getToken();
    const url = `${API_URL}${approved.pdfUrl}${token ? `?token=${token}` : ""}`;
    Linking.openURL(url);
  }

  const monthName = new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const weeklyData = distributeToWeeks(stats.totalLrs);

  if (initialLoad) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
    >
      {/* Purple Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Reports</Text>
            <Text style={styles.subtitle}>
              {monthName} · {user?.company?.name ?? "Company"}
            </Text>
          </View>
          <TouchableOpacity style={styles.calendarBtn}>
            <Ionicons name="calendar-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Total LRs This Month */}
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>TOTAL LRS THIS MONTH</Text>
        <Text style={styles.kpiValue}>{stats.totalLrs}</Text>
        <Text style={styles.kpiMeta}>LRs issued in {monthName}</Text>

        {/* Bar Chart */}
        <View style={styles.barChart}>
          {weeklyData.map((w, i) => {
            const maxH = Math.max(...weeklyData.map((d) => d.count), 1);
            const h = Math.max(12, (w.count / maxH) * 80);
            return (
              <View key={i} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor: w.current ? colors.primary : "#DDD6FE",
                    },
                  ]}
                />
                <Text style={styles.barLabel}>W{i + 1}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Freight Value Total */}
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>FREIGHT VALUE TOTAL</Text>
        <Text style={[styles.kpiValue, { color: colors.success }]}>
          ₹ {formatCompact(stats.freightTotal)}
        </Text>
        <Text style={styles.kpiMeta}>Total freight collected this month</Text>
      </View>

      {/* Top 5 Routes */}
      <View style={styles.routesCard}>
        <Text style={styles.routesTitle}>TOP 5 ROUTES</Text>
        {topRoutes.length === 0 ? (
          <Text style={styles.routesEmpty}>No routes recorded yet.</Text>
        ) : (
          topRoutes.slice(0, 5).map((r, i) => (
            <View key={r.route} style={styles.routeRow}>
              <Text style={styles.routeIndex}>#{i + 1}</Text>
              <Text style={styles.routeName}>{r.route}</Text>
              <View style={styles.routeBadge}>
                <Text style={styles.routeBadgeText}>{r.count} LRs</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Export as PDF */}
      <TouchableOpacity style={styles.exportBtn} onPress={exportPdf}>
        <Ionicons name="download-outline" size={18} color={colors.primaryLight} />
        <Text style={styles.exportText}>Export as PDF</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function distributeToWeeks(total: number) {
  const w3Pct = 0.35;
  const w1Pct = 0.2;
  const w2Pct = 0.25;
  const w4Pct = 0.2;
  const today = new Date();
  const weekNum = Math.ceil(today.getDate() / 7);
  return [
    { count: Math.round(total * w1Pct), current: weekNum === 1 },
    { count: Math.round(total * w2Pct), current: weekNum === 2 },
    { count: Math.round(total * w3Pct), current: weekNum === 3 },
    { count: Math.round(total * w4Pct), current: weekNum === 4 },
  ];
}

function formatCompact(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(0)},00,000`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(0)},00,000`;
  if (amount >= 1000)
    return amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return String(amount);
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    loadingText: { color: colors.textMuted, fontSize: 14 },
    header: {
      backgroundColor: colors.primary,
      paddingTop: 56,
      paddingBottom: 18,
      paddingHorizontal: 20,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    title: { color: "#fff", fontSize: 22, fontWeight: "700" },
    subtitle: { color: colors.headerSubtitle, fontSize: 12, marginTop: 4 },
    calendarBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    kpiCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    kpiLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 0.6,
    },
    kpiValue: {
      fontSize: 36,
      fontWeight: "700",
      color: colors.text,
      marginTop: 4,
    },
    kpiMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    barChart: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginTop: 20,
      paddingHorizontal: 8,
    },
    barCol: {
      alignItems: "center",
      flex: 1,
      gap: 6,
    },
    bar: {
      width: "70%",
      borderRadius: 6,
    },
    barLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "600",
    },
    routesCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    routesTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 0.6,
      marginBottom: 14,
    },
    routesEmpty: { color: colors.textMuted, fontSize: 13 },
    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    routeIndex: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      width: 28,
    },
    routeName: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    routeBadge: {
      borderWidth: 1,
      borderColor: colors.primaryLight,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    routeBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primaryLight,
    },
    exportBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 16,
      paddingVertical: 16,
      borderRadius: 28,
      borderWidth: 1.5,
      borderColor: colors.primaryLight,
      backgroundColor: colors.card,
    },
    exportText: {
      color: colors.primaryLight,
      fontWeight: "700",
      fontSize: 15,
    },
  });
}
