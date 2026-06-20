import { View, Text, StyleSheet } from "react-native";
import type { LRStatus } from "@/lib/types";

const config: Record<LRStatus, { label: string; bg: string; fg: string; dot: string }> = {
  pending: { label: "PENDING", bg: "#FEF3C7", fg: "#B45309", dot: "#F59E0B" },
  approved: { label: "APPROVED", bg: "#D1FAE5", fg: "#047857", dot: "#10B981" },
  rejected: { label: "REJECTED", bg: "#FEE2E2", fg: "#B91C1C", dot: "#EF4444" },
  in_transit: { label: "IN TRANSIT", bg: "#DBEAFE", fg: "#1D4ED8", dot: "#3B82F6" },
  delivered: { label: "DELIVERED", bg: "#E0F2FE", fg: "#0369A1", dot: "#06B6D4" },
};

export function StatusBadge({ status }: { status: LRStatus }) {
  const c = config[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.dot }]} />
      <Text style={[styles.text, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

export function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 10, fontWeight: "700" },
});
