import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { LRRequest, LRStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { colors } from "@/constants/theme";

const FILTERS: ("all" | LRStatus)[] = [
  "all",
  "pending",
  "approved",
  "rejected",
  "delivered",
];

export default function AdminLRList() {
  const { user } = useAuth();
  const [lrs, setLrs] = useState<LRRequest[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    const r = await api.getLRs(filter);
    if (r.success && r.data) setLrs(r.data);
    setRefreshing(false);
    setInitialLoad(false);
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lrs;
    return lrs.filter(
      (l) =>
        l.trackingId.toLowerCase().includes(q) ||
        l.lrNumber?.toLowerCase().includes(q) ||
        l.consignorName.toLowerCase().includes(q) ||
        l.consigneeName.toLowerCase().includes(q) ||
        l.driver?.name?.toLowerCase().includes(q) ||
        l.originCity.toLowerCase().includes(q) ||
        l.destinationCity.toLowerCase().includes(q),
    );
  }, [lrs, search]);

  const counts = useMemo(
    () => ({
      all: lrs.length,
      pending: lrs.filter((l) => l.status === "pending").length,
      approved: lrs.filter((l) => l.status === "approved").length,
      rejected: lrs.filter((l) => l.status === "rejected").length,
      delivered: lrs.filter((l) => l.status === "delivered").length,
    }),
    [lrs],
  );

  const filterLabel = (f: string) => {
    const cap = f.charAt(0).toUpperCase() + f.slice(1);
    return `${cap} (${counts[f as keyof typeof counts] ?? 0})`;
  };

  if (initialLoad) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
        <Text style={styles.loadingText}>Loading LR requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Purple Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>LR Requests</Text>
            <Text style={styles.subtitle}>
              {user?.company?.name ?? "Company"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by LR number or driver name…"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        </View>
      )}

      {/* Filter Tabs - Horizontally Scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filter, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[styles.filterText, filter === f && styles.filterTextActive]}
            >
              {filterLabel(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* LR List */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        style={styles.listContainer}
        contentContainerStyle={
          filtered.length === 0
            ? styles.emptyWrap
            : [styles.listContent, { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }]
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(admin)/lr/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardIconWrap}>
                <Ionicons
                  name="document-text"
                  size={18}
                  color={colors.primaryLight}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lrId}>
                  {item.lrNumber ?? item.trackingId}
                </Text>
                <Text style={styles.driverLine}>
                  {item.driver?.name ?? "Driver"} · {item.vehicleNumber}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
            <View style={styles.cardBottom}>
              <View style={styles.routeRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.routeText}>
                  {item.originCity} → {item.destinationCity}
                </Text>
              </View>
              <Text style={styles.dateText}>
                {new Date(item.dispatchDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="document-text-outline"
              size={42}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No LRs match</Text>
            <Text style={styles.emptyHint}>
              {search ? "Try a different term." : "Drivers will submit here."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  subtitle: { color: "#C4B5FD", fontSize: 12, marginTop: 4 },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    margin: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 14, color: colors.text },
  filters: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filter: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    height: 28,
    justifyContent: "center",
  },
  filterActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  filterText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  filterTextActive: {
    color: "#fff",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  lrId: { fontWeight: "700", fontSize: 14, color: colors.text },
  driverLine: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  routeText: { color: colors.text, fontSize: 13, fontWeight: "500" },
  dateText: { color: colors.textMuted, fontSize: 12 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 30, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyHint: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
});
