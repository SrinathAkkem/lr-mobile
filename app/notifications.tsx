import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

interface Notification {
  id: string;
  title: string;
  message: string;
  lrId?: string;
  read: boolean;
  createdAt: string;
}

type IconConfig = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

function iconFor(title: string): IconConfig {
  if (/approve/i.test(title))
    return { name: "checkmark-circle", color: "#059669", bg: "#D1FAE5" };
  if (/reject/i.test(title))
    return { name: "close", color: "#DC2626", bg: "#FEE2E2" };
  if (/deliver/i.test(title))
    return { name: "arrow-forward", color: "#2563EB", bg: "#DBEAFE" };
  if (/submit/i.test(title))
    return { name: "notifications", color: "#D97706", bg: "#FEF3C7" };
  return { name: "notifications", color: "#7C3AED", bg: "#EDE9FE" };
}

function hintFor(title: string): string {
  if (/approve/i.test(title)) return "Tap to download PDF";
  if (/reject/i.test(title)) return "Tap to edit and resubmit";
  return "";
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

function formatDateFull(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) +
      ", " +
      d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return iso;
  }
}

function sectionLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (itemDay.getTime() === today.getTime()) return "TODAY";
  if (itemDay.getTime() === yesterday.getTime()) return "YESTERDAY";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const s = createStyles(colors);
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    const res = await api.getNotifications();
    if (res.success && res.data) setItems(res.data);
    setRefreshing(false);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const sections = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const item of items) {
      const label = sectionLabel(item.createdAt);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(item);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [items]);

  function open(n: Notification) {
    if (!n.lrId) return;
    const base = user?.role === "company_admin" ? "/(admin)" : "/(driver)";
    router.push(`${base}/lr/${n.lrId}` as any);
  }

  if (loading) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Purple Header ──────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Notifications</Text>
          <Text style={s.headerSub}>
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </Text>
        </View>
        {unreadCount > 0 && (
          <View style={s.newBadge}>
            <Text style={s.newBadgeText}>{unreadCount} New</Text>
          </View>
        )}
      </View>

      {/* ── Notifications List ─────────────────────── */}
      <SectionList
        sections={sections}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: 30 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const ic = iconFor(item.title);
          const hint = hintFor(item.title);
          const isToday = sectionLabel(item.createdAt) === "TODAY";
          const timeStr = isToday ? formatTime(item.createdAt) : formatDateFull(item.createdAt);

          return (
            <TouchableOpacity
              style={[s.card, !item.read && s.cardUnread]}
              onPress={() => open(item)}
              disabled={!item.lrId}
              activeOpacity={0.7}
            >
              <View style={[s.iconCircle, { backgroundColor: ic.bg }]}>
                <Ionicons name={ic.name} size={18} color={ic.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardMessage}>{item.message}</Text>
                <Text style={s.cardTime}>
                  {timeStr}
                  {hint ? ` · ${hint}` : ""}
                </Text>
              </View>
              {!item.read && <View style={s.unreadDot} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={44} color={colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No notifications yet</Text>
            <Text style={s.emptyHint}>
              You'll be notified here when an LR is approved, rejected, or marked delivered.
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
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
    headerSub: { color: "#C4B5FD", fontSize: 12, marginTop: 3 },
    newBadge: {
      backgroundColor: "#F59E0B",
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    newBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

    /* Section */
    sectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 0.8,
    },

    /* Card */
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cardUnread: {
      backgroundColor: "#FAF5FF",
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    cardMessage: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 19,
      marginTop: 4,
    },
    cardTime: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 6,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primaryLight,
      marginTop: 6,
    },

    /* Empty */
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      gap: 12,
    },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.iconBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
    emptyHint: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 20,
    },
  });
}
