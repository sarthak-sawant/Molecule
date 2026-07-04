import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: "success" | "error" | "info" | "warning";
}

export default function CustomAlert({
  visible,
  title,
  message,
  onClose,
  type = "info",
}: CustomAlertProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const activeColors = Colors[scheme === "dark" ? "dark" : "light"];

  const getTypeColor = () => {
    switch (type) {
      case "success":
        return "#10B981";
      case "error":
        return "#EF4444";
      case "warning":
        return "#F59E0B";
      default:
        return "#3B82F6";
    }
  };

  const borderColor = getTypeColor();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.overlay}>
        <View
          style={[
            styles.alertBox,
            {
              backgroundColor: activeColors.backgroundElement,
              borderColor,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              { color: theme.text, borderBottomColor: borderColor },
            ]}
          >
            {title}
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {message}
          </Text>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: borderColor }]}
            onPress={onClose}
          >
            <Text style={styles.closeBtnText}>Okay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  alertBox: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 2,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  closeBtn: {
    marginTop: Spacing.two,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
