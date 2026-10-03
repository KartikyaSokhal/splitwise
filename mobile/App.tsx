import React from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "./src/constants/theme.ts";
import { BillProvider } from "./src/state/BillContext.tsx";
import { RootNavigator } from "./src/navigation/RootNavigator.tsx";
import { AuthProvider } from "./src/auth/AuthContext.tsx";
import { CloudProvider } from "./src/cloud/CloudContext.tsx";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CloudProvider>
        <BillProvider>
          <SafeAreaView
            style={styles.safeArea}
            edges={["top", "bottom", "left", "right"]}
          >
            <StatusBar style="dark" />
            <View style={styles.container}>
              <RootNavigator />
            </View>
          </SafeAreaView>
        </BillProvider>
        </CloudProvider>
      </AuthProvider>
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
