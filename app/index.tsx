import { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Image } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";

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
    }, 1200);
    return () => clearTimeout(timer);
  }, [user, loading]);

  return (
    <View style={styles.container}>
      {/* Decorative gradient circles */}
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />
      <View style={styles.circleTopCenter} />

      <Image
        source={require("@/assets/images/ronohub-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.tagline}>Digital LR for Every Route</Text>

      <View style={styles.dotsRow}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6D28D9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  circleTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(139, 92, 246, 0.45)",
  },
  circleBottomLeft: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(91, 33, 182, 0.6)",
  },
  circleTopCenter: {
    position: "absolute",
    top: 80,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(167, 139, 250, 0.2)",
  },
  logo: { width: 200, height: 52 },
  tagline: { color: "#C4B5FD", marginTop: 14, fontSize: 15, letterSpacing: 0.3 },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    position: "absolute",
    bottom: 80,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    backgroundColor: "rgba(255,255,255,0.8)",
  },
});
