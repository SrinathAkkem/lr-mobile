import { useEffect, useRef } from "react";
import { TextInput, View, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native";
import { colors } from "@/constants/theme";

interface Props {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  autoFocus?: boolean;
}

export function OtpBoxes({ value, onChange, length = 6, autoFocus = true }: Props) {
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => refs.current[0]?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  function handleChange(idx: number, text: string) {
    const cleaned = text.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(length, " ").split("");
    arr[idx] = cleaned || " ";
    const next = arr.join("").trim();
    onChange(next);
    if (cleaned && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  }

  function handleKey(
    idx: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) {
    if (e.nativeEvent.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  }

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => {
        const hasFill = !!value[i];
        return (
          <View key={i} style={[styles.boxWrap, hasFill && styles.boxWrapFilled]}>
            <TextInput
              ref={(r) => {
                refs.current[i] = r;
              }}
              style={[styles.box, hasFill && styles.boxTextFilled]}
              value={value[i] ?? ""}
              onChangeText={(t) => handleChange(i, t)}
              onKeyPress={(e) => handleKey(i, e)}
              keyboardType="number-pad"
              maxLength={1}
              textContentType="oneTimeCode"
              placeholder="—"
              placeholderTextColor="#CBD5E1"
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, justifyContent: "center" },
  boxWrap: {
    width: 50,
    height: 58,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  boxWrapFilled: {
    borderColor: colors.primaryLight,
    backgroundColor: "#FAFAFE",
  },
  box: {
    width: "100%",
    height: "100%",
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  boxTextFilled: {
    color: colors.primary,
  },
});
