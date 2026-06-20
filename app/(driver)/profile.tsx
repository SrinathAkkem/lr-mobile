import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { LRRequest } from "@/lib/types";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

export default function DriverProfile() {
  const colors = useThemeColors();
  const s = createStyles(colors);
  const { user, logout, refreshUser } = useAuth();
  const [lrs, setLrs] = useState<LRRequest[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [savingName, setSavingName] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const res = await api.getLRs();
        if (res.success && res.data) setLrs(res.data);
      })();
    }, []),
  );

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

  function startEditName() {
    setNameVal(user?.name ?? "");
    setEditingName(true);
  }

  async function saveName() {
    const trimmed = nameVal.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    setSavingName(true);
    const res = await api.updateProfile({ name: trimmed });
    setSavingName(false);
    if (res.success) {
      await refreshUser({ name: trimmed });
      setEditingName(false);
      Alert.alert("Saved", "Your name has been updated.");
    } else {
      Alert.alert("Error", res.error ?? "Failed to update name");
    }
  }

  const initials = ((editingName ? nameVal : user?.name) ?? "D")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const driverId = `DRV-${(user?.id ?? "00000").slice(-5).toUpperCase()}`;
  const totalLrs = lrs.length;
  const delivered = lrs.filter((l) => l.status === "delivered").length;
  const now = new Date();
  const thisMonth = lrs.filter((l) => {
    const d = new Date(l.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 40 }} bounces={false}>
      {/* ── Purple Header ──────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Image
            source={require("@/assets/images/ronohub-logo.png")}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.brandText}>RonoHub</Text>
        </View>
        <View style={s.profileRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {editingName ? (
              <View style={s.nameEditRow}>
                <TextInput
                  style={s.nameInput}
                  value={nameVal}
                  onChangeText={setNameVal}
                  autoFocus
                  placeholder="Your name"
                  placeholderTextColor="#C4B5FD"
                />
                <TouchableOpacity
                  style={[s.nameSaveBtn, savingName && { opacity: 0.5 }]}
                  onPress={saveName}
                  disabled={savingName}
                >
                  <Ionicons name="checkmark" size={18} color="#059669" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.nameCancelBtn}
                  onPress={() => setEditingName(false)}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={startEditName} style={s.nameRow}>
                <Text style={s.name}>{user?.name ?? "Driver"}</Text>
                <Ionicons name="create-outline" size={16} color="#C4B5FD" />
              </TouchableOpacity>
            )}
            <Text style={s.roleText}>Driver · ID: {driverId}</Text>
          </View>
        </View>
      </View>

      {/* ── Info Card ──────────────────────────────── */}
      <View style={s.card}>
        <InfoRow
          icon="location-outline"
          iconBg="#EDE9FE"
          iconColor="#7C3AED"
          label="Mobile Number"
          value={user?.mobile ? `+91 ${user.mobile.replace(/(\d{5})(\d{5})/, "$1 $2")}` : "—"}
          colors={colors}
          s={s}
        />
        <InfoRow
          icon="chatbox-ellipses-outline"
          iconBg="#DBEAFE"
          iconColor="#2563EB"
          label="Company"
          value={user?.company?.name ?? "—"}
          colors={colors}
          s={s}
        />
        <InfoRow
          icon="home-outline"
          iconBg="#FEF3C7"
          iconColor="#D97706"
          label="Branch"
          value={user?.branch?.name ? `${user.branch.name} Branch` : "—"}
          colors={colors}
          s={s}
        />
        <InfoRow
          icon="shield-checkmark-outline"
          iconBg="#D1FAE5"
          iconColor="#059669"
          label="Account Status"
          value="Active"
          valueColor="#059669"
          last
          colors={colors}
          s={s}
        />
      </View>

      {/* ── Stats Row ──────────────────────────────── */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={[s.statValue, { color: "#7C3AED" }]}>{totalLrs}</Text>
          <Text style={s.statLabel}>TOTAL LRS</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statValue, { color: "#059669" }]}>{delivered}</Text>
          <Text style={s.statLabel}>DELIVERED</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statValue, { color: "#2563EB" }]}>{thisMonth}</Text>
          <Text style={s.statLabel}>THIS MONTH</Text>
        </View>
      </View>

      {/* ── App Version ────────────────────────────── */}
      <View style={s.versionCard}>
        <View style={s.versionIcon}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.versionLabel}>App Version</Text>
          <Text style={s.versionValue}>RonoHub Driver v1.0.0</Text>
        </View>
      </View>

      {/* ── Logout ─────────────────────────────────── */}
      <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor,
  last,
  colors,
  s,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
  colors: ThemeColors;
  s: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[s.infoRow, !last && s.infoRowBorder]}>
      <View style={[s.infoIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={[s.infoValue, valueColor ? { color: valueColor } : undefined]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    /* Header */
    header: {
      backgroundColor: colors.primary,
      paddingTop: 54,
      paddingBottom: 30,
      paddingHorizontal: 20,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 24,
    },
    logo: {
      width: 28,
      height: 28,
    },
    brandText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.3)",
    },
    avatarText: { color: "#fff", fontSize: 26, fontWeight: "700" },
    name: { color: "#fff", fontSize: 22, fontWeight: "700" },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    nameEditRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    nameInput: {
      flex: 1, color: "#fff", fontSize: 18, fontWeight: "700",
      borderBottomWidth: 2, borderBottomColor: "#C4B5FD", paddingVertical: 4,
    },
    nameSaveBtn: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: "#D1FAE5",
      alignItems: "center", justifyContent: "center",
    },
    nameCancelBtn: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center", justifyContent: "center",
    },
    roleText: { color: "#C4B5FD", fontSize: 13, marginTop: 3 },

    /* Info Card */
    card: {
      marginHorizontal: 16,
      marginTop: -10,
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 16,
    },
    infoRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    infoLabel: {
      fontSize: 11,
      color: colors.textMuted,
    },
    infoValue: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginTop: 2,
    },

    /* Stats */
    statsRow: {
      flexDirection: "row",
      gap: 10,
      marginHorizontal: 16,
      marginTop: 20,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 28,
      fontWeight: "800",
    },
    statLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginTop: 4,
    },

    /* Version */
    versionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginHorizontal: 16,
      marginTop: 20,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    versionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.iconBg,
      alignItems: "center",
      justifyContent: "center",
    },
    versionLabel: {
      fontSize: 11,
      color: colors.textMuted,
    },
    versionValue: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginTop: 2,
    },

    /* Logout */
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginHorizontal: 16,
      marginTop: 20,
      paddingVertical: 16,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: "#FECACA",
      backgroundColor: "#FEF2F2",
    },
    logoutText: {
      color: "#DC2626",
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
