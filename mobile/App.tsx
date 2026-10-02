import React from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "./src/constants/theme.ts";
import { BillProvider } from "./src/state/BillContext.tsx";
import { RootNavigator } from "./src/navigation/RootNavigator.tsx";

export default function App() {
  return (
    <SafeAreaProvider>
      <BillProvider>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
          <StatusBar style="dark" backgroundColor={COLORS.background} />
          <View style={styles.container}>
            <RootNavigator />
          </View>
        </SafeAreaView>
      </BillProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
