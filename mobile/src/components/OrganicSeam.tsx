import React from "react";
import { View, StyleSheet, type DimensionValue } from "react-native";
import { COLORS } from "../constants/theme.ts";

/**
 * OrganicSeam
 * 
 * Recreates the liquid-like, bulbous organic silhouette seam from the reference UI.
 * Features undulating rounded lobes of varied heights and floating pill cutouts/nodules
 * that seamlessly transition between two contrasting visual surfaces.
 */
export function OrganicSeam({
  fromColor = COLORS.midnight,
  toColor = COLORS.electricMint,
  height = 54,
  inverted = false,
  hasCutouts = true,
}: {
  fromColor?: string;
  toColor?: string;
  height?: number;
  inverted?: boolean;
  hasCutouts?: boolean;
}) {
  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor: fromColor },
        inverted && styles.inverted,
      ]}
      pointerEvents="none"
    >
      {/* Base colored wave surface */}
      <View style={[styles.liquidBase, { backgroundColor: toColor }]} />

      {/* Undulating organic lobes extending into fromColor */}
      <View style={styles.lobesRow}>
        <View
          style={[
            styles.lobe,
            {
              backgroundColor: toColor,
              width: "22%",
              height: height * 0.95,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            },
          ]}
        />
        <View
          style={[
            styles.lobe,
            {
              backgroundColor: toColor,
              width: "16%",
              height: height * 0.72,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              marginLeft: -8,
            },
          ]}
        />
        <View
          style={[
            styles.lobe,
            {
              backgroundColor: toColor,
              width: "28%",
              height: height * 0.98,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              marginLeft: -10,
            },
          ]}
        />
        <View
          style={[
            styles.lobe,
            {
              backgroundColor: toColor,
              width: "18%",
              height: height * 0.76,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              marginLeft: -8,
            },
          ]}
        />
        <View
          style={[
            styles.lobe,
            {
              backgroundColor: toColor,
              width: "24%",
              height: height * 0.92,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              marginLeft: -6,
            },
          ]}
        />
      </View>

      {/* Signature pill cutouts / capsule voids echoing the reference */}
      {hasCutouts && (
        <View style={styles.cutoutsLayer}>
          <View
            style={[
              styles.floatingPill,
              {
                backgroundColor: fromColor,
                left: "7%",
                top: height * 0.38,
                width: 32,
                height: 14,
              },
            ]}
          />
          <View
            style={[
              styles.floatingPill,
              {
                backgroundColor: fromColor,
                left: "38%",
                top: height * 0.46,
                width: 24,
                height: 12,
              },
            ]}
          />
          <View
            style={[
              styles.floatingPill,
              {
                backgroundColor: fromColor,
                right: "12%",
                top: height * 0.34,
                width: 36,
                height: 15,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  inverted: {
    transform: [{ rotate: "180deg" }],
  },
  liquidBase: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  lobesRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    position: "absolute",
    bottom: 0,
    left: "-2%",
    right: "-2%",
    width: "104%",
  },
  lobe: {
    // Lobes extend upward into fromColor
  },
  cutoutsLayer: {
    ...StyleSheet.absoluteFill,
  },
  floatingPill: {
    position: "absolute",
    borderRadius: 9999,
  },
});
