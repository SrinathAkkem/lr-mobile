import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/lib/auth";
import { api, API_URL, getToken } from "@/lib/api";
import type { Company } from "@/lib/types";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

export default function CompanyProfileScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { user, logout } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", gstNumber: "" });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);

  useEffect(() => {
    api.getCompanyProfile().then((r) => {
      if (r.success && r.data) {
        setCompany(r.data);
        setForm({
          name: r.data.name,
          address: r.data.address,
          gstNumber: r.data.gstNumber,
        });
        setLogoUrl(r.data.logoUrl ?? null);
        setStampUrl(r.data.stampUrl ?? null);
      }
      setLoading(false);
    });
  }, []);

  async function pickImage(kind: "logo" | "stamp") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: kind === "logo" ? [1, 1] : [3, 2],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];

    const token = await getToken();
    const fd = new FormData();
    fd.append("file", {
      uri: asset.uri,
      name: `${kind}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    } as any);

    const res = await fetch(`${API_URL}/api/upload/${kind}`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: fd,
    });
    const json = await res.json();
    if (json?.success && json?.data?.url) {
      if (kind === "logo") setLogoUrl(json.data.url);
      else setStampUrl(json.data.url);
    } else {
      Alert.alert("Upload failed", json?.error ?? "Try again.");
    }
  }

  async function save() {
    if (!form.name.trim() || !form.address.trim() || !form.gstNumber.trim()) {
      Alert.alert("Missing info", "Name, address, and GST are required.");
      return;
    }
    setSaving(true);
    const res = await api.updateCompanyProfile({
      name: form.name.trim(),
      address: form.address.trim(),
      gstNumber: form.gstNumber.trim(),
      logoUrl: logoUrl ?? "",
      stampUrl: stampUrl ?? "",
    });
    setSaving(false);
    if (res.success) {
      Alert.alert("Saved", "Company profile updated.");
    } else {
      Alert.alert("Error", res.error ?? "Save failed");
    }
  }

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const initials = (form.name || "A")
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.gearBadge}>
            <Ionicons name="settings" size={12} color="#fff" />
          </View>
        </View>
        <Text style={styles.companyTitle}>{form.name || "Company"}</Text>
        <Text style={styles.platformCode}>
          RONOHUB · {company?.lrCode ?? "COMP-0000"}
        </Text>
        <View style={styles.infoBadge}>
          <Ionicons name="shield-outline" size={14} color={colors.shieldColor} />
          <Text style={styles.infoBadgeText}>Details go on every LR PDF</Text>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>COMPANY NAME</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
        />

        <Text style={styles.label}>COMPANY ADDRESS</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={form.address}
          onChangeText={(v) => setForm({ ...form, address: v })}
          multiline
        />

        <Text style={styles.label}>GST NUMBER</Text>
        <TextInput
          style={[styles.input, { color: colors.primaryLight }]}
          value={form.gstNumber}
          onChangeText={(v) => setForm({ ...form, gstNumber: v.toUpperCase() })}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.uploadSection}>
        <Text style={styles.label}>COMPANY LOGO</Text>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={() => pickImage("logo")}
        >
          {logoUrl ? (
            <Image source={{ uri: absUrl(logoUrl) }} style={styles.uploadImg} />
          ) : (
            <>
              <View style={styles.uploadIconWrap}>
                <Ionicons name="image" size={28} color={colors.primaryLight} />
              </View>
              <Text style={styles.uploadHint}>Tap to upload PNG / JPG</Text>
              <Text style={styles.uploadMeta}>Recommended: 200×200 px</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.uploadSection}>
        <Text style={styles.label}>COMPANY STAMP IMAGE</Text>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={() => pickImage("stamp")}
        >
          {stampUrl ? (
            <Image source={{ uri: absUrl(stampUrl) }} style={styles.uploadImg} />
          ) : (
            <>
              <View style={[styles.uploadIconWrap, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="shield-checkmark" size={28} color="#D97706" />
              </View>
              <Text style={styles.uploadHint}>Tap to upload stamp image</Text>
              <Text style={styles.uploadMeta}>Used on every LR PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.adminSection}>
        <Text style={styles.adminLabel}>ADMIN ACCOUNT</Text>
        <View style={styles.adminCard}>
          <Text style={styles.adminName}>{user?.name ?? "Admin"}</Text>
          <Text style={styles.adminMobile}>+91 {user?.mobile ?? "—"}</Text>
          <Text style={styles.adminCompany}>{form.name}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={save}
        disabled={saving}
      >
        <Ionicons name="save" size={18} color="#fff" />
        <Text style={styles.saveBtnText}>
          {saving ? "Saving..." : "Save Company Profile"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function absUrl(u: string) {
  if (u.startsWith("http") || u.startsWith("data:")) return u;
  return `${API_URL}${u}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      paddingTop: 56,
      paddingBottom: 24,
      paddingHorizontal: 24,
      alignItems: "center",
    },
    avatarWrap: { position: "relative", marginBottom: 12 },
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
    companyTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
    platformCode: { color: colors.headerSubtitle, fontSize: 12, marginTop: 4, letterSpacing: 0.5 },
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
    infoBadgeText: { color: "#f5a623", fontSize: 12, fontWeight: "500" },
    formSection: {
      marginHorizontal: 16,
      marginTop: 16,
    },
    label: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 0.6,
      marginTop: 16,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      fontSize: 15,
      color: colors.text,
    },
    inputMultiline: { height: 80, textAlignVertical: "top" },
    uploadSection: {
      marginHorizontal: 16,
      marginTop: 8,
    },
    uploadArea: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 120,
    },
    uploadIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.iconBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    uploadHint: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
    uploadMeta: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    uploadImg: { width: 100, height: 100, borderRadius: 12 },
    adminSection: {
      marginHorizontal: 16,
      marginTop: 20,
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
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    adminName: { fontSize: 16, fontWeight: "700", color: colors.text },
    adminMobile: { fontSize: 13, color: colors.primaryLight, marginTop: 4 },
    adminCompany: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 20,
      paddingVertical: 16,
      borderRadius: 28,
      backgroundColor: colors.primaryLight,
    },
    saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      paddingVertical: 16,
      borderRadius: 28,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: "#FECACA",
    },
    logoutText: { color: colors.error, fontWeight: "700", fontSize: 15 },
  });
}
