import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { LRRequest } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { colors } from "@/constants/theme";

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DriverHome() {
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

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image
            source={require("@/assets/images/ronohub-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
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

        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>{greetingFor(new Date())},</Text>
          <Text style={styles.name}>{user?.name ?? "Driver"}</Text>
          {user?.company?.name && (
            <Text style={styles.company}>{user.company.name}</Text>
          )}
        </View>

        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{lrs.length}</Text>
            <Text style={styles.statLabel}>Recent</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push("/(driver)/create")}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.createBtnText}>Create New LR</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recent LRs</Text>
        <FlatList
          data={lrs}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={load} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(driver)/lr/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardRow}>
                <Text style={styles.lrId}>{item.trackingId}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.route}>
                {item.originCity} → {item.destinationCity}
              </Text>
              <View style={styles.cardBottom}>
                <Text style={styles.consignee}>
                  {item.consigneeName}
                </Text>
                <Text style={styles.cardDate}>{item.dispatchDate}</Text>
              </View>
            </TouchableOpacity>
          )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 110,
    height: 28,
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#F472B6",
    borderRadius: 9,
    paddingHorizontal: 5,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  greetingRow: { marginTop: 18 },
  greeting: { color: "#fff", fontSize: 16 },
  name: { color: "#fff", fontWeight: "700", fontSize: 22, marginTop: 2 },
  company: { color: "#C4B5FD", fontSize: 13, marginTop: 4 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 14,
  },
  statBox: { flex: 1, alignItems: "center" },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "700" },
  statLabel: { color: "#C4B5FD", fontSize: 11, marginTop: 2 },
  body: { flex: 1, padding: 16 },
  createBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    marginBottom: 22,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lrId: { fontWeight: "700", fontSize: 14, color: colors.text },
  route: { color: colors.text, marginTop: 8, fontSize: 13, fontWeight: "600" },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  consignee: { color: colors.textMuted, fontSize: 12 },
  cardDate: { color: colors.textMuted, fontSize: 11 },
  empty: { padding: 30, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  emptyHint: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 13,
    textAlign: "center",
  },
});
