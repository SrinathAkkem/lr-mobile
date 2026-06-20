import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import type { LRRequest, LRStatus } from "@/lib/types";
import { StatusBadge, formatINR } from "@/components/StatusBadge";
import { colors } from "@/constants/theme";

const FILTERS: ("all" | LRStatus)[] = [
  "all",
  "pending",
  "approved",
  "rejected",
  "in_transit",
  "delivered",
];

export default function DriverLRList() {
  const [lrs, setLrs] = useState<LRRequest[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    const res = await api.getLRs(filter);
    if (res.success && res.data) setLrs(res.data);
    setRefreshing(false);
    setInitialLoading(false);
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
        l.consigneeName.toLowerCase().includes(q) ||
        l.consignorName.toLowerCase().includes(q) ||
        l.destinationCity.toLowerCase().includes(q) ||
        l.originCity.toLowerCase().includes(q) ||
        l.dispatchDate.includes(q),
    );
  }, [lrs, search]);

  const counts: Record<(typeof FILTERS)[number], number> = useMemo(() => {
    return {
      all: lrs.length,
      pending: lrs.filter((l) => l.status === "pending").length,
      approved: lrs.filter((l) => l.status === "approved").length,
      rejected: lrs.filter((l) => l.status === "rejected").length,
      in_transit: lrs.filter((l) => l.status === "in_transit").length,
      delivered: lrs.filter((l) => l.status === "delivered").length,
    };
  }, [lrs]);

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
        <View style={styles.headerRow}>
          <Text style={styles.title}>My LRs</Text>
          <Ionicons name="search" size={20} color="#C4B5FD" />
        </View>
        <Text style={styles.subtitle}>{filtered.length} of {lrs.length}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons
          name="search"
          size={15}
          color={colors.textMuted}
          style={{ marginLeft: 12 }}
        />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by LR number, city, or date"
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filter, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && { color: "#fff" },
              ]}
            >
              {f === "in_transit" ? "In Transit" : f}{" "}
              <Text style={[styles.filterCountInline, filter === f && { color: "rgba(255,255,255,0.8)" }]}>
                {counts[f]}
              </Text>
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyWrap : { padding: 16 }
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(driver)/lr/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.row}>
              <View style={styles.cardLeft}>
                <View style={styles.docIcon}>
                  <Ionicons name="document-text" size={16} color={colors.primaryLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lrId}>
                    {item.lrNumber ?? item.trackingId}
                  </Text>
                  <Text style={styles.route}>
                    {item.originCity} → {item.destinationCity}
                  </Text>
                </View>
              </View>
              <StatusBadge status={item.status} />
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.consignee}>
                {item.consigneeName}
              </Text>
              <Text style={styles.cardDate}>{item.dispatchDate}</Text>
            </View>
            {item.status === "rejected" && item.rejectionReason && (
              <View style={styles.rejectionBox}>
                <Text style={styles.reject}>
                  Reason: {item.rejectionReason}
                </Text>
              </View>
            )}
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
              {search
                ? "Try a different search term."
                : `No ${filter === "all" ? "" : filter + " "}LRs yet.`}
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#C4B5FD", fontSize: 12, marginTop: 2 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    margin: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, fontSize: 13, color: colors.text },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  filter: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  filterActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  filterText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize", color: colors.text },
  filterCountInline: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 10,
  },
  docIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  lrId: { fontWeight: "700", fontSize: 14, color: colors.text },
  route: { color: colors.text, marginTop: 3, fontSize: 13, fontWeight: "500" },
  cardFooter: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 42,
  },
  consignee: { color: colors.textMuted, fontSize: 12 },
  cardDate: { color: colors.textMuted, fontSize: 11 },
  rejectionBox: {
    marginTop: 8,
    marginLeft: 42,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  reject: { color: colors.error, fontSize: 11, lineHeight: 16 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 30, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyHint: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
});
