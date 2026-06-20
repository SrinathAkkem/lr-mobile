import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

export interface PhotoItem {
  localUri: string;
  remoteUrl?: string;
  state: "uploading" | "ready" | "failed";
}

interface Props {
  visible: boolean;
  photos: PhotoItem[];
  maxPhotos?: number;
  onUpload: (dataUri: string) => Promise<string | null>;
  onChange: (next: PhotoItem[]) => void;
  onDone: () => void;
  onSkip: () => void;
}

function guessMime(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

export function UploadPhotosModal({
  visible,
  photos,
  maxPhotos = 5,
  onUpload,
  onChange,
  onDone,
  onSkip,
}: Props) {
  const colors = useThemeColors();
  const s = createStyles(colors);
  const [working, setWorking] = useState(false);

  async function pick(source: "camera" | "gallery") {
    if (photos.length >= maxPhotos) {
      Alert.alert("Limit reached", `You can attach up to ${maxPhotos} photos.`);
      return;
    }
    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission required",
        source === "camera"
          ? "Allow camera access to take photos."
          : "Allow photo library access to attach photos.",
      );
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            base64: true,
            quality: 0.7,
          });
    if (result.canceled || !result.assets?.length) return;

    setWorking(true);
    try {
      for (const asset of result.assets) {
        if (photos.length + 1 > maxPhotos) break;
        const mime = guessMime(asset.uri);
        const dataUri = `data:${mime};base64,${asset.base64 ?? ""}`;
        const newItem: PhotoItem = { localUri: asset.uri, state: "uploading" };
        const next = [...photos, newItem];
        onChange(next);
        const uploaded = await onUpload(dataUri);
        const finalNext = next.map((p) =>
          p.localUri === asset.uri
            ? { ...p, remoteUrl: uploaded ?? undefined, state: uploaded ? ("ready" as const) : ("failed" as const) }
            : p,
        );
        onChange(finalNext);
      }
    } finally {
      setWorking(false);
    }
  }

  function remove(localUri: string) {
    onChange(photos.filter((p) => p.localUri !== localUri));
  }

  const remaining = maxPhotos - photos.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onSkip}>
      <View style={s.root}>
        {/* ── Purple Header ─────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity onPress={onSkip} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Upload Goods Photos</Text>
            <Text style={s.headerSub}>
              Step 3 of 4 — Optional, max {maxPhotos} photos
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        >
          {/* ── Progress indicator ───────────────────── */}
          <View style={s.progressBar}>
            <Ionicons name="camera-outline" size={16} color="#fff" />
            <Text style={s.progressText}>
              {photos.length} of {maxPhotos} photos added
            </Text>
            <View style={{ flex: 1 }} />
            <View style={s.dots}>
              {Array.from({ length: maxPhotos }).map((_, i) => (
                <View
                  key={i}
                  style={[s.dot, i < photos.length ? s.dotFilled : s.dotEmpty]}
                />
              ))}
            </View>
          </View>

          {/* ── Take Photo / From Gallery buttons ────── */}
          {photos.length < maxPhotos && (
            <View style={s.pickerRow}>
              <TouchableOpacity
                style={[s.pickerCard, { borderColor: "#93C5FD" }]}
                onPress={() => pick("camera")}
                disabled={working}
                activeOpacity={0.7}
              >
                <View style={[s.pickerIconWrap, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="camera-outline" size={28} color="#2563EB" />
                </View>
                <Text style={[s.pickerLabel, { color: "#2563EB" }]}>Take Photo</Text>
                <Text style={s.pickerHint}>Use camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.pickerCard, { borderColor: "#C4B5FD" }]}
                onPress={() => pick("gallery")}
                disabled={working}
                activeOpacity={0.7}
              >
                <View style={[s.pickerIconWrap, { backgroundColor: "#EDE9FE" }]}>
                  <Ionicons name="images-outline" size={28} color="#7C3AED" />
                </View>
                <Text style={[s.pickerLabel, { color: "#7C3AED" }]}>From Gallery</Text>
                <Text style={s.pickerHint}>Pick from phone</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Uploaded Photos ──────────────────────── */}
          {photos.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Uploaded Photos</Text>
              <View style={s.thumbGrid}>
                {photos.map((p) => (
                  <View key={p.localUri} style={s.thumbWrap}>
                    <Image source={{ uri: p.localUri }} style={s.thumbImg} />
                    <TouchableOpacity
                      style={s.removeBtn}
                      onPress={() => remove(p.localUri)}
                    >
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                    {p.state === "uploading" && (
                      <View style={s.thumbOverlay}>
                        <ActivityIndicator color="#fff" />
                      </View>
                    )}
                    {p.state === "failed" && (
                      <View style={[s.thumbOverlay, { backgroundColor: "rgba(220,38,38,0.7)" }]}>
                        <Text style={s.failText}>Failed</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Info Banner ──────────────────────────── */}
          <View style={s.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
            <Text style={s.infoText}>
              Photos are optional but help the company admin verify the goods. Take
              clear photos of the packed goods before loading.
            </Text>
          </View>
        </ScrollView>

        {/* ── Bottom Buttons ─────────────────────────── */}
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.skipBtn} onPress={onSkip} activeOpacity={0.7}>
            <Text style={s.skipText}>Skip Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.nextBtn}
            onPress={onDone}
            activeOpacity={0.85}
          >
            <Text style={s.nextText}>Next:{"\n"}Signature</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

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
    headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
    headerSub: { color: "#C4B5FD", fontSize: 12, marginTop: 3 },

    /* Progress */
    progressBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 2,
      borderColor: "#93C5FD",
      borderStyle: "dashed",
    },
    progressText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    dots: { flexDirection: "row", gap: 5 },
    dot: { width: 14, height: 6, borderRadius: 3 },
    dotFilled: { backgroundColor: "#F59E0B" },
    dotEmpty: { backgroundColor: "rgba(255,255,255,0.25)" },

    /* Picker cards */
    pickerRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
    },
    pickerCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1.5,
      paddingVertical: 20,
      alignItems: "center",
      gap: 6,
    },
    pickerIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    pickerLabel: { fontSize: 14, fontWeight: "700" },
    pickerHint: { fontSize: 11, color: colors.textMuted },

    /* Uploaded section */
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginTop: 22,
      marginBottom: 12,
    },
    thumbGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    thumbWrap: {
      width: 100,
      height: 100,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: colors.border,
    },
    thumbImg: { width: "100%", height: "100%" },
    removeBtn: {
      position: "absolute",
      top: -2,
      right: -2,
      backgroundColor: "#fff",
      borderRadius: 11,
    },
    thumbOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
    },
    failText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    /* Info banner */
    infoBanner: {
      flexDirection: "row",
      gap: 10,
      marginTop: 20,
      backgroundColor: "#EFF6FF",
      borderRadius: 12,
      padding: 14,
      alignItems: "flex-start",
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      color: "#1E40AF",
      lineHeight: 18,
    },

    /* Bottom bar */
    bottomBar: {
      flexDirection: "row",
      gap: 12,
      padding: 16,
      paddingBottom: 34,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    skipBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 14,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    skipText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textMuted,
    },
    nextBtn: {
      flex: 1.4,
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 14,
      backgroundColor: colors.primaryLight,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    nextText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fff",
      textAlign: "center",
    },
  });
}
