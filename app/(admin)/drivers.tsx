import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors } from "@/constants/theme";

interface Driver {
  id: string;
  name: string;
  mobile: string;
  status: string;
  lrsThisMonth: number;
  branch?: { id: string; name: string; city: string } | null;
}

interface Branch {
  id: string;
  name: string;
  city: string;
}

export default function AdminDrivers() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ mobile: "", name: "", branchId: "" });

  const load = useCallback(async () => {
    setRefreshing(true);
    const [dRes, bRes] = await Promise.all([
      api.getDrivers(),
      api.getBranches(),
    ]);
    if (dRes.success && dRes.data) setDrivers(dRes.data);
    if (bRes.success && bRes.data) {
      setBranches(bRes.data);
      if (bRes.data.length > 0 && !form.branchId) {
        setForm((f) => ({ ...f, branchId: bRes.data![0].id }));
      }
    }
    setRefreshing(false);
    setInitialLoad(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.mobile.includes(q),
    );
  }, [drivers, search]);

  async function submitInvite() {
    if (!/^\d{10}$/.test(form.mobile)) {
      Alert.alert("Invalid mobile", "Enter a 10-digit number.");
      return;
    }
    if (!form.branchId) {
      Alert.alert("Branch required", "Pick a branch for the driver.");
      return;
    }
    setBusy(true);
    const res = await api.inviteDriver(form.mobile, form.branchId, form.name);
    setBusy(false);
    if (res.success) {
      setInviteOpen(false);
      setForm({ mobile: "", name: "", branchId: branches[0]?.id ?? "" });
      Alert.alert("Driver invited", "They'll get access on first OTP login.");
      load();
    } else {
      Alert.alert("Couldn't invite", res.error ?? "Try again");
    }
  }

  function confirmRemove(driver: Driver) {
    Alert.alert(
      "Remove driver?",
      `${driver.name} will no longer be able to log in or create LRs.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const res = await api.removeDriver(driver.id);
            if (res.success) load();
            else Alert.alert("Error", res.error ?? "Failed to remove");
          },
        },
      ],
    );
  }

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  if (initialLoad) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
        <Text style={styles.loadingText}>Loading drivers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Purple Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Drivers</Text>
        <Text style={styles.subtitle}>
          {user?.company?.name ?? "Company"} · {drivers.length} drivers
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyWrap : { paddingBottom: 24 }
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        ListHeaderComponent={
          <>
            {/* Search */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search driver name or number…"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Add Driver Button */}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setInviteOpen(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>
                Add Driver — Enter Mobile Number to Invite
              </Text>
            </TouchableOpacity>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onLongPress={() => item.status === "active" && confirmRemove(item)}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(item.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{item.name}</Text>
              <Text style={styles.driverMobile}>
                +91 {item.mobile.replace(/(\d{5})(\d{5})/, "$1 $2")}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <View style={styles.lrBadge}>
                <Text style={styles.lrBadgeText}>
                  {item.lrsThisMonth} LRs
                </Text>
              </View>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      item.status === "active"
                        ? colors.success
                        : item.status === "invited"
                          ? colors.warning
                          : "#94A3B8",
                  },
                ]}
              />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No drivers yet</Text>
            <Text style={styles.emptyHint}>
              Tap the button above to invite by mobile number.
            </Text>
          </View>
        }
      />

      {/* Invite Modal */}
      <Modal
        visible={inviteOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Invite Driver</Text>
            <Text style={styles.modalSub}>
              They'll get access on first OTP login from their phone.
            </Text>

            <Text style={styles.label}>Mobile Number *</Text>
            <View style={styles.phoneRow}>
              <View style={styles.prefixChip}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
                value={form.mobile}
                onChangeText={(v) =>
                  setForm({ ...form, mobile: v.replace(/\D/g, "").slice(0, 10) })
                }
                keyboardType="phone-pad"
                placeholder="98765 43210"
                placeholderTextColor={colors.textMuted}
                maxLength={10}
              />
            </View>

            <Text style={styles.label}>Driver Name (optional)</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              placeholder="e.g. Ravi Kumar"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Branch *</Text>
            <View style={styles.branchChips}>
              {branches.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Add a branch from the website first.
                </Text>
              ) : (
                branches.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.branchChip,
                      form.branchId === b.id && styles.branchChipActive,
                    ]}
                    onPress={() => setForm({ ...form, branchId: b.id })}
                  >
                    <Text
                      style={[
                        styles.branchChipText,
                        form.branchId === b.id && { color: "#fff" },
                      ]}
                    >
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setInviteOpen(false)}
                disabled={busy}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmit,
                  (busy || !form.mobile || !form.branchId) && { opacity: 0.5 },
                ]}
                onPress={submitInvite}
                disabled={busy || !form.mobile || !form.branchId}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {busy ? "Inviting..." : "Send Invite"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#C4B5FD", fontSize: 12, marginTop: 4 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    margin: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 14, color: colors.text },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.success,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3B52C4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  driverName: { fontWeight: "700", fontSize: 15, color: colors.text },
  driverMobile: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lrBadge: {
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  lrBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.success,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 30, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyHint: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  modalSub: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    marginTop: 16,
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  phoneRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  prefixChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
  },
  prefixText: { color: colors.text, fontWeight: "600" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.text,
  },
  branchChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  branchChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  branchChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  branchChipText: { fontSize: 12, fontWeight: "600", color: colors.text },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 24 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSubmit: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
  },
});
