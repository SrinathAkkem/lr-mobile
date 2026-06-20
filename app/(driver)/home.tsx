import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { LRRequest } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function actionForStatus(status: string): { label: string; color: string } {
  switch (status) {
    case "pending":
      return { label: "View Details", color: "#6366F1" };
    case "approved":
      return { label: "Download PDF", color: "#059669" };
    case "rejected":
      return { label: "Edit & Resubmit", color: "#DC2626" };
    case "delivered":
      return { label: "View Details", color: "#2563EB" };
    default:
      return { label: "View Details", color: "#6366F1" };
  }
}

export default function DriverHome() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { user } = useAuth();
  const [lrs, setLrs] = useState<LRRequest[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [lrRes, notifRes] = await Promise.all([
      api.getLRs(),
      api.getNotifications(),
    ]);
    if (lrRes.success && lrRes.data) setLrs(lrRes.data.slice(0, 10));
    if (notifRes.success && notifRes.data) {
      setUnread(notifRes.data.filter((n) => !n.read).length);
    }
    setRefreshing(false);
    setInitialLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const pending = lrs.filter((l) => l.status === "pending").length;
  const approved = lrs.filter((l) => l.status === "approved").length;

  const branchName = user?.branch
    ? `${user.company?.name ?? ""} · ${user.branch.name}`
    : user?.company?.name ?? "";

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  function iconColorForStatus(status: string): string {
    switch (status) {
      case "pending": return "#F59E0B";
      case "approved": return "#059669";
      case "rejected": return "#DC2626";
      case "delivered": return "#2563EB";
      default: return colors.primaryLight;
    }
  }

  function iconBgForStatus(status: string): string {
    switch (status) {
      case "pending": return "#FEF3C7";
      case "approved": return "#D1FAE5";
      case "rejected": return "#FEE2E2";
      case "delivered": return "#DBEAFE";
      default: return colors.iconBg;
    }
  }

  return (
    <View style={styles.container}>
      {/* Purple Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>{greetingFor(new Date())}</Text>
            <Text style={styles.nameText}>{user?.name ?? "Driver"}</Text>
          </View>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unread > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {branchName ? (
          <View style={styles.branchChip}>
            <Ionicons name="location" size={12} color="#C4B5FD" />
            <Text style={styles.branchText}>{branchName}</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={lrs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        ListHeaderComponent={
          <>
            {/* Create New LR Button */}
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push("/(driver)/create")}
              activeOpacity={0.85}
            >
              <View style={styles.createBtnInner}>
                <View style={styles.createIconCircle}>
                  <Ionicons name="add" size={20} color="#fff" />
                </View>
                <Text style={styles.createBtnText}>Create New LR</Text>
              </View>
            </TouchableOpacity>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#059669" }]}>
                  {lrs.length}
                </Text>
                <Text style={styles.statLabel}>THIS MONTH</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#D97706" }]}>
                  {pending}
                </Text>
                <Text style={styles.statLabel}>PENDING</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: "#059669" }]}>
                  {approved}
                </Text>
                <Text style={styles.statLabel}>APPROVED</Text>
              </View>
            </View>

            {/* Recent LRs Header */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Recent LRs</Text>
              <TouchableOpacity onPress={() => router.push("/(driver)/lrs")}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const action = actionForStatus(item.status);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(driver)/lr/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: iconBgForStatus(item.status) }]}>
                  <Ionicons name="document-text" size={16} color={iconColorForStatus(item.status)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lrId}>
                    {item.lrNumber ?? item.trackingId}
                  </Text>
                  <Text style={styles.route}>
                    {item.originCity} → {item.destinationCity}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.dateText}>
                    {new Date(item.dispatchDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <Text style={[styles.actionText, { color: action.color }]}>
                  {action.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No LRs yet</Text>
            <Text style={styles.emptyHint}>
              Tap "Create New LR" to record your first delivery.
            </Text>
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
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },

    /* ── Header ────────────────────────────────────────── */
    header: {
      backgroundColor: colors.primary,
      paddingTop: 56,
      paddingBottom: 28,
      paddingHorizontal: 20,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    greetingText: {
      color: "#C4B5FD",
      fontSize: 14,
    },
    nameText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 24,
      marginTop: 2,
    },
    bell: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    notifBadge: {
      position: "absolute",
      top: 2,
      right: 2,
      backgroundColor: "#F472B6",
      borderRadius: 9,
      paddingHorizontal: 5,
      minWidth: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    branchChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 12,
      alignSelf: "flex-start",
      backgroundColor: "rgba(255,255,255,0.12)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    branchText: {
      color: "#DDD6FE",
      fontSize: 12,
      fontWeight: "500",
    },

    /* ── Create Button ─────────────────────────────────── */
    createBtn: {
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: "#4F46E5",
      shadowColor: "#4338CA",
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    createBtnInner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 18,
      paddingHorizontal: 20,
      backgroundColor: "#4F46E5",
      borderRadius: 16,
    },
    createIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    createBtnText: {
      color: "#fff",
      fontSize: 17,
      fontWeight: "700",
    },

    /* ── Stats Row ─────────────────────────────────────── */
    statsRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      marginTop: 18,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "800",
    },
    statLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.textMuted,
      marginTop: 4,
      letterSpacing: 0.5,
    },

    /* ── Section Header ────────────────────────────────── */
    sectionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      marginTop: 22,
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    seeAll: {
      fontSize: 13,
      color: "#2563EB",
      fontWeight: "600",
    },

    /* ── LR Card ───────────────────────────────────────── */
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    cardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    lrId: {
      fontWeight: "700",
      fontSize: 15,
      color: colors.text,
    },
    route: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    cardBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    dateText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    actionText: {
      fontSize: 13,
      fontWeight: "600",
    },

    /* ── Empty State ───────────────────────────────────── */
    empty: { padding: 30, alignItems: "center", gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    emptyHint: {
      color: colors.textMuted,
      marginTop: 4,
      fontSize: 13,
      textAlign: "center",
    },
  });
}
