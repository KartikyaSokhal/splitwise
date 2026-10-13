import React, { useEffect, useState } from "react";
import * as RN from "react-native";

// Safe check for Animated in the current runtime (Node test mock vs real RN)
export const hasNativeAnimated: boolean =
  typeof (RN as any).Animated !== "undefined" &&
  typeof (RN as any).Animated?.Value !== "undefined" &&
  typeof (RN as any).Animated?.timing === "function";

export const SafeAnimated: any = hasNativeAnimated
  ? (RN as any).Animated
  : {
      Value: class {
        _value: number;
        constructor(v: number) {
          this._value = v;
        }
        setValue(v: number) {
          this._value = v;
        }
        interpolate() {
          return this._value;
        }
      },
      timing: () => ({
        start: (cb?: (r: { finished: boolean }) => void) =>
          cb?.({ finished: true }),
        stop: () => {},
      }),
      spring: () => ({
        start: (cb?: (r: { finished: boolean }) => void) =>
          cb?.({ finished: true }),
        stop: () => {},
      }),
      sequence: () => ({
        start: (cb?: (r: { finished: boolean }) => void) =>
          cb?.({ finished: true }),
        stop: () => {},
      }),
      parallel: () => ({
        start: (cb?: (r: { finished: boolean }) => void) =>
          cb?.({ finished: true }),
        stop: () => {},
      }),
      View: (RN as any).View || "View",
      Text: (RN as any).Text || "Text",
    };

export const SafeEasing: any =
  hasNativeAnimated && (RN as any).Easing
    ? (RN as any).Easing
    : {
        out: (fn: any) => fn,
        cubic: (t: number) => t,
        linear: (t: number) => t,
        quad: (t: number) => t,
        bezier: () => (t: number) => t,
      };

export const USE_NATIVE_DRIVER: boolean =
  (RN as any).Platform?.OS !== "web" && hasNativeAnimated;

export const isReduceMotionSupported: boolean =
  typeof (RN as any).AccessibilityInfo !== "undefined" &&
  typeof (RN as any).AccessibilityInfo?.isReduceMotionEnabled === "function";

export async function checkReduceMotion(): Promise<boolean> {
  if (!isReduceMotionSupported) return false;
  try {
    return await (RN as any).AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}

export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (isReduceMotionSupported) {
      checkReduceMotion().then((val) => {
        if (mounted) setReduceMotion(val);
      });
      const sub = (RN as any).AccessibilityInfo?.addEventListener?.(
        "reduceMotionChanged",
        (val: boolean) => {
          if (mounted) setReduceMotion(val);
        },
      );
      return () => {
        mounted = false;
        sub?.remove?.();
      };
    }
  }, []);

  return reduceMotion;
}

export const MOTION = {
  duration: {
    instant: 0,
    quick: 140,
    standard: 200,
    enter: 220,
    exit: 160,
  },
  translation: {
    screen: 18,
    card: 8,
    subtle: 4,
  },
  easing: {
    easeOut: SafeEasing.out
      ? SafeEasing.out(SafeEasing.cubic)
      : (t: number) => t,
  },
};
