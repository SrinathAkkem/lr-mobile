import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors } from "@/constants/theme";

interface Notification {
  id: string;
  title: string;
  message: string;
  lrId?: string;
  read: boolean;
  createdAt: string;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function iconFor(title: string): keyof typeof Ionicons.glyphMap {
  if (/approve/i.test(title)) return "checkmark-circle";
  if (/reject/i.test(title)) return "close-circle";
  if (/deliver/i.test(title)) return "cube";
  if (/new lr/i.test(title)) return "document-text";
  return "notifications";
}

function colorFor(title: string): string {
  if (/approve|deliver/i.test(title)) return colors.success;
  if (/reject/i.test(title)) return colors.error;
  return colors.primaryLight;
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const res = await api.getNotifications();
    if (res.success && res.data) setItems(res.data);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function open(n: Notification) {
    if (!n.lrId) return;
    router.push(`/(driver)/lr/${n.lrId}`);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          {items.length === 0
            ? "You're all caught up"
            : `${items.filter((n) => !n.read).length} unread of ${items.length}`}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.cardUnread]}
            onPress={() => open(item)}
            disabled={!item.lrId}
            activeOpacity={0.7}
          >
            <View
              style={[styles.iconWrap, { backgroundColor: `${colorFor(item.title)}20` }]}
            >
              <Ionicons
                name={iconFor(item.title)}
                size={20}
                color={colorFor(item.title)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMessage}>{item.message}</Text>
              <Text style={styles.cardTime}>{formatRelative(item.createdAt)}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyHint}>
              You&apos;ll be pinged here when an LR is approved, rejected, or
              marked delivered.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  back: { color: "#C4B5FD" },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginTop: 8 },
  subtitle: { color: "#C4B5FD", fontSize: 13, marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    gap: 12,
  },
  cardUnread: { borderColor: colors.primaryLight, backgroundColor: "#FAF7FF" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontWeight: "700", fontSize: 14, color: colors.text },
  cardMessage: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  cardTime: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
    marginTop: 6,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
