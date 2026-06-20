import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, API_URL } from "@/lib/api";
import type { LRRequest } from "@/lib/types";
import { StatusBadge, formatINR } from "@/components/StatusBadge";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

export default function AdminLRDetail() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { id } = useLocalSearchParams<{ id: string }>();
  const [lr, setLr] = useState<LRRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    const r = await api.getLR(id);
    if (r.success && r.data) setLr(r.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function approve() {
    if (!id) return;
    Alert.alert(
      "Approve this LR?",
      "Once approved, the driver can download the PDF and dispatch.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setBusy(true);
            const res = await api.approveLR(id);
            setBusy(false);
            if (res.success) {
              Alert.alert("Approved", "PDF generated for the driver.");
              load();
            } else Alert.alert("Error", res.error ?? "Failed to approve");
          },
        },
      ],
    );
  }

  async function submitReject() {
    if (!id || !reason.trim()) {
      Alert.alert("Reason required", "Please describe what needs to be fixed.");
      return;
    }
    setBusy(true);
    const res = await api.rejectLR(id, reason.trim());
    setBusy(false);
    if (res.success) {
      setRejectOpen(false);
      setReason("");
      Alert.alert("Rejected", "Driver has been notified.");
      load();
    } else {
      Alert.alert("Error", res.error ?? "Failed to reject");
    }
  }

  function SectionCard({
    icon,
    title,
    children,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon} size={16} color={colors.primaryLight} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {children}
      </View>
    );
  }

  function FieldRow({
    label,
    value,
    valueStyle,
    badge,
  }: {
    label: string;
    value: string;
    valueStyle?: object;
    badge?: boolean;
  }) {
    return (
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {badge ? (
          <View style={styles.badgeWrap}>
            <Text style={styles.badgeText}>{value}</Text>
          </View>
        ) : (
          <Text style={[styles.fieldValue, valueStyle]}>{value}</Text>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!lr) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>LR not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: lr.status === "pending" ? 100 : 30,
        }}
      >
        {/* White Header with back button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle}>LR Detail</Text>
            <Text style={styles.topSubtitle}>
              {lr.lrNumber ?? lr.trackingId}
            </Text>
          </View>
          <StatusBadge status={lr.status} />
        </View>

        {/* LR Number + Date Card */}
        <View style={styles.infoCard}>
          <View>
            <Text style={styles.infoLabel}>LR NUMBER</Text>
            <Text style={styles.infoValue}>
              {lr.lrNumber ?? lr.trackingId}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.infoLabel}>Date of Dispatch</Text>
            <Text style={styles.infoValue}>
              {new Date(lr.dispatchDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        {lr.status === "rejected" && lr.rejectionReason && (
          <View style={styles.rejectionCard}>
            <Ionicons name="warning" size={18} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectionTitle}>Rejected</Text>
              <Text style={styles.rejectionMessage}>{lr.rejectionReason}</Text>
            </View>
          </View>
        )}

        {/* Consignor Details */}
        <SectionCard icon="people" title="CONSIGNOR DETAILS">
          <FieldRow label="Consignor Name" value={lr.consignorName} />
          <FieldRow label="Consignor Address" value={lr.consignorAddress} />
        </SectionCard>

        {/* Consignee Details */}
        <SectionCard icon="people" title="CONSIGNEE DETAILS">
          <FieldRow label="Consignee Name" value={lr.consigneeName} />
          <FieldRow label="Consignee Address" value={lr.consigneeAddress} />
          <FieldRow label="Consignee Phone" value={lr.consigneePhone} />
        </SectionCard>

        {/* Shipment Details */}
        <SectionCard icon="settings" title="SHIPMENT DETAILS">
          <FieldRow label="Origin City" value={lr.originCity} />
          <FieldRow label="Destination City" value={lr.destinationCity} />
          <FieldRow
            label="Vehicle Number"
            value={lr.vehicleNumber}
            valueStyle={{ color: colors.primaryLight }}
          />
          <FieldRow label="Goods Description" value={lr.goodsDescription} />
          <FieldRow label="No. of Packages" value={String(lr.noOfPackages)} />
          <FieldRow label="Weight (KG)" value={`${lr.weightKg} kg`} />
          <FieldRow label="Declared Value" value={formatINR(lr.declaredValue)} />
          <FieldRow label="Freight Amount" value={formatINR(lr.freightAmount)} />
          <FieldRow
            label="Payment Mode"
            value={lr.paymentMode}
            badge
          />
          {lr.specialInstructions && (
            <FieldRow
              label="Special Instructions"
              value={lr.specialInstructions}
            />
          )}
        </SectionCard>

        {/* Driver & Vehicle */}
        <SectionCard icon="car" title="DRIVER & VEHICLE">
          <FieldRow label="Driver Name" value={lr.driver?.name ?? "—"} />
          <FieldRow label="Driver Phone" value={lr.driver?.mobile ?? "—"} />
        </SectionCard>

        {/* Goods Photos */}
        {lr.photos && lr.photos.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Goods Photos ({lr.photos.length})
            </Text>
            <View style={styles.photoGrid}>
              {lr.photos.map((url) => (
                <View key={url} style={styles.photoThumbWrap}>
                  <Image
                    source={{ uri: absUrl(url) }}
                    style={styles.photoThumb}
                  />
                  <View style={styles.photoOverlay}>
                    <Ionicons name="image" size={20} color={colors.primaryLight} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Driver Signature */}
        {lr.signatureUrl && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Driver Signature</Text>
            <Image
              source={{ uri: absUrl(lr.signatureUrl) }}
              style={styles.signatureImg}
              resizeMode="contain"
            />
            <Text style={styles.signatureMeta}>
              {lr.driver?.name ?? "Driver"} ·{" "}
              {new Date(lr.dispatchDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Approve / Reject Bottom Bar */}
      {lr.status === "pending" && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => setRejectOpen(true)}
            disabled={busy}
          >
            <Ionicons name="close" size={18} color="#fff" />
            <Text style={styles.bottomBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={approve}
            disabled={busy}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.bottomBtnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reject Modal */}
      <Modal
        visible={rejectOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRejectOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject LR</Text>
            <Text style={styles.modalSub}>
              Tell the driver what needs to be corrected.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              placeholder="e.g. Vehicle number format is invalid"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRejectOpen(false)}
                disabled={busy}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, (!reason.trim() || busy) && { opacity: 0.5 }]}
                onPress={submitReject}
                disabled={busy || !reason.trim()}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {busy ? "Rejecting..." : "Reject LR"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function absUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${API_URL}${url}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scrollView: { flex: 1 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 56,
      paddingHorizontal: 16,
      paddingBottom: 14,
      backgroundColor: colors.card,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    topTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    topSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    infoCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: 16,
      marginTop: 12,
      padding: 16,
      borderRadius: 14,
      backgroundColor: "#2D1B69",
    },
    infoLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: "#C4B5FD",
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: "700",
      color: "#fff",
      marginTop: 4,
    },
    rejectionCard: {
      flexDirection: "row",
      gap: 12,
      margin: 16,
      marginBottom: 0,
      padding: 14,
      borderRadius: 14,
      backgroundColor: "#FEF2F2",
      borderWidth: 1,
      borderColor: "#FECACA",
    },
    rejectionTitle: { color: colors.error, fontWeight: "700" },
    rejectionMessage: { color: "#991B1B", fontSize: 13, marginTop: 2 },
    sectionCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primaryLight,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    fieldRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    fieldLabel: {
      fontSize: 12,
      color: colors.textMuted,
      flex: 1,
    },
    fieldValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
      flex: 1.5,
      textAlign: "right",
    },
    badgeWrap: {
      backgroundColor: "#EDE9FE",
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primaryLight,
      textTransform: "uppercase",
    },
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
    photoThumbWrap: {
      width: 80,
      height: 80,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.iconBg,
      alignItems: "center",
      justifyContent: "center",
    },
    photoThumb: { width: "100%", height: "100%", borderRadius: 12 },
    photoOverlay: {
      position: "absolute",
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(243,240,255,0.8)",
    },
    signatureImg: {
      width: "100%",
      height: 80,
      marginTop: 12,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    signatureMeta: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: "center",
    },
    bottomBar: {
      flexDirection: "row",
      gap: 12,
      padding: 16,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rejectBtn: {
      flex: 1,
      backgroundColor: "#F472B6",
      borderRadius: 28,
      paddingVertical: 16,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    approveBtn: {
      flex: 1,
      backgroundColor: colors.success,
      borderRadius: 28,
      paddingVertical: 16,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    bottomBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 36,
    },
    modalTitle: { fontSize: 20, fontWeight: "700", color: colors.error },
    modalSub: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
    modalInput: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      minHeight: 100,
      textAlignVertical: "top",
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.inputBg,
    },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
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
      backgroundColor: colors.error,
      alignItems: "center",
    },
  });
}
