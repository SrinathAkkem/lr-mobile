import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, type ThemeColors } from "@/constants/theme";

const TIMELINE = [
  {
    icon: "checkmark-circle" as const,
    iconColor: "#059669",
    iconBg: "#ECFDF5",
    title: "LR Submitted",
    titleColor: "#059669",
    subtitle: "Done just now",
    active: true,
  },
  {
    icon: "time-outline" as const,
    iconColor: "#D97706",
    iconBg: "#FFFBEB",
    title: "Pending Approval",
    titleColor: "#D97706",
    subtitle: "Company Admin will review your LR",
    active: true,
  },
  {
    icon: "checkmark-circle-outline" as const,
    iconColor: "#9CA3AF",
    iconBg: "#F3F4F6",
    title: "PDF Generated & Ready",
    titleColor: "#6B7280",
    subtitle: "You'll get a notification to download",
    active: false,
  },
];

export default function SubmittedScreen() {
  const colors = useThemeColors();
  const s = createStyles(colors);
  const { tracking, id } = useLocalSearchParams<{
    tracking: string;
    id: string;
  }>();

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Green Header Area ─────────────────────── */}
        <View style={s.headerBg}>
          <View style={s.checkCircle}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </View>
        </View>

        {/* ── Title & Description ───────────────────── */}
        <Text style={s.title}>LR Submitted{"\n"}Successfully!</Text>
        <Text style={s.description}>
          Your LR has been sent to the Company Admin for approval. You will get
          a notification once it is approved.
        </Text>

        {/* ── Tracking ID Card ──────────────────────── */}
        <View style={s.trackingCard}>
          <Text style={s.trackingLabel}>YOUR TRACKING ID</Text>
          <Text style={s.trackingId}>{tracking ?? "—"}</Text>
          <Text style={s.trackingStatus}>Status: Waiting for Approval</Text>
        </View>

        {/* ── What happens next? ────────────────────── */}
        <View style={s.timelineCard}>
          <Text style={s.timelineTitle}>What happens next?</Text>

          {TIMELINE.map((item, i) => (
            <View key={i} style={s.timelineRow}>
              <View style={s.timelineLeft}>
                <View style={[s.timelineIcon, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>
                {i < TIMELINE.length - 1 && <View style={s.timelineLine} />}
              </View>
              <View style={s.timelineContent}>
                <Text style={[s.timelineItemTitle, { color: item.titleColor }]}>
                  {item.title}
                </Text>
                <Text style={s.timelineItemSub}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Bottom Buttons ──────────────────────────── */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => router.replace(`/(driver)/lr/${id}`)}
          activeOpacity={0.85}
        >
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={s.primaryBtnText}>View{"\n"}LR Status</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.outlineBtn}
          onPress={() => router.replace("/(driver)/home")}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-up" size={18} color={colors.text} />
          <Text style={s.outlineBtnText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 120 },

    /* Green header */
    headerBg: {
      backgroundColor: "#059669",
      height: 210,
      alignItems: "center",
      justifyContent: "flex-end",
      paddingBottom: 30,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    checkCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(255,255,255,0.25)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.4)",
    },

    /* Title */
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginTop: 24,
      lineHeight: 34,
    },
    description: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 21,
      marginTop: 12,
      paddingHorizontal: 32,
    },

    /* Tracking card */
    trackingCard: {
      marginHorizontal: 20,
      marginTop: 24,
      backgroundColor: "#EFF6FF",
      borderRadius: 16,
      paddingVertical: 20,
      paddingHorizontal: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#DBEAFE",
    },
    trackingLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: "#6B7280",
      letterSpacing: 1,
    },
    trackingId: {
      fontSize: 24,
      fontWeight: "800",
      color: "#059669",
      marginTop: 8,
    },
    trackingStatus: {
      fontSize: 13,
      color: "#6B7280",
      marginTop: 6,
    },

    /* Timeline card */
    timelineCard: {
      marginHorizontal: 20,
      marginTop: 24,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timelineTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 18,
    },
    timelineRow: {
      flexDirection: "row",
      minHeight: 56,
    },
    timelineLeft: {
      alignItems: "center",
      width: 40,
    },
    timelineIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    timelineContent: {
      flex: 1,
      paddingLeft: 12,
      paddingBottom: 16,
    },
    timelineItemTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    timelineItemSub: {
      fontSize: 12,
      color: "#9CA3AF",
      marginTop: 2,
    },

    /* Bottom bar */
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 36,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: "#059669",
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      shadowColor: "#059669",
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    primaryBtnText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 18,
    },
    outlineBtn: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    outlineBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
  });
}
