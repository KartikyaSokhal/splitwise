import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import {
  SafeAnimated,
  SafeEasing,
  USE_NATIVE_DRIVER,
  useReducedMotion,
  hasNativeAnimated,
} from "../utils/motion.ts";

export type TransitionDirection = "forward" | "backward" | "vertical" | "none";

export type ScreenTransitionProps = {
  screenKey: string;
  direction?: TransitionDirection;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({
  screenKey,
  direction = "forward",
  children,
  style,
}) => {
  const reduceMotion = useReducedMotion();
  const [currentKey, setCurrentKey] = useState(screenKey);
  const [outgoingElement, setOutgoingElement] = useState<React.ReactNode | null>(
    null,
  );
  const [incomingElement, setIncomingElement] =
    useState<React.ReactNode>(children);
  const [activeDirection, setActiveDirection] =
    useState<TransitionDirection>(direction);

  const anim = useRef(new SafeAnimated.Value(1)).current;

  // Whenever children changes for the same screenKey, update incomingElement directly
  useEffect(() => {
    if (screenKey === currentKey) {
      setIncomingElement(children);
    }
  }, [children, screenKey, currentKey]);

  // When screenKey changes, trigger smooth directional transition
  useEffect(() => {
    if (screenKey !== currentKey) {
      if (reduceMotion || !hasNativeAnimated) {
        setCurrentKey(screenKey);
        setIncomingElement(children);
        setOutgoingElement(null);
        return;
      }

      setOutgoingElement(incomingElement);
      setIncomingElement(children);
      setCurrentKey(screenKey);
      setActiveDirection(direction);

      anim.setValue(0);
      SafeAnimated.timing(anim, {
        toValue: 1,
        duration: 210,
        easing: SafeEasing.out(SafeEasing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(({ finished }: { finished: boolean }) => {
        if (finished) {
          setOutgoingElement(null);
        }
      });
    }
  }, [
    screenKey,
    direction,
    children,
    currentKey,
    incomingElement,
    reduceMotion,
    anim,
  ]);

  if (reduceMotion || !hasNativeAnimated || !outgoingElement) {
    return <View style={[styles.container, style]}>{incomingElement}</View>;
  }

  const incomingTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange:
      activeDirection === "forward"
        ? [18, 0]
        : activeDirection === "backward"
          ? [-18, 0]
          : [0, 0],
  });

  const incomingTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: activeDirection === "vertical" ? [14, 0] : [0, 0],
  });

  const incomingOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const outgoingTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange:
      activeDirection === "forward"
        ? [0, -18]
        : activeDirection === "backward"
          ? [0, 18]
          : [0, 0],
  });

  const outgoingTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: activeDirection === "vertical" ? [0, -10] : [0, 0],
  });

  const outgoingOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={[styles.container, style]}>
      {outgoingElement ? (
        <SafeAnimated.View
          pointerEvents="none"
          style={[
            styles.layer,
            StyleSheet.absoluteFill,
            {
              opacity: outgoingOpacity,
              transform: [
                { translateX: outgoingTranslateX },
                { translateY: outgoingTranslateY },
              ],
            },
          ]}
        >
          {outgoingElement}
        </SafeAnimated.View>
      ) : null}

      <SafeAnimated.View
        style={[
          styles.layer,
          {
            opacity: incomingOpacity,
            transform: [
              { translateX: incomingTranslateX },
              { translateY: incomingTranslateY },
            ],
          },
        ]}
      >
        {incomingElement}
      </SafeAnimated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  layer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
