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
import { colors } from "@/constants/theme";
import { PhotoPicker, PhotoItem } from "@/components/PhotoPicker";
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

export default function CreateLRScreen() {
  const sigRef = useRef<SignaturePadHandle>(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
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
      "consignorName",
      "consignorAddress",
      "consigneeName",
      "consigneeAddress",
      "consigneePhone",
      "originCity",
      "destinationCity",
      "vehicleNumber",
      "goodsDescription",
      "noOfPackages",
      "weightKg",
      "declaredValue",
      "freightAmount",
      "dispatchDate",
    ];
    for (const k of required) {
      const v = String(form[k] ?? "").trim();
      if (!v) next[k] = "Required";
    }
    if (form.consigneePhone && !/^\d{10}$/.test(form.consigneePhone)) {
      next.consigneePhone = "Must be 10 digits";
    }
    if (form.noOfPackages && !/^\d+$/.test(form.noOfPackages)) {
      next.noOfPackages = "Whole number only";
    }
    for (const k of ["weightKg", "declaredValue", "freightAmount"] as const) {
      if (form[k] && Number.isNaN(Number(form[k]))) {
        next[k] = "Numbers only";
      }
    }
    if (!signatureUrl) next.signature = "Driver signature required";
    if (photos.some((p) => p.state === "uploading")) {
      next.photos = "Wait for uploads to finish";
    }
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
      photos: photos
        .map((p) => p.remoteUrl)
        .filter((u): u is string => !!u),
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* White header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Create LR</Text>
          <Text style={styles.subtitle}>Fill in shipment details</Text>
        </View>
      </View>

      {/* Section 1: Consignor */}
      <SectionHeader icon="person-outline">Consignor</SectionHeader>
      <Field label="Consignor Name *" error={errors.consignorName}>
        <TextInput
          style={styles.input}
          value={form.consignorName}
          onChangeText={(v) => set("consignorName", v)}
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <Field label="Consignor Address *" error={errors.consignorAddress}>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={form.consignorAddress}
          onChangeText={(v) => set("consignorAddress", v)}
          multiline
          placeholder="Full address"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      {/* Section 2: Consignee */}
      <SectionHeader icon="people-outline">Consignee</SectionHeader>
      <Field label="Consignee Name *" error={errors.consigneeName}>
        <TextInput
          style={styles.input}
          value={form.consigneeName}
          onChangeText={(v) => set("consigneeName", v)}
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <Field label="Consignee Address *" error={errors.consigneeAddress}>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={form.consigneeAddress}
          onChangeText={(v) => set("consigneeAddress", v)}
          multiline
          placeholder="Full address"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <Field label="Consignee Phone *" error={errors.consigneePhone}>
        <TextInput
          style={styles.input}
          value={form.consigneePhone}
          onChangeText={(v) => set("consigneePhone", v.replace(/\D/g, "").slice(0, 10))}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="10-digit mobile"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      {/* Section 3: Shipment */}
      <SectionHeader icon="cube-outline">Shipment</SectionHeader>
      <Field label="Origin City *" error={errors.originCity}>
        <TextInput
          style={styles.input}
          value={form.originCity}
          onChangeText={(v) => set("originCity", v)}
          placeholder="From city"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <Field label="Destination City *" error={errors.destinationCity}>
        <TextInput
          style={styles.input}
          value={form.destinationCity}
          onChangeText={(v) => set("destinationCity", v)}
          placeholder="To city"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <Field label="Vehicle Number *" error={errors.vehicleNumber}>
        <TextInput
          style={styles.input}
          value={form.vehicleNumber}
          onChangeText={(v) => set("vehicleNumber", v.toUpperCase())}
          autoCapitalize="characters"
          placeholder="e.g. MH12AB1234"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <Field label="Goods Description *" error={errors.goodsDescription}>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={form.goodsDescription}
          onChangeText={(v) => set("goodsDescription", v)}
          multiline
          placeholder="Describe goods"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="No. of Packages *" error={errors.noOfPackages}>
            <NumericInput
              value={form.noOfPackages}
              onChangeText={(v) => set("noOfPackages", v)}
              keyboardType="number-pad"
              placeholder="0"
            />
          </Field>
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <Field label="Weight (KG) *" error={errors.weightKg}>
            <NumericInput
              value={form.weightKg}
              onChangeText={(v) => set("weightKg", v)}
              keyboardType="decimal-pad"
              placeholder="0.0"
            />
          </Field>
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="Declared Value (₹) *" error={errors.declaredValue}>
            <NumericInput
              value={form.declaredValue}
              onChangeText={(v) => set("declaredValue", v)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </Field>
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <Field label="Freight Amount (₹) *" error={errors.freightAmount}>
            <NumericInput
              value={form.freightAmount}
              onChangeText={(v) => set("freightAmount", v)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </Field>
        </View>
      </View>

      <Field label="Payment Mode *">
        <View style={styles.chips}>
          {PAYMENT_MODES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, form.paymentMode === m && styles.chipActive]}
              onPress={() => set("paymentMode", m)}
            >
              <Text
                style={[
                  styles.chipText,
                  form.paymentMode === m && { color: "#fff" },
                ]}
              >
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      <Field label="Date of Dispatch *" error={errors.dispatchDate}>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.inputText}>{form.dispatchDate}</Text>
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
      </Field>

      <Field label="Special Instructions (optional)">
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={form.specialInstructions}
          onChangeText={(v) => set("specialInstructions", v)}
          multiline
          placeholder="Fragile, keep dry, etc."
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      {/* Section 4: Photos & Signature */}
      <SectionHeader icon="camera-outline">Photos & Signature</SectionHeader>
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={styles.label}>Goods Photos (optional · up to 5)</Text>
        <PhotoPicker
          photos={photos}
          maxPhotos={5}
          onUpload={uploadPhoto}
          onChange={setPhotos}
        />
        {errors.photos && <Text style={styles.error}>{errors.photos}</Text>}
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <Text style={styles.label}>Driver Signature *</Text>
        <View style={styles.signatureBox}>
          {signatureUrl ? (
            <View style={styles.signatureStatus}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.signatureSaved}>Signature captured</Text>
            </View>
          ) : (
            <Text style={styles.signatureEmpty}>Not signed yet</Text>
          )}
          <TouchableOpacity
            style={styles.signatureBtn}
            onPress={() => sigRef.current?.open()}
          >
            <Ionicons name="create-outline" size={14} color="#fff" />
            <Text style={styles.signatureBtnText}>
              {signatureUrl ? "Re-sign" : "Sign now"}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.signature && (
          <Text style={styles.error}>{errors.signature}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submit, loading && { opacity: 0.6 }]}
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

      <SignaturePad ref={sigRef} onCapture={captureSignature} />
    </ScrollView>
  );
}

function SectionHeader({ children, icon }: { children: string; icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={14} color={colors.primaryLight} />
      </View>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function NumericInput({
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  keyboardType: KeyboardTypeOptions;
  placeholder?: string;
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    paddingTop: 56,
    paddingBottom: 16,
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
  headerCenter: { marginLeft: 12 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 6,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryLight,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  fieldWrap: { paddingHorizontal: 16, marginTop: 12 },
  row: { flexDirection: "row", paddingHorizontal: 16, marginTop: 0 },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    fontSize: 14,
    color: colors.text,
  },
  inputMultiline: { height: 88, textAlignVertical: "top" },
  inputText: { fontSize: 14, color: colors.text },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  signatureBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  signatureStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  signatureEmpty: { fontSize: 14, color: colors.textMuted },
  signatureSaved: { fontSize: 14, color: colors.success, fontWeight: "600" },
  signatureBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  signatureBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  error: { color: colors.error, fontSize: 12, marginTop: 4 },
  submit: {
    margin: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
