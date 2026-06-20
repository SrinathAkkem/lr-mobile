import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

export interface PhotoItem {
  localUri: string;
  remoteUrl?: string;
  state: "uploading" | "ready" | "failed";
}

interface Props {
  photos: PhotoItem[];
  maxPhotos?: number;
  onUpload: (dataUri: string) => Promise<string | null>;
  onChange: (next: PhotoItem[]) => void;
}

export function PhotoPicker({
  photos,
  maxPhotos = 5,
  onUpload,
  onChange,
}: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
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
        ? await ImagePicker.launchCameraAsync({
            base64: true,
            quality: 0.7,
            allowsEditing: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            base64: true,
            quality: 0.7,
            allowsMultipleSelection: false,
          });

    if (result.canceled || !result.assets?.length) return;

    setWorking(true);
    try {
      for (const asset of result.assets) {
        if (photos.length + 1 > maxPhotos) break;
        const mime = guessMime(asset.uri);
        const dataUri = `data:${mime};base64,${asset.base64 ?? ""}`;
        const newItem: PhotoItem = {
          localUri: asset.uri,
          state: "uploading",
        };
        const next = [...photos, newItem];
        onChange(next);
        const uploaded = await onUpload(dataUri);
        const finalNext = next.map((p) =>
          p.localUri === asset.uri
            ? {
                ...p,
                remoteUrl: uploaded ?? undefined,
                state: uploaded ? ("ready" as const) : ("failed" as const),
              }
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

  return (
    <View>
      <View style={styles.thumbnails}>
        {photos.map((p) => (
          <View key={p.localUri} style={styles.thumb}>
            <Image source={{ uri: p.localUri }} style={styles.thumbImg} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => remove(p.localUri)}
            >
              <Text style={styles.removeText}>×</Text>
            </TouchableOpacity>
            {p.state === "uploading" && (
              <View style={styles.thumbOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            {p.state === "failed" && (
              <View style={[styles.thumbOverlay, styles.thumbOverlayError]}>
                <Text style={styles.thumbOverlayText}>upload failed</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {photos.length < maxPhotos && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => pick("camera")}
            disabled={working}
          >
            <Text style={styles.actionEmoji}>📷</Text>
            <Text style={styles.actionLabel}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => pick("gallery")}
            disabled={working}
          >
            <Text style={styles.actionEmoji}>🖼</Text>
            <Text style={styles.actionLabel}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.hint}>
        {photos.length}/{maxPhotos} photos attached · max 8MB each
      </Text>
    </View>
  );
}

function guessMime(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    thumbnails: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    thumb: {
      width: 88,
      height: 88,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      position: "relative",
    },
    thumbImg: { width: "100%", height: "100%" },
    thumbOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    thumbOverlayError: { backgroundColor: "rgba(220,38,38,0.7)" },
    thumbOverlayText: { color: "#fff", fontSize: 10, fontWeight: "600" },
    removeBtn: {
      position: "absolute",
      top: 2,
      right: 2,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.65)",
      alignItems: "center",
      justifyContent: "center",
    },
    removeText: { color: "#fff", fontSize: 18, lineHeight: 18, fontWeight: "700" },
    actions: { flexDirection: "row", gap: 10, marginTop: 12 },
    actionBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    actionEmoji: { fontSize: 18 },
    actionLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
    hint: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  });
}
