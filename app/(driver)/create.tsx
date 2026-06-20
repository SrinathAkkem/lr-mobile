import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardTypeOptions,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useThemeColors, type ThemeColors } from "@/constants/theme";
import { UploadPhotosModal, type PhotoItem } from "@/components/UploadPhotosModal";
import { SignaturePad, SignaturePadHandle } from "@/components/SignaturePad";

type FormState = {
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
  paymentMode: "To Pay" | "Paid" | "To Be Billed";
  dispatchDate: string;
  specialInstructions: string;
};

const PAYMENT_MODES = ["To Pay", "Paid", "To Be Billed"] as const;

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const formatted = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return isToday ? `${formatted} (Today)` : formatted;
}

export default function CreateLRScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { user } = useAuth();
  const sigRef = useRef<SignaturePadHandle>(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "photos" | "signature", string>>>({});

  const [form, setForm] = useState<FormState>({
    consignorName: "",
    consignorAddress: "",
    consigneeName: "",
    consigneeAddress: "",
    consigneePhone: "",
    originCity: "",
    destinationCity: "",
    vehicleNumber: "",
    goodsDescription: "",
    noOfPackages: "",
    weightKg: "",
    declaredValue: "",
    freightAmount: "",
    paymentMode: "To Pay",
    dispatchDate: new Date().toISOString().split("T")[0],
    specialInstructions: "",
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    const required: (keyof FormState)[] = [
      "consignorName", "consignorAddress", "consigneeName", "consigneeAddress",
      "consigneePhone", "originCity", "destinationCity", "vehicleNumber",
      "goodsDescription", "noOfPackages", "weightKg", "declaredValue",
      "freightAmount", "dispatchDate",
    ];
    for (const k of required) {
      if (!String(form[k] ?? "").trim()) next[k] = "Required";
    }
    if (form.consigneePhone && !/^\d{10}$/.test(form.consigneePhone))
      next.consigneePhone = "Must be 10 digits";
    if (form.noOfPackages && !/^\d+$/.test(form.noOfPackages))
      next.noOfPackages = "Whole number only";
    for (const k of ["weightKg", "declaredValue", "freightAmount"] as const) {
      if (form[k] && Number.isNaN(Number(form[k]))) next[k] = "Numbers only";
    }
    if (!signatureUrl) next.signature = "Driver signature required";
    if (photos.some((p) => p.state === "uploading"))
      next.photos = "Wait for uploads to finish";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function uploadPhoto(dataUri: string): Promise<string | null> {
    const res = await api.uploadPhoto(dataUri);
    return res.success && res.data ? res.data.url : null;
  }

  async function captureSignature(dataUri: string) {
    const res = await api.uploadSignature(dataUri);
    if (res.success && res.data) {
      setSignatureUrl(res.data.url);
      setErrors((e) => ({ ...e, signature: undefined }));
    } else {
      Alert.alert("Upload failed", res.error ?? "Couldn't save signature.");
    }
  }

  async function submit() {
    if (!validate()) {
      Alert.alert("Check the form", "Some required fields are missing.");
      return;
    }
    setLoading(true);
    const payload = {
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
      dispatchDate: form.dispatchDate,
      specialInstructions: form.specialInstructions.trim() || undefined,
      photos: photos.map((p) => p.remoteUrl).filter((u): u is string => !!u),
      signatureUrl,
    };
    const res = await api.createLR(payload);
    setLoading(false);
    if (res.success && res.data) {
      router.replace({
        pathname: "/submitted",
        params: { tracking: res.data.trackingId, id: res.data.id },
      });
    } else {
      Alert.alert("Error", res.error ?? "Failed to submit LR");
    }
  }

  return (
    <View style={styles.outer}>
      {/* ── Purple Header ──────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Create LR</Text>
          <Text style={styles.headerSub}>Fill all details carefully</Text>
        </View>
        <View style={styles.sectionsBadge}>
          <Text style={styles.sectionsBadgeText}>4 Sections</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ SECTION 1: CONSIGNOR ═══════════════════════ */}
        <SectionHead
          num={1}
          title="CONSIGNOR (SENDER)"
          icon="person-outline"
          colors={colors}
          styles={styles}
        />

        <Label text="Consignor Name *" styles={styles} />
        <View style={styles.fieldPad}>
          <TextInput
            style={styles.input}
            value={form.consignorName}
            onChangeText={(v) => set("consignorName", v)}
            placeholder="Srinivas Textiles Pvt Ltd"
            placeholderTextColor={colors.textMuted}
          />
          {errors.consignorName ? <Text style={styles.error}>{errors.consignorName}</Text> : null}
        </View>

        <Label text="Consignor Address *" styles={styles} />
        <View style={styles.fieldPad}>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={form.consignorAddress}
            onChangeText={(v) => set("consignorAddress", v)}
            multiline
            placeholder="Plot 14, Industrial Area, Secunderabad, Telangana 500015"
            placeholderTextColor={colors.textMuted}
          />
          {errors.consignorAddress ? <Text style={styles.error}>{errors.consignorAddress}</Text> : null}
        </View>

        {/* ═══ SECTION 2: CONSIGNEE ═══════════════════════ */}
        <SectionHead
          num={2}
          title="CONSIGNEE (RECEIVER)"
          icon="people-outline"
          colors={colors}
          styles={styles}
        />

        <Label text="Consignee Name *" styles={styles} />
        <View style={styles.fieldPad}>
          <TextInput
            style={styles.input}
            value={form.consigneeName}
            onChangeText={(v) => set("consigneeName", v)}
            placeholder="Krishna Fabrics"
            placeholderTextColor={colors.textMuted}
          />
          {errors.consigneeName ? <Text style={styles.error}>{errors.consigneeName}</Text> : null}
        </View>

        <Label text="Consignee Address *" styles={styles} />
        <View style={styles.fieldPad}>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={form.consigneeAddress}
            onChangeText={(v) => set("consigneeAddress", v)}
            multiline
            placeholder="Shop 8, MG Road, Vijayawada, Andhra Pradesh 520001"
            placeholderTextColor={colors.textMuted}
          />
          {errors.consigneeAddress ? <Text style={styles.error}>{errors.consigneeAddress}</Text> : null}
        </View>

        <Label text="Consignee Phone *" styles={styles} />
        <View style={styles.fieldPad}>
          <TextInput
            style={styles.input}
            value={form.consigneePhone}
            onChangeText={(v) => set("consigneePhone", v.replace(/\D/g, "").slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="9876512340"
            placeholderTextColor={colors.textMuted}
          />
          {errors.consigneePhone ? <Text style={styles.error}>{errors.consigneePhone}</Text> : null}
        </View>

        {/* ═══ SECTION 3: SHIPMENT DETAILS ════════════════ */}
        <SectionHead
          num={3}
          title="SHIPMENT DETAILS"
          icon="cube-outline"
          colors={colors}
          styles={styles}
        />

        {/* Origin / Destination side-by-side */}
        <View style={styles.rowLabels}>
          <Text style={[styles.labelText, { flex: 1 }]}>Origin City *</Text>
          <View style={{ width: 12 }} />
          <Text style={[styles.labelText, { flex: 1 }]}>Destination *</Text>
        </View>
        <View style={styles.rowFields}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={form.originCity}
              onChangeText={(v) => set("originCity", v)}
              placeholder="Hyderabad"
              placeholderTextColor={colors.textMuted}
            />
            {errors.originCity ? <Text style={styles.error}>{errors.originCity}</Text> : null}
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={form.destinationCity}
              onChangeText={(v) => set("destinationCity", v)}
              placeholder="Vijayawada"
              placeholderTextColor={colors.textMuted}
            />
            {errors.destinationCity ? <Text style={styles.error}>{errors.destinationCity}</Text> : null}
          </View>
        </View>

        <Label text="Vehicle Number *" styles={styles} />
        <View style={styles.fieldPad}>
          <TextInput
            style={[styles.input, { fontWeight: "700", letterSpacing: 1 }]}
            value={form.vehicleNumber}
            onChangeText={(v) => set("vehicleNumber", v.toUpperCase())}
            autoCapitalize="characters"
            placeholder="AP39AB1234"
            placeholderTextColor={colors.textMuted}
          />
          {errors.vehicleNumber ? <Text style={styles.error}>{errors.vehicleNumber}</Text> : null}
        </View>

        <Label text="Goods Description *" styles={styles} />
        <View style={styles.fieldPad}>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={form.goodsDescription}
            onChangeText={(v) => set("goodsDescription", v)}
            multiline
            placeholder="Cotton fabric rolls — 200 bales, packed in gunny bags. Handle with care."
            placeholderTextColor={colors.textMuted}
          />
          {errors.goodsDescription ? <Text style={styles.error}>{errors.goodsDescription}</Text> : null}
        </View>

        {/* No. of Packages / Weight side-by-side */}
        <View style={styles.rowLabels}>
          <Text style={[styles.labelText, { flex: 1 }]}>No. of Packages *</Text>
          <View style={{ width: 12 }} />
          <Text style={[styles.labelText, { flex: 1 }]}>Weight (KG) *</Text>
        </View>
        <View style={styles.rowFields}>
          <View style={{ flex: 1 }}>
            <TextInput style={styles.input} value={form.noOfPackages} onChangeText={(v) => set("noOfPackages", v)} keyboardType="number-pad" placeholder="200" placeholderTextColor={colors.textMuted} />
            {errors.noOfPackages ? <Text style={styles.error}>{errors.noOfPackages}</Text> : null}
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <TextInput style={styles.input} value={form.weightKg} onChangeText={(v) => set("weightKg", v)} keyboardType="decimal-pad" placeholder="1850.5" placeholderTextColor={colors.textMuted} />
            {errors.weightKg ? <Text style={styles.error}>{errors.weightKg}</Text> : null}
          </View>
        </View>

        {/* Declared Value / Freight side-by-side */}
        <View style={styles.rowLabels}>
          <Text style={[styles.labelText, { flex: 1 }]}>Declared Value (₹) *</Text>
          <View style={{ width: 12 }} />
          <Text style={[styles.labelText, { flex: 1 }]}>Freight Amount (₹) *</Text>
        </View>
        <View style={styles.rowFields}>
          <View style={{ flex: 1 }}>
            <TextInput style={styles.input} value={form.declaredValue} onChangeText={(v) => set("declaredValue", v)} keyboardType="decimal-pad" placeholder="4,20,000" placeholderTextColor={colors.textMuted} />
            {errors.declaredValue ? <Text style={styles.error}>{errors.declaredValue}</Text> : null}
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <TextInput style={styles.input} value={form.freightAmount} onChangeText={(v) => set("freightAmount", v)} keyboardType="decimal-pad" placeholder="18,500" placeholderTextColor={colors.textMuted} />
            {errors.freightAmount ? <Text style={styles.error}>{errors.freightAmount}</Text> : null}
          </View>
        </View>

        {/* Payment Mode */}
        <Label text="Payment Mode *" styles={styles} />
        <View style={styles.fieldPad}>
          <View style={styles.chips}>
            {PAYMENT_MODES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, form.paymentMode === m && styles.chipActive]}
                onPress={() => set("paymentMode", m)}
              >
                <Text style={[styles.chipText, form.paymentMode === m && styles.chipTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date of Dispatch */}
        <Label text="Date of Dispatch *" styles={styles} />
        <View style={styles.fieldPad}>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateText}>{formatDisplayDate(form.dispatchDate)}</Text>
            <Ionicons name="calendar-outline" size={18} color={colors.primaryLight} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(form.dispatchDate)}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === "ios");
                if (date) set("dispatchDate", date.toISOString().split("T")[0]);
              }}
            />
          )}
          {errors.dispatchDate ? <Text style={styles.error}>{errors.dispatchDate}</Text> : null}
        </View>

        {/* Special Instructions */}
        <View style={styles.fieldPad}>
          <View style={styles.optionalRow}>
            <Text style={styles.labelText}>Special Instructions</Text>
            <Text style={styles.optionalTag}>Optional</Text>
          </View>
          <TextInput
            style={[styles.input, styles.inputMulti, { marginTop: 6 }]}
            value={form.specialInstructions}
            onChangeText={(v) => set("specialInstructions", v)}
            multiline
            placeholder="Add any special handling notes (optional)..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* ═══ SECTION 4: PHOTOS & SIGNATURE ══════════════ */}
        <SectionHead
          num={4}
          title="PHOTOS & SIGNATURE"
          icon="camera-outline"
          colors={colors}
          styles={styles}
        />

        <View style={styles.fieldPad}>
          <View style={styles.optionalRow}>
            <Text style={styles.labelBold}>Goods Photos</Text>
            <Text style={styles.optionalTag}>Optional · Max 5</Text>
          </View>
          <TouchableOpacity
            style={styles.photoTrigger}
            onPress={() => setPhotosOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.photoTriggerLeft}>
              <Ionicons
                name={photos.length > 0 ? "checkmark-circle" : "camera-outline"}
                size={20}
                color={photos.length > 0 ? colors.success : colors.primaryLight}
              />
              <Text style={[styles.photoTriggerText, photos.length > 0 && { color: colors.success }]}>
                {photos.length > 0
                  ? `${photos.length} photo${photos.length > 1 ? "s" : ""} added`
                  : "Tap to add photos"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          {errors.photos && <Text style={styles.error}>{errors.photos}</Text>}
        </View>

        <UploadPhotosModal
          visible={photosOpen}
          photos={photos}
          maxPhotos={5}
          onUpload={uploadPhoto}
          onChange={setPhotos}
          onDone={() => {
            setPhotosOpen(false);
            sigRef.current?.open();
          }}
          onSkip={() => setPhotosOpen(false)}
        />

        <View style={styles.fieldPad}>
          <Text style={styles.labelBold}>Driver Signature *</Text>
          <View style={styles.signatureBox}>
            {signatureUrl ? (
              <View style={styles.sigDoneRow}>
                <View style={styles.sigDoneLeft}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <View>
                    <Text style={styles.sigDoneTitle}>Signature Added</Text>
                    <Text style={styles.sigDoneHint}>Tap to view or change</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => sigRef.current?.open()}>
                  <Text style={styles.sigChangeLink}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.sigEmptyRow}>
                <Text style={styles.sigEmptyText}>Not signed yet</Text>
                <TouchableOpacity
                  style={styles.sigBtn}
                  onPress={() => sigRef.current?.open()}
                >
                  <Ionicons name="create-outline" size={14} color="#fff" />
                  <Text style={styles.sigBtnText}>Sign now</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {errors.signature && <Text style={styles.error}>{errors.signature}</Text>}
        </View>

        {/* ── Submit Button ────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={submit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            )}
            <Text style={styles.submitText}>
              {loading ? "Submitting..." : "Submit LR"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SignaturePad
        ref={sigRef}
        driverName={user?.name ?? "Driver"}
        onCapture={captureSignature}
        onSubmitLR={submit}
      />
    </View>
  );
}

/* ─── Section Header Sub-component ──────────────────────── */
function SectionHead({
  num,
  title,
  icon,
  colors,
  styles,
}: {
  num: number;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={13} color={colors.primaryLight} />
      </View>
      <Text style={styles.sectionText}>
        SECTION {num}: {title}
      </Text>
    </View>
  );
}

/* ─── Label Sub-component ───────────────────────────────── */
function Label({ text, styles }: { text: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.fieldPad}>
      <Text style={styles.labelText}>{text}</Text>
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────── */
function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    outer: { flex: 1, backgroundColor: colors.background },

    /* Header */
    header: {
      backgroundColor: colors.primary,
      paddingTop: 54,
      paddingBottom: 18,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
    headerSub: { color: "#C4B5FD", fontSize: 12, marginTop: 2 },
    sectionsBadge: {
      backgroundColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 14,
    },
    sectionsBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    /* Scroll */
    scroll: { flex: 1 },

    /* Section Head */
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
    },
    sectionIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.iconBg,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primaryLight,
      letterSpacing: 0.5,
    },

    /* Fields */
    fieldPad: { paddingHorizontal: 16, marginTop: 10 },
    labelText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      marginBottom: 0,
    },
    labelBold: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    optionalRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    optionalTag: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 14,
      color: colors.text,
      marginTop: 6,
    },
    inputMulti: {
      height: 76,
      textAlignVertical: "top",
      paddingTop: 12,
    },

    /* Row layouts */
    rowLabels: {
      flexDirection: "row",
      paddingHorizontal: 16,
      marginTop: 10,
    },
    rowFields: {
      flexDirection: "row",
      paddingHorizontal: 16,
    },

    /* Chips / Payment Mode */
    chips: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 6 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primaryLight,
      backgroundColor: "transparent",
    },
    chipActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primaryLight,
    },
    chipText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primaryLight,
    },
    chipTextActive: { color: "#fff" },

    /* Date */
    dateInput: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 13,
      marginTop: 6,
    },
    dateText: { fontSize: 14, color: colors.text, fontWeight: "500" },

    /* Signature */
    signatureBox: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginTop: 8,
    },
    sigDoneRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sigDoneLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    sigDoneTitle: { fontSize: 14, fontWeight: "700", color: colors.success },
    sigDoneHint: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    sigChangeLink: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primaryLight,
    },
    sigEmptyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sigEmptyText: { fontSize: 14, color: colors.textMuted },
    sigBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    sigBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    /* Photo trigger */
    photoTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginTop: 8,
    },
    photoTriggerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    photoTriggerText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primaryLight,
    },

    /* Errors */
    error: { color: colors.error, fontSize: 11, marginTop: 4 },

    /* Submit */
    submitBtn: {
      backgroundColor: "#059669",
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      shadowColor: "#059669",
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    submitText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  });
}
