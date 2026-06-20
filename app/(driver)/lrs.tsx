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
import { api } from "@/lib/api";
import { downloadAndSharePdf } from "@/lib/download-pdf";
import type { LRRequest, LRStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

const FILTERS: { key: "all" | LRStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
];

const DOC_ICON_COLORS: Record<LRStatus, { bg: string; fg: string }> = {
  pending: { bg: "#EDE9FE", fg: "#7C3AED" },
  approved: { bg: "#D1FAE5", fg: "#059669" },
  rejected: { bg: "#FEE2E2", fg: "#DC2626" },
  in_transit: { bg: "#DBEAFE", fg: "#2563EB" },
  delivered: { bg: "#E0F2FE", fg: "#0284C7" },
};

export default function DriverLRList() {
  const colors = useThemeColors();
  const s = createStyles(colors);
  const [lrs, setLrs] = useState<LRRequest[]>([]);
  const [filter, setFilter] = useState<"all" | LRStatus>("all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: lrs.length };
    for (const f of FILTERS) {
      if (f.key !== "all") c[f.key] = lrs.filter((l) => l.status === f.key).length;
    }
    return c;
  }, [lrs]);

  function actionForStatus(item: LRRequest): { label: string; color: string; onPress: () => void } {
    switch (item.status) {
      case "approved":
        return {
          label: "Download PDF",
          color: "#059669",
          onPress: () => downloadAndSharePdf(item.id, item.lrNumber ?? item.trackingId),
        };
      case "rejected":
        return {
          label: "Edit & Resubmit",
          color: "#DC2626",
          onPress: () => router.push(`/(driver)/lr/${item.id}`),
        };
      case "delivered":
      case "in_transit":
      case "pending":
      default:
        return {
          label: "View",
          color: colors.primaryLight,
          onPress: () => router.push(`/(driver)/lr/${item.id}`),
        };
    }
  }

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return iso;
    }
  }

  if (initialLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* ── Purple Header ──────────────────────────── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>My LRs</Text>
          <Text style={s.headerSub}>
            All {lrs.length} LRs this month
          </Text>
        </View>
        <TouchableOpacity
          style={s.searchToggle}
          onPress={() => setSearchOpen(!searchOpen)}
        >
          <Ionicons name="search" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ─────────────────────────────── */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={15} color={colors.textMuted} style={{ marginLeft: 14 }} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by LR number or date..."
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 8, paddingRight: 12 }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter Chips ───────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key] ?? 0;
          if (f.key !== "all" && count === 0) return null;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {f.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── LR List ────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={
          filtered.length === 0 ? s.emptyContainer : { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 30 }
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        renderItem={({ item }) => {
          const docColors = DOC_ICON_COLORS[item.status];
          const action = actionForStatus(item);
          return (
            <View>
              <TouchableOpacity
                style={s.card}
                onPress={() => router.push(`/(driver)/lr/${item.id}`)}
                activeOpacity={0.7}
              >
                {/* Top row: icon + LR info + badge */}
                <View style={s.cardTop}>
                  <View style={[s.docIcon, { backgroundColor: docColors.bg }]}>
                    <Ionicons name="document-text" size={16} color={docColors.fg} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.lrNumber}>{item.lrNumber ?? item.trackingId}</Text>
                    <Text style={s.route}>
                      {item.originCity} → {item.destinationCity}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                {/* Bottom row: date + action link */}
                <View style={s.cardBottom}>
                  <View style={s.dateRow}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                    <Text style={s.dateText}>{formatDate(item.dispatchDate)}</Text>
                  </View>
                  <TouchableOpacity onPress={action.onPress} hitSlop={8}>
                    <Text style={[s.actionLink, { color: action.color }]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {/* Rejection reason banner */}
              {item.status === "rejected" && item.rejectionReason ? (
                <View style={s.rejectionBanner}>
                  <Text style={s.rejectionLabel}>REJECTION REASON</Text>
                  <Text style={s.rejectionMsg}>{item.rejectionReason}</Text>
                </View>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyInner}>
            <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No LRs found</Text>
            <Text style={s.emptyHint}>
              {search
                ? "Try a different search term."
                : `No ${filter === "all" ? "" : FILTERS.find((f) => f.key === filter)?.label.toLowerCase() + " "}LRs yet.`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },

    /* Header */
    header: {
      backgroundColor: colors.primary,
      paddingTop: 54,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
    },
    headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
    headerSub: { color: "#C4B5FD", fontSize: 12, marginTop: 3 },
    searchToggle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },

    /* Search */
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 10,
      fontSize: 13,
      color: colors.text,
    },

    /* Filter chips */
    filters: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 32,
      justifyContent: "center",
    },
    chipActive: {
      backgroundColor: "#1F2937",
      borderColor: "#1F2937",
    },
    chipText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },
    chipTextActive: {
      color: "#fff",
    },

    /* Card */
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    docIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    lrNumber: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    route: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    cardBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    dateText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    actionLink: {
      fontSize: 13,
      fontWeight: "700",
    },

    /* Rejection banner */
    rejectionBanner: {
      marginTop: -4,
      marginBottom: 10,
      marginHorizontal: 4,
      backgroundColor: "#FEF3C7",
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: "#FDE68A",
    },
    rejectionLabel: {
      fontSize: 11,
      fontWeight: "800",
      color: "#DC2626",
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    rejectionMsg: {
      fontSize: 13,
      color: "#92400E",
      lineHeight: 19,
    },

    /* Empty */
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyInner: { padding: 30, alignItems: "center", gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    emptyHint: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  });
}
