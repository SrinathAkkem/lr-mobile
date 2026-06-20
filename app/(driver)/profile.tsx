import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { colors } from "@/constants/theme";

export default function DriverProfile() {
  const { user, logout } = useAuth();

  function confirmLogout() {
    Alert.alert("Sign out?", "You'll need to verify OTP again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  const initials = (user?.name ?? "D")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "Driver"}</Text>
        <View style={styles.roleChip}>
          <Text style={styles.roleText}>Driver</Text>
        </View>
        {user?.company?.name && (
          <Text style={styles.companyName}>{user.company.name}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Row icon="call-outline" label="Mobile" value={`+91 ${user?.mobile}`} />
        <Row
          icon="business-outline"
          label="Company"
          value={user?.company?.name ?? "—"}
        />
        <Row
          icon="map-outline"
          label="Branch"
          value={
            user?.branch
              ? `${user.branch.name} · ${user.branch.city}`
              : "—"
          }
        />
        <Row
          icon="finger-print-outline"
          label="Driver ID"
          value={user?.id?.slice(-8).toUpperCase() ?? "—"}
          last
        />
      </View>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push("/notifications")}
      >
        <View style={styles.menuIconWrap}>
          <Ionicons name="notifications-outline" size={18} color={colors.primaryLight} />
        </View>
        <Text style={styles.menuText}>Notifications</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={colors.primaryLight} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  name: { color: "#fff", fontSize: 22, fontWeight: "700", marginTop: 12 },
  roleChip: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  roleText: { color: "#C4B5FD", fontSize: 12, fontWeight: "600" },
  companyName: { color: "#C4B5FD", fontSize: 13, marginTop: 8 },
  card: {
    margin: 16,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { color: colors.textMuted, fontSize: 11 },
  rowValue: { fontWeight: "600", color: colors.text, marginTop: 2, fontSize: 14 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1, fontWeight: "600", color: colors.text, fontSize: 14 },
  logout: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: { color: colors.error, fontWeight: "700", fontSize: 15 },
});
