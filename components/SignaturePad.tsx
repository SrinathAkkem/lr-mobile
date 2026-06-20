import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import SignatureCanvas, {
  SignatureViewRef,
} from "react-native-signature-canvas";
import { colors } from "@/constants/theme";

export interface SignaturePadHandle {
  open: () => void;
}

interface Props {
  onCapture: (dataUri: string) => void;
}

/**
 * Full-screen finger-drawing signature canvas. The webview-based canvas emits
 * a base64-encoded PNG when the user taps Confirm. `Clear` resets the canvas
 * without dismissing the modal.
 *
 * Usage:
 *   const ref = useRef<SignaturePadHandle>(null);
 *   <SignaturePad ref={ref} onCapture={(uri) => set(uri)} />
 *   <Button onPress={() => ref.current?.open()} />
 */
export const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  ({ onCapture }, ref) => {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const canvasRef = useRef<SignatureViewRef>(null);

    useImperativeHandle(ref, () => ({ open: () => setOpen(true) }));

    const webStyle = `
      .m-signature-pad { box-shadow: none; border: none; }
      .m-signature-pad--body { border: none; }
      .m-signature-pad--footer { display: none; margin: 0; }
      body, html { background: white; }
    `;

    return (
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.root}>
          <View style={styles.header}>
            <Text style={styles.title}>Driver Signature</Text>
            <Text style={styles.subtitle}>Sign below with your finger</Text>
          </View>

          <View style={styles.canvasWrap}>
            <SignatureCanvas
              ref={canvasRef}
              webStyle={webStyle}
              onOK={(dataUri) => {
                onCapture(dataUri);
                setBusy(false);
                setOpen(false);
              }}
              onEmpty={() => {
                setBusy(false);
              }}
              autoClear={false}
              imageType="image/png"
              backgroundColor="white"
              penColor="#0F172A"
              minWidth={1.5}
              maxWidth={3}
              descriptionText=""
            />
            {busy && (
              <View style={styles.overlay}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => canvasRef.current?.clearSignature()}
            >
              <Text style={styles.btnSecondaryText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={() => setOpen(false)}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => {
                setBusy(true);
                canvasRef.current?.readSignature();
              }}
            >
              <Text style={styles.btnPrimaryText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  },
);

SignaturePad.displayName = "SignaturePad";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#C4B5FD", fontSize: 13, marginTop: 4 },
  canvasWrap: { flex: 1, backgroundColor: "white" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  actions: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  btnGhost: { backgroundColor: "transparent" },
  btnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnSecondaryText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  btnGhostText: { color: colors.textMuted, fontSize: 15, fontWeight: "600" },
});
