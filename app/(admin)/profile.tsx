import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { colors } from "@/constants/theme";

export default function AdminProfile() {
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

  const initials = (user?.name ?? "A")
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      {/* Purple Header with Avatar */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.gearBadge}>
            <Ionicons name="settings" size={12} color="#fff" />
          </View>
        </View>
        <Text style={styles.companyName}>
          {user?.company?.name ?? "Company"}
        </Text>
        <Text style={styles.platformCode}>
          RONOHUB · {user?.company?.lrCode ?? "COMP"}
        </Text>
        <View style={styles.infoBadge}>
          <Ionicons name="shield-outline" size={14} color={colors.shieldColor} />
          <Text style={styles.infoBadgeText}>
            Details go on every LR PDF
          </Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.list}>
        <Row
          icon="business-outline"
          label="Company Profile"
          hint="Logo, GST, address, stamp"
          onPress={() => router.push("/(admin)/company-profile")}
        />
        <Row
          icon="notifications-outline"
          label="Notifications"
          hint="LR approvals, system alerts"
          onPress={() => router.push("/notifications")}
        />
        <Row
          icon="bar-chart-outline"
          label="Reports & Analytics"
          hint="Monthly stats, route data"
          onPress={() => router.push("/(admin)/reports")}
        />
      </View>

      {/* Admin Account Section */}
      <View style={styles.adminSection}>
        <Text style={styles.adminLabel}>ADMIN ACCOUNT</Text>
        <View style={styles.adminCard}>
          <Text style={styles.adminName}>{user?.name ?? "Admin"}</Text>
          <Text style={styles.adminMobile}>+91 {user?.mobile ?? "—"}</Text>
          <Text style={styles.adminCompany}>
            {user?.company?.name ?? "Company"}
          </Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logout} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primaryLight} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },
  gearBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  companyName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  platformCode: {
    color: "#C4B5FD",
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgb(254 243 224)",
    borderWidth: 1,
    borderColor: "rgb(254 243 224)",
  },
  infoBadgeText: {
    color: "#f5a623",
    fontSize: 12,
    fontWeight: "500",
  },
  list: {
    margin: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  adminSection: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  adminLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primaryLight,
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  adminCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adminName: { fontSize: 16, fontWeight: "700", color: colors.text },
  adminMobile: { fontSize: 13, color: colors.primaryLight, marginTop: 4 },
  adminCompany: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  logout: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: "#FFF",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  logoutText: { color: colors.error, fontWeight: "700", fontSize: 15 },
});
