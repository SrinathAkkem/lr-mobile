import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { LRRequest, DashboardStats } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
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

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function AdminHome() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(ZERO);
  const [recent, setRecent] = useState<LRRequest[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [dashRes, notifRes] = await Promise.all([
      api.getDashboard(),
      api.getNotifications(),
    ]);
    if (dashRes.success && dashRes.data) {
      setStats(dashRes.data.stats);
      setRecent(dashRes.data.recentLrs ?? []);
    }
    if (notifRes.success && notifRes.data) {
      setUnread(notifRes.data.filter((n) => !n.read).length);
    }
    setRefreshing(false);
    setInitialLoad(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const firstName = user?.name?.split(" ")[0] ?? "Admin";

  function StatCard({
    label,
    value,
    icon,
    iconBg,
    iconColor,
    valueColor,
  }: {
    label: string;
    value: number;
    icon: keyof typeof Ionicons.glyphMap;
    iconBg: string;
    iconColor: string;
    valueColor: string;
  }) {
    return (
      <View style={styles.stat}>
        <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[styles.statValue, { color: valueColor }]}>
          {value.toLocaleString("en-IN")}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  }

  if (initialLoad) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Image
              source={require("@/assets/images/ronohub-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.companyName}>
              {user?.company?.name ?? "Company"} · Admin
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons name="notifications-outline" size={20} color="#fff" />
            {unread > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unread > 9 ? "9+" : unread}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.greeting}>
          {greetingFor(new Date())}, {firstName}
        </Text>
        {stats.pending > 0 && (
          <Text style={styles.pendingLine}>
            You have{" "}
            <Text style={styles.pendingHighlight}>{stats.pending} pending</Text>{" "}
            LR request{stats.pending === 1 ? "" : "s"} today
          </Text>
        )}
      </View>

      <FlatList
        data={recent}
        keyExtractor={(i) => i.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        contentContainerStyle={{ paddingBottom: 16 }}
        ListHeaderComponent={
          <>
            <View style={styles.grid}>
              <StatCard
                label="Total LRs"
                value={stats.totalLrs}
                icon="document-text"
                iconBg="#EDE9FE"
                iconColor={colors.primaryLight}
                valueColor={colors.primaryLight}
              />
              <StatCard
                label="Pending"
                value={stats.pending}
                icon="time"
                iconBg="#FEF3C7"
                iconColor="#D97706"
                valueColor="#D97706"
              />
              <StatCard
                label="Approved"
                value={stats.approved}
                icon="checkmark-circle"
                iconBg="#D1FAE5"
                iconColor="#059669"
                valueColor="#059669"
              />
              <StatCard
                label="Delivered"
                value={stats.delivered}
                icon="cube"
                iconBg="#DBEAFE"
                iconColor="#2563EB"
                valueColor="#2563EB"
              />
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Recent LR Requests</Text>
              <TouchableOpacity onPress={() => router.push("/(admin)/lrs")}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(admin)/lr/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardIcon}>
                <Ionicons name="document-text" size={16} color={colors.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.lrId}>{item.lrNumber ?? item.trackingId}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.driverLine}>
                  Driver: {item.driver?.name ?? "—"} · {item.vehicleNumber}
                </Text>
                <View style={styles.cardMeta}>
                  <View style={styles.routeRow}>
                    <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.routeText}>
                      {item.originCity} → {item.destinationCity}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{item.dispatchDate}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No LRs yet</Text>
            <Text style={styles.emptyHint}>Drivers' submissions will appear here.</Text>
          </View>
        }
      />
    </View>
  );
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
      paddingTop: 52,
      paddingBottom: 20,
      paddingHorizontal: 20,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    logo: { width: 110, height: 28 },
    companyName: { color: colors.headerSubtitle, fontSize: 12, marginTop: 6 },
    bell: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    bellBadge: {
      position: "absolute",
      top: 2,
      right: 2,
      backgroundColor: "#F472B6",
      borderRadius: 7,
      minWidth: 14,
      height: 14,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    bellBadgeText: { color: "#fff", fontSize: 8, fontWeight: "800" },
    greeting: { color: "#fff", fontSize: 22, fontWeight: "700", marginTop: 14 },
    pendingLine: { color: colors.headerSubtitle, fontSize: 13, marginTop: 4 },
    pendingHighlight: { color: "#FCD34D", fontWeight: "700" },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      padding: 12,
      gap: 8,
    },
    stat: {
      width: "48%",
      flexGrow: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    statValue: { fontSize: 24, fontWeight: "800" },
    statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: "500" },
    sectionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      marginTop: 4,
      marginBottom: 8,
    },
    sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
    seeAll: { fontSize: 13, color: "#2563EB", fontWeight: "600" },
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 12,
      marginBottom: 8,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardRow: { flexDirection: "row", gap: 10 },
    cardIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.iconBg,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    cardTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    lrId: { fontWeight: "700", fontSize: 13, color: colors.text },
    driverLine: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
    cardMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
    },
    routeRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    routeText: { color: colors.text, fontSize: 12, fontWeight: "500" },
    dateText: { color: colors.textMuted, fontSize: 11 },
    empty: { padding: 40, alignItems: "center", gap: 8 },
    emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    emptyHint: { color: colors.textMuted, fontSize: 12 },
  });
}
