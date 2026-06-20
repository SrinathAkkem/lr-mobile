import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
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
import { downloadAndSharePdf } from "@/lib/download-pdf";
import type { LRRequest } from "@/lib/types";
import { StatusBadge, formatINR } from "@/components/StatusBadge";
import { SignaturePad, SignaturePadHandle } from "@/components/SignaturePad";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

type EditForm = {
  consignorName: string;
  consignorAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneePhone: string;
  originCity: string;
  destinationCity: string;
  vehicleNumber: string;
  goodsDescription: string;
  noOfPackages: string;
  weightKg: string;
  declaredValue: string;
  freightAmount: string;
  paymentMode: string;
  specialInstructions: string;
};

export default function DriverLRDetail() {
  const colors = useThemeColors();
  const s = createStyles(colors);

  const { id } = useLocalSearchParams<{ id: string }>();
  const [lr, setLr] = useState<LRRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const sigRef = useRef<SignaturePadHandle>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    const r = await api.getLR(id);
    if (r.success && r.data) {
      setLr(r.data);
      setSignatureUrl(r.data.signatureUrl ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function startEditing() {
    if (!lr) return;
    setForm({
      consignorName: lr.consignorName,
      consignorAddress: lr.consignorAddress,
      consigneeName: lr.consigneeName,
      consigneeAddress: lr.consigneeAddress,
      consigneePhone: lr.consigneePhone,
      originCity: lr.originCity,
      destinationCity: lr.destinationCity,
      vehicleNumber: lr.vehicleNumber,
      goodsDescription: lr.goodsDescription,
      noOfPackages: String(lr.noOfPackages),
      weightKg: String(lr.weightKg),
      declaredValue: String(lr.declaredValue),
      freightAmount: String(lr.freightAmount),
      paymentMode: lr.paymentMode,
      specialInstructions: lr.specialInstructions ?? "",
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setForm(null);
    setSignatureUrl(lr?.signatureUrl ?? null);
  }

  async function saveEdits() {
    if (!id || !form) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      consignorName: form.consignorName.trim(),
      consignorAddress: form.consignorAddress.trim(),
      consigneeName: form.consigneeName.trim(),
      consigneeAddress: form.consigneeAddress.trim(),
      consigneePhone: form.consigneePhone.trim(),
      originCity: form.originCity.trim(),
      destinationCity: form.destinationCity.trim(),
      vehicleNumber: form.vehicleNumber.trim().toUpperCase().replace(/\s/g, ""),
      goodsDescription: form.goodsDescription.trim(),
      noOfPackages: Number(form.noOfPackages),
      weightKg: Number(form.weightKg),
      declaredValue: Number(form.declaredValue),
      freightAmount: Number(form.freightAmount),
      paymentMode: form.paymentMode,
      specialInstructions: form.specialInstructions.trim() || undefined,
    };
    if (signatureUrl && signatureUrl !== lr?.signatureUrl) {
      payload.signatureUrl = signatureUrl;
    }
    const res = await api.updateLR(id, payload);
    setSaving(false);
    if (res.success) {
      Alert.alert("Saved", "LR updated successfully.");
      setEditing(false);
      setForm(null);
      load();
    } else {
      Alert.alert("Error", res.error ?? "Failed to save changes");
    }
  }

  async function captureSignature(dataUri: string) {
    const res = await api.uploadSignature(dataUri);
    if (res.success && res.data) {
      setSignatureUrl(res.data.url);
    } else {
      Alert.alert("Upload failed", res.error ?? "Couldn't save signature.");
    }
  }

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

  function set<K extends keyof EditForm>(key: K, value: string) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!lr) {
    return (
      <View style={s.center}>
        <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>LR not found</Text>
      </View>
    );
  }

  const showPdfActions = lr.status === "approved" || lr.status === "in_transit";
  const canDeliver = lr.status === "approved";
  const canEdit = lr.status === "pending" || lr.status === "rejected";
  const dispatchFormatted = formatDate(lr.dispatchDate);

  return (
    <View style={s.root}>
      {/* ── Purple Header ──────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => (editing ? cancelEditing() : router.back())}
          style={s.backBtn}
        >
          <Ionicons name={editing ? "close" : "chevron-back"} size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{editing ? "Edit LR" : "LR Details"}</Text>
          <Text style={s.headerSub}>{lr.lrNumber ?? lr.trackingId}</Text>
        </View>
        {editing ? (
          <TouchableOpacity
            style={[s.headerSaveBtn, saving && { opacity: 0.5 }]}
            onPress={saveEdits}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <Text style={s.headerSaveText}>Save</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {canEdit && (
              <TouchableOpacity style={s.editBtn} onPress={startEditing}>
                <Ionicons name="create-outline" size={16} color="#fff" />
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
            <StatusBadge status={lr.status} />
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Action Buttons ───────────────────────── */}
        {!editing && showPdfActions && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.pdfBtn}
              onPress={() => downloadAndSharePdf(lr.id, lr.lrNumber ?? lr.trackingId)}
              activeOpacity={0.85}
            >
              <Ionicons name="download-outline" size={17} color="#fff" />
              <Text style={s.actionBtnText}>Download PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.shareBtn} onPress={shareLR} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={17} color="#fff" />
              <Text style={s.actionBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}

        {!editing && canDeliver && (
          <View style={{ paddingHorizontal: 16, marginTop: showPdfActions ? 0 : 14 }}>
            <TouchableOpacity style={s.deliverBtn} onPress={markDelivered} activeOpacity={0.85}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={s.deliverText}>Mark as Delivered</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Rejection Banner ─────────────────────── */}
        {lr.status === "rejected" && lr.rejectionReason && (
          <View style={s.rejectionCard}>
            <Ionicons name="warning" size={18} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={s.rejectionTitle}>Rejected</Text>
              <Text style={s.rejectionMsg}>{lr.rejectionReason}</Text>
            </View>
          </View>
        )}

        {/* ── Route Visual ─────────────────────────── */}
        {!editing && (
          <View style={s.routeRow}>
            <View style={s.routeCity}>
              <Text style={s.routeCityName}>{lr.originCity}</Text>
              <Text style={s.routeCityLabel}>Origin</Text>
            </View>
            <View style={s.routeLineWrap}>
              <View style={s.routeLine} />
              <View style={s.routeIconWrap}>
                <Ionicons name="bus-outline" size={16} color={colors.primaryLight} />
              </View>
              <View style={s.routeLine} />
            </View>
            <View style={[s.routeCity, { alignItems: "flex-end" }]}>
              <Text style={s.routeCityName}>{lr.destinationCity}</Text>
              <Text style={s.routeCityLabel}>Destination</Text>
            </View>
          </View>
        )}

        {/* ═══ EDIT MODE ═══════════════════════════════ */}
        {editing && form ? (
          <>
            <SectionDivider label="CONSIGNOR (SENDER)" />
            <View style={s.formPad}>
              <Text style={s.inputLabel}>Consignor Name</Text>
              <TextInput style={s.input} value={form.consignorName} onChangeText={(v) => set("consignorName", v)} placeholderTextColor={colors.textMuted} />
              <Text style={s.inputLabel}>Consignor Address</Text>
              <TextInput style={[s.input, s.inputMulti]} value={form.consignorAddress} onChangeText={(v) => set("consignorAddress", v)} multiline placeholderTextColor={colors.textMuted} />
            </View>

            <SectionDivider label="CONSIGNEE (RECEIVER)" />
            <View style={s.formPad}>
              <Text style={s.inputLabel}>Consignee Name</Text>
              <TextInput style={s.input} value={form.consigneeName} onChangeText={(v) => set("consigneeName", v)} placeholderTextColor={colors.textMuted} />
              <Text style={s.inputLabel}>Consignee Address</Text>
              <TextInput style={[s.input, s.inputMulti]} value={form.consigneeAddress} onChangeText={(v) => set("consigneeAddress", v)} multiline placeholderTextColor={colors.textMuted} />
              <Text style={s.inputLabel}>Consignee Phone</Text>
              <TextInput style={s.input} value={form.consigneePhone} onChangeText={(v) => set("consigneePhone", v.replace(/\D/g, "").slice(0, 10))} keyboardType="phone-pad" maxLength={10} placeholderTextColor={colors.textMuted} />
            </View>

            <SectionDivider label="SHIPMENT DETAILS" />
            <View style={s.formPad}>
              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Origin City</Text>
                  <TextInput style={s.input} value={form.originCity} onChangeText={(v) => set("originCity", v)} placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Destination City</Text>
                  <TextInput style={s.input} value={form.destinationCity} onChangeText={(v) => set("destinationCity", v)} placeholderTextColor={colors.textMuted} />
                </View>
              </View>
              <Text style={s.inputLabel}>Vehicle Number</Text>
              <TextInput style={s.input} value={form.vehicleNumber} onChangeText={(v) => set("vehicleNumber", v.toUpperCase())} autoCapitalize="characters" placeholderTextColor={colors.textMuted} />
              <Text style={s.inputLabel}>Goods Description</Text>
              <TextInput style={[s.input, s.inputMulti]} value={form.goodsDescription} onChangeText={(v) => set("goodsDescription", v)} multiline placeholderTextColor={colors.textMuted} />
              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Packages</Text>
                  <TextInput style={s.input} value={form.noOfPackages} onChangeText={(v) => set("noOfPackages", v)} keyboardType="number-pad" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Weight (KG)</Text>
                  <TextInput style={s.input} value={form.weightKg} onChangeText={(v) => set("weightKg", v)} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
                </View>
              </View>
              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Declared Value (₹)</Text>
                  <TextInput style={s.input} value={form.declaredValue} onChangeText={(v) => set("declaredValue", v)} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Freight (₹)</Text>
                  <TextInput style={s.input} value={form.freightAmount} onChangeText={(v) => set("freightAmount", v)} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
                </View>
              </View>
              <Text style={s.inputLabel}>Special Instructions</Text>
              <TextInput style={[s.input, s.inputMulti]} value={form.specialInstructions} onChangeText={(v) => set("specialInstructions", v)} multiline placeholder="Optional" placeholderTextColor={colors.textMuted} />
            </View>

            {/* Signature in edit mode */}
            <SectionDivider label="DRIVER SIGNATURE" />
            <View style={s.formPad}>
              {signatureUrl ? (
                <View style={s.sigEditCard}>
                  <Image source={{ uri: absUrl(signatureUrl) }} style={s.sigEditImg} resizeMode="contain" />
                  <TouchableOpacity style={s.sigChangeBtn} onPress={() => sigRef.current?.open()}>
                    <Ionicons name="create-outline" size={14} color={colors.primaryLight} />
                    <Text style={s.sigChangeText}>Change Signature</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.sigAddBtn} onPress={() => sigRef.current?.open()}>
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={s.sigAddText}>Add Signature</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          /* ═══ VIEW MODE ═══════════════════════════════ */
          <>
            <SectionDivider label="CONSIGNOR (SENDER)" />
            <View style={s.table}>
              <FieldRow label="Name" value={lr.consignorName} colors={colors} s={s} />
              <FieldRow label="Address" value={lr.consignorAddress} last colors={colors} s={s} />
            </View>

            <SectionDivider label="CONSIGNEE (RECEIVER)" />
            <View style={s.table}>
              <FieldRow label="Name" value={lr.consigneeName} colors={colors} s={s} />
              <FieldRow label="Address" value={lr.consigneeAddress} colors={colors} s={s} />
              <FieldRow label="Phone" value={lr.consigneePhone} phone last colors={colors} s={s} />
            </View>

            <SectionDivider label="SHIPMENT DETAILS" />
            <View style={s.table}>
              <FieldRow label="Vehicle No." value={lr.vehicleNumber} bold colors={colors} s={s} />
              <FieldRow label="Goods" value={lr.goodsDescription} colors={colors} s={s} />
              <FieldRow label="Packages" value={String(lr.noOfPackages)} colors={colors} s={s} />
              <FieldRow label="Weight" value={`${lr.weightKg} KG`} colors={colors} s={s} />
              <FieldRow label="Declared Value" value={formatINR(lr.declaredValue)} colors={colors} s={s} />
              <FieldRow label="Freight" value={formatINR(lr.freightAmount)} colors={colors} s={s} />
              <FieldRow label="Payment Mode" value={lr.paymentMode} colors={colors} s={s} />
              <FieldRow label="Dispatch Date" value={dispatchFormatted} colors={colors} s={s} />
              {lr.specialInstructions ? (
                <FieldRow label="Instructions" value={lr.specialInstructions} last colors={colors} s={s} />
              ) : null}
            </View>

            {lr.photos && lr.photos.length > 0 && (
              <>
                <SectionDivider label={`GOODS PHOTOS (${lr.photos.length})`} />
                <View style={s.photoRow}>
                  {lr.photos.map((url) => (
                    <Image key={url} source={{ uri: absUrl(url) }} style={s.photoThumb} />
                  ))}
                </View>
              </>
            )}

            {lr.signatureUrl && (
              <>
                <SectionDivider label="DRIVER SIGNATURE" />
                <View style={s.signatureWrap}>
                  <Image source={{ uri: absUrl(lr.signatureUrl) }} style={s.signatureImg} resizeMode="contain" />
                  <Text style={s.signedBy}>Signed by: {lr.driver?.name ?? "Driver"} · Driver</Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <SignaturePad ref={sigRef} driverName={lr.driver?.name} onCapture={captureSignature} />
    </View>
  );
}

/* ── Helpers ───────────────────────────────────────── */

function absUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${API_URL}${url}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={dividerStyles.wrap}>
      <Text style={dividerStyles.text}>{label}</Text>
    </View>
  );
}

const dividerStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.8,
  },
});

function FieldRow({
  label, value, last, phone, bold, colors, s,
}: {
  label: string; value: string; last?: boolean; phone?: boolean; bold?: boolean;
  colors: ThemeColors; s: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[s.fieldRow, !last && s.fieldBorder]}>
      <Text style={s.fieldLabel}>{label}</Text>
      {phone ? (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${value}`)}>
          <Text style={s.fieldPhone}>{value}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[s.fieldValue, bold && { fontWeight: "700" }]}>{value}</Text>
      )}
    </View>
  );
}

/* ── Styles ────────────────────────────────────────── */

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },

    header: {
      backgroundColor: colors.primary,
      paddingTop: 54, paddingBottom: 18, paddingHorizontal: 16,
      flexDirection: "row", alignItems: "center", gap: 10,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
    headerSub: { color: "#C4B5FD", fontSize: 12, marginTop: 2 },
    headerSaveBtn: {
      backgroundColor: "#D1FAE5", paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 10,
    },
    headerSaveText: { color: "#059669", fontSize: 14, fontWeight: "700" },
    editBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    },
    editBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },

    actionRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14 },
    pdfBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, backgroundColor: "#059669", borderRadius: 12, paddingVertical: 13,
    },
    shareBtn: {
      flex: 0.7, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, backgroundColor: "#7C3AED", borderRadius: 12, paddingVertical: 13,
    },
    actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

    deliverBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.primaryLight, borderRadius: 12, paddingVertical: 14, marginTop: 10,
    },
    deliverText: { color: "#fff", fontSize: 14, fontWeight: "700" },

    rejectionCard: {
      flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 14,
      padding: 14, borderRadius: 12, backgroundColor: "#FEF2F2",
      borderWidth: 1, borderColor: "#FECACA",
    },
    rejectionTitle: { color: colors.error, fontWeight: "700", fontSize: 13 },
    rejectionMsg: { color: "#991B1B", fontSize: 12, marginTop: 2, lineHeight: 18 },

    routeRow: {
      flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
      paddingVertical: 18, marginTop: 8, backgroundColor: colors.card,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    routeCity: { flex: 1 },
    routeCityName: { fontSize: 16, fontWeight: "700", color: colors.text },
    routeCityLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    routeLineWrap: { flexDirection: "row", alignItems: "center", flex: 1.2, paddingHorizontal: 4 },
    routeLine: { flex: 1, height: 1.5, backgroundColor: colors.border },
    routeIconWrap: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: colors.iconBg,
      alignItems: "center", justifyContent: "center", marginHorizontal: 4,
    },

    table: { paddingHorizontal: 16 },
    fieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 12 },
    fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    fieldLabel: { fontSize: 13, color: colors.textMuted, flex: 0.4 },
    fieldValue: { fontSize: 14, color: colors.text, fontWeight: "500", flex: 0.6, textAlign: "left" },
    fieldPhone: { fontSize: 14, fontWeight: "600", color: "#2563EB" },

    photoRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 8 },
    photoThumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.border },

    signatureWrap: { paddingHorizontal: 16, paddingTop: 8 },
    signatureImg: {
      width: "100%", height: 90, borderRadius: 10,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    },
    signedBy: { fontSize: 11, color: colors.textMuted, marginTop: 8, fontStyle: "italic" },

    /* Edit-mode form styles */
    formPad: { paddingHorizontal: 16 },
    formRow: { flexDirection: "row" },
    inputLabel: {
      fontSize: 12, fontWeight: "600", color: colors.textMuted, marginTop: 12, marginBottom: 4,
    },
    input: {
      backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text,
    },
    inputMulti: { height: 72, textAlignVertical: "top", paddingTop: 12 },
    sigEditCard: {
      backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      padding: 12, alignItems: "center",
    },
    sigEditImg: { width: "100%", height: 80, borderRadius: 8 },
    sigChangeBtn: {
      flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10,
    },
    sigChangeText: { fontSize: 13, fontWeight: "600", color: colors.primaryLight },
    sigAddBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14,
    },
    sigAddText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  });
}
