import { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors } from "@/constants/theme";

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (!user) {
        router.replace("/login");
      } else if (user.role === "driver") {
        router.replace("/(driver)/home");
      } else if (user.role === "company_admin") {
        router.replace("/(admin)/home");
      } else {
        router.replace("/login");
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>RonoHub LR</Text>
      <Text style={styles.tagline}>Digital LR for Every Route</Text>
      <ActivityIndicator color="#fff" style={{ marginTop: 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { color: "#fff", fontSize: 36, fontWeight: "700" },
  tagline: { color: "#C4B5FD", marginTop: 8, fontSize: 16 },
});
