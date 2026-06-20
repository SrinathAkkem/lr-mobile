import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import SignatureCanvas, {
  SignatureViewRef,
} from "react-native-signature-canvas";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

export interface SignaturePadHandle {
  open: () => void;
}

interface Props {
  driverName?: string;
  onCapture: (dataUri: string) => void;
  onSubmitLR?: () => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  ({ driverName, onCapture, onSubmitLR }, ref) => {
    const colors = useThemeColors();
    const s = createStyles(colors);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const canvasRef = useRef<SignatureViewRef>(null);

    useImperativeHandle(ref, () => ({
      open: () => {
        setSaved(false);
        setOpen(true);
      },
    }));

    const webStyle = `
      .m-signature-pad { box-shadow: none; border: none; }
      .m-signature-pad--body { border: none; }
      .m-signature-pad--footer { display: none; margin: 0; }
      body, html { background: white; }
    `;

    function handleConfirm() {
      setBusy(true);
      canvasRef.current?.readSignature();
    }

    function handleClear() {
      canvasRef.current?.clearSignature();
      setSaved(false);
    }

    return (
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.root}>
          {/* ── Purple Header ────────────────────────── */}
          <View style={s.header}>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={s.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Driver Signature</Text>
              <Text style={s.headerSub}>Step 4 of 4 — Required</Text>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            bounces={false}
          >
            {/* ── Instruction ────────────────────────── */}
            <View style={s.instructions}>
              <Text style={s.instructTitle}>Sign below with your finger</Text>
              <Text style={s.instructBody}>
                Your signature will appear on the LR PDF. Use your finger to
                sign clearly in the white box below.
              </Text>
            </View>

            {/* ── Signature Canvas ────────────────────── */}
            <View style={s.canvasOuter}>
              {driverName ? (
                <Text style={s.canvasName}>{driverName}</Text>
              ) : null}
              <View style={s.canvasInner}>
                <SignatureCanvas
                  ref={canvasRef}
                  webStyle={webStyle}
                  onOK={(dataUri) => {
                    onCapture(dataUri);
                    setBusy(false);
                    setSaved(true);
                  }}
                  onEmpty={() => {
                    setBusy(false);
                    setSaved(false);
                  }}
                  autoClear={false}
                  imageType="image/png"
                  backgroundColor="white"
                  penColor="#1E1B4B"
                  minWidth={1.5}
                  maxWidth={3}
                  descriptionText=""
                />
                {busy && (
                  <View style={s.overlay}>
                    <ActivityIndicator color={colors.primary} size="large" />
                  </View>
                )}
              </View>
            </View>

            {/* ── Action buttons ──────────────────────── */}
            <View style={s.actions}>
              <TouchableOpacity
                style={s.clearBtn}
                onPress={handleClear}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color={colors.text} />
                <Text style={s.clearText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, busy && { opacity: 0.6 }]}
                onPress={handleConfirm}
                disabled={busy}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={s.confirmText}>Confirm Signature</Text>
              </TouchableOpacity>
            </View>

            {/* ── Success Banner ──────────────────────── */}
            {saved && (
              <View style={s.successBanner}>
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={s.successTitle}>Signature Saved</Text>
                  <Text style={s.successHint}>
                    This will be printed on the LR document
                  </Text>
                </View>
              </View>
            )}

            {/* ── Submit LR Now ──────────────────────── */}
            {saved && onSubmitLR && (
              <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                <TouchableOpacity
                  style={s.submitBtn}
                  onPress={() => {
                    setOpen(false);
                    onSubmitLR();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={s.submitText}>Submit LR Now</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  },
);

SignaturePad.displayName = "SignaturePad";

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

    /* Instructions */
    instructions: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 8,
    },
    instructTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    instructBody: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginTop: 8,
    },

    /* Canvas */
    canvasOuter: {
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
      backgroundColor: "#fff",
      overflow: "hidden",
    },
    canvasName: {
      fontSize: 13,
      color: colors.textMuted,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    canvasInner: {
      height: 200,
      backgroundColor: "white",
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.7)",
    },

    /* Action buttons */
    actions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      marginTop: 20,
    },
    clearBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      flex: 0.7,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clearText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      flex: 1.3,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.primaryLight,
    },
    confirmText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fff",
    },

    /* Success banner */
    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginHorizontal: 16,
      marginTop: 20,
      backgroundColor: "#ECFDF5",
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: "#A7F3D0",
    },
    successTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#059669",
    },
    successHint: {
      fontSize: 12,
      color: "#047857",
      marginTop: 2,
    },

    /* Submit button */
    submitBtn: {
      backgroundColor: "#059669",
      borderRadius: 16,
      paddingVertical: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      shadowColor: "#059669",
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    submitText: {
      color: "#fff",
      fontSize: 17,
      fontWeight: "700",
    },
  });
}
