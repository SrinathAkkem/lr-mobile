import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { colors } from "@/constants/theme";
import { OtpBoxes } from "@/components/OtpBoxes";

export default function LoginScreen() {
  const { sendOtp, login } = useAuth();
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startResendTimer() {
    setResendTimer(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOtp() {
    if (mobile.length !== 10) {
      Alert.alert("Invalid number", "Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    const res = await sendOtp(mobile);
    setLoading(false);
    if (res.ok) {
      setOtpSent(true);
      startResendTimer();
    } else {
      Alert.alert("Couldn't send OTP", res.error ?? "Try again in a moment.");
    }
  }

  async function handleVerify() {
    if (otp.length !== 6) return;
    setLoading(true);
    const res = await login(mobile, otp);
    setLoading(false);
    if (!res.ok) {
      Alert.alert("Invalid OTP", res.error ?? "Please re-enter the code.");
      setOtp("");
      return;
    }
    router.replace("/");
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    setLoading(true);
    const res = await sendOtp(mobile);
    setLoading(false);
    if (res.ok) {
      startResendTimer();
    } else {
      Alert.alert("Couldn't resend", res.error ?? "Try again.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Purple Header */}
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/ronohub-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Company Admin</Text>
          <Text style={styles.subtitle}>
            Sign in to manage your fleet & LRs
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Mobile Number */}
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefixChip}>
              <Ionicons name="call-outline" size={14} color={colors.textMuted} />
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              value={mobile}
              onChangeText={(t) => setMobile(t.replace(/\D/g, "").slice(0, 10))}
              keyboardType="phone-pad"
              placeholder="98765 43210"
              placeholderTextColor="#CBD5E1"
              maxLength={10}
              editable={!otpSent}
            />
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity
            style={[styles.sendBtn, (mobile.length !== 10 || otpSent) && styles.btnDisabled]}
            onPress={handleSendOtp}
            disabled={loading || mobile.length !== 10 || otpSent}
            activeOpacity={0.8}
          >
            {loading && !otpSent ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.sendBtnText}>Send OTP</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Enter OTP sent to your number</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OTP Code */}
          <Text style={styles.label}>OTP Code</Text>
          <OtpBoxes value={otp} onChange={setOtp} length={6} autoFocus={false} />

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyBtn, otp.length !== 6 && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={loading || otp.length !== 6}
            activeOpacity={0.8}
          >
            {loading && otpSent ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.verifyBtnText}>Verify & Login</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive OTP? </Text>
            {resendTimer > 0 ? (
              <Text style={styles.resendTimer}>
                Resend in 0:{resendTimer.toString().padStart(2, "0")}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={loading}>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 72,
    paddingBottom: 44,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 32,
    tintColor: "#fff",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 20,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#C4B5FD",
    marginTop: 8,
    fontSize: 14,
  },
  formCard: {
    marginTop: -16,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  prefixChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: "#F8FAFC",
  },
  prefixText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 14,
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  btnDisabled: { opacity: 0.45 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 14,
  },
  verifyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  resendText: { fontSize: 13, color: colors.textMuted },
  resendTimer: { fontSize: 13, color: colors.primaryLight, fontWeight: "700" },
  resendLink: {
    fontSize: 13,
    color: colors.primaryLight,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
