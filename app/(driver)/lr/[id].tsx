import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Image,
  Share,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, API_URL } from "@/lib/api";
import type { LRRequest } from "@/lib/types";
import { StatusBadge, formatINR } from "@/components/StatusBadge";
import { colors } from "@/constants/theme";

export default function DriverLRDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lr, setLr] = useState<LRRequest | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!id) return;
    setLoading(true);
    const r = await api.getLR(id);
    if (r.success && r.data) setLr(r.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function markDelivered() {
    if (!id) return;
    Alert.alert("Mark as delivered?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Delivered",
        style: "default",
        onPress: async () => {
          const res = await api.markDelivered(id);
          if (res.success) {
            Alert.alert("Updated", "LR marked as delivered.");
            load();
          } else {
            Alert.alert("Error", res.error ?? "Failed to update");
          }
        },
      },
    ]);
  }

  async function shareLR() {
    if (!lr) return;
    const url = `${API_URL}/qr/${lr.id}`;
    try {
      await Share.share({
        title: `LR ${lr.lrNumber ?? lr.trackingId}`,
        message: `Track LR ${lr.lrNumber ?? lr.trackingId} from ${lr.originCity} to ${lr.destinationCity}: ${url}`,
      });
    } catch {
      // user cancelled
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!lr) {
    return (
      <View style={styles.loading}>
        <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>LR not found</Text>
      </View>
    );
  }

  const showPdfActions = lr.status === "approved" || lr.status === "in_transit";

  return (
    <View style={styles.container}>
      {/* White top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>LR Detail</Text>
          <Text style={styles.topBarSubtitle}>{lr.lrNumber ?? lr.trackingId}</Text>
        </View>
        <StatusBadge status={lr.status} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Purple info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>LR Number</Text>
              <Text style={styles.infoValue}>{lr.lrNumber ?? lr.trackingId}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date of Dispatch</Text>
              <Text style={styles.infoValue}>{lr.dispatchDate}</Text>
            </View>
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

        {/* Consignor Section */}
        <SectionCard title="Consignor Details" icon="person-outline">
          <Field label="Name" value={lr.consignorName} />
          <Field label="Address" value={lr.consignorAddress} last />
        </SectionCard>

        {/* Consignee Section */}
        <SectionCard title="Consignee Details" icon="people-outline">
          <Field label="Name" value={lr.consigneeName} />
          <Field label="Address" value={lr.consigneeAddress} />
          <Field label="Phone" value={`+91 ${lr.consigneePhone}`} last />
        </SectionCard>

        {/* Shipment Section */}
        <SectionCard title="Shipment Details" icon="cube-outline">
          <Field
            label="Route"
            value={`${lr.originCity} → ${lr.destinationCity}`}
          />
          <Field label="Vehicle Number" value={lr.vehicleNumber} />
          <Field label="Goods" value={lr.goodsDescription} />
          <View style={styles.fieldGrid}>
            <Field label="Packages" value={String(lr.noOfPackages)} inline />
            <Field label="Weight" value={`${lr.weightKg} kg`} inline />
          </View>
          <View style={styles.fieldGrid}>
            <Field label="Declared Value" value={formatINR(lr.declaredValue)} inline />
            <Field label="Freight" value={`${formatINR(lr.freightAmount)} (${lr.paymentMode})`} inline />
          </View>
          {lr.specialInstructions && (
            <Field label="Special Instructions" value={lr.specialInstructions} last />
          )}
        </SectionCard>

        {/* Actions */}
        {showPdfActions && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.pdfBtn}
              onPress={() =>
                Linking.openURL(`${API_URL}/api/lr/${lr.id}/pdf`)
              }
            >
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={styles.actionText}>Download PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={shareLR}>
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}

        {lr.status === "approved" && (
          <TouchableOpacity style={styles.deliverBtn} onPress={markDelivered}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionText}>Mark as Delivered</Text>
          </TouchableOpacity>
        )}

        {/* Photos */}
        {lr.photos && lr.photos.length > 0 && (
          <SectionCard title={`Photos (${lr.photos.length})`} icon="camera-outline">
            <View style={styles.photoGrid}>
              {lr.photos.map((url) => (
                <Image
                  key={url}
                  source={{ uri: absUrl(url) }}
                  style={styles.photoThumb}
                />
              ))}
            </View>
          </SectionCard>
        )}

        {/* Signature */}
        {lr.signatureUrl && (
          <SectionCard title="Driver Signature" icon="create-outline">
            <Image
              source={{ uri: absUrl(lr.signatureUrl) }}
              style={styles.signatureImg}
              resizeMode="contain"
            />
          </SectionCard>
        )}
      </ScrollView>
    </View>
  );
}

function absUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${API_URL}${url}`;
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name={icon} size={16} color={colors.primaryLight} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  last,
  inline,
}: {
  label: string;
  value: string;
  last?: boolean;
  inline?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldBorder, inline && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  topBar: {
    backgroundColor: colors.white,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCenter: { flex: 1, marginLeft: 12 },
  topBarTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  topBarSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  infoCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 18,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoItem: {},
  infoLabel: { fontSize: 11, color: "#C4B5FD", marginBottom: 4 },
  infoValue: { fontSize: 15, color: "#fff", fontWeight: "700" },
  rejectionCard: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectionTitle: { color: colors.error, fontWeight: "700", fontSize: 13 },
  rejectionMessage: {
    color: "#991B1B",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldRow: { paddingVertical: 10 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  fieldGrid: { flexDirection: "row", gap: 12 },
  fieldLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 3 },
  fieldValue: { fontSize: 14, color: colors.text, fontWeight: "500", lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 14 },
  pdfBtn: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: colors.info,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  deliverBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  signatureImg: {
    width: "100%",
    height: 100,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
