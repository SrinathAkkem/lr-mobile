import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/theme";

export default function SubmittedScreen() {
  const { tracking, id } = useLocalSearchParams<{ tracking: string; id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✓</Text>
      <Text style={styles.title}>LR Submitted Successfully!</Text>
      <View style={styles.box}>
        <Text style={styles.label}>YOUR TRACKING ID</Text>
        <Text style={styles.tracking}>{tracking}</Text>
        <Text style={styles.status}>Status: Waiting for Approval</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={() => router.replace(`/(driver)/lr/${id}`)}>
        <Text style={styles.btnText}>View LR Status</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnOutline} onPress={() => router.replace("/(driver)/home")}>
        <Text style={styles.btnOutlineText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 },
  icon: { fontSize: 64, color: colors.success },
  title: { fontSize: 22, fontWeight: "700", marginTop: 16, textAlign: "center" },
  box: { backgroundColor: "#EFF6FF", borderRadius: 16, padding: 24, width: "100%", marginTop: 24, alignItems: "center" },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  tracking: { fontSize: 24, fontWeight: "700", color: colors.info, marginTop: 8 },
  status: { color: colors.textMuted, marginTop: 8 },
  btn: { backgroundColor: colors.info, borderRadius: 12, padding: 16, width: "100%", alignItems: "center", marginTop: 24 },
  btnText: { color: "#fff", fontWeight: "700" },
  btnOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, width: "100%", alignItems: "center", marginTop: 12 },
  btnOutlineText: { fontWeight: "600" },
});
