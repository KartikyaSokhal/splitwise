import React, { useEffect, useRef } from "react";
import { BackHandler } from "react-native";
import { useBill } from "../state/BillContext.tsx";
import type { ScreenName } from "../types/index.ts";
import { HomeScreen } from "../screens/HomeScreen.tsx";
import { EnterTotalScreen } from "../screens/EnterTotalScreen.tsx";
import { PeopleScreen } from "../screens/PeopleScreen.tsx";
import { SplitMethodScreen } from "../screens/SplitMethodScreen.tsx";
import { CustomSplitScreen } from "../screens/CustomSplitScreen.tsx";
import { ReviewScreen } from "../screens/ReviewScreen.tsx";
import { SuccessScreen } from "../screens/SuccessScreen.tsx";
import { AccountScreen } from "../screens/AccountScreen.tsx";
import { CloudNavigator } from "./CloudNavigator.tsx";
import {
  ScreenTransition,
  TransitionDirection,
} from "../components/ScreenTransition.tsx";

const SCREEN_ORDER: Record<ScreenName, number> = {
  HOME: 0,
  ENTER_TOTAL: 1,
  PEOPLE: 2,
  SPLIT_METHOD: 3,
  CUSTOM_SPLIT: 4,
  REVIEW: 5,
  SUCCESS: 6,
  ACCOUNT: 10,
  GROUPS: 10,
  HISTORY: 10,
};

export const RootNavigator: React.FC = () => {
  const { currentScreen, screenHistory, canGoBack, goBack } = useBill();

  // Android hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
      // Nested signed-in navigation installs its own last-registered handler.
      if (canGoBack) {
        goBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [canGoBack, goBack]);

  const prevScreenRef = useRef<ScreenName>(currentScreen);
  const prevHistoryLengthRef = useRef<number>(screenHistory.length);

  let direction: TransitionDirection = "forward";
  const isDeepWorkflow =
    currentScreen === "ACCOUNT" ||
    currentScreen === "GROUPS" ||
    currentScreen === "HISTORY" ||
    prevScreenRef.current === "ACCOUNT" ||
    prevScreenRef.current === "GROUPS" ||
    prevScreenRef.current === "HISTORY";

  if (isDeepWorkflow) {
    direction = "vertical";
  } else if (screenHistory.length < prevHistoryLengthRef.current) {
    direction = "backward";
  } else if (screenHistory.length > prevHistoryLengthRef.current) {
    direction = "forward";
  } else {
    const prevOrder = SCREEN_ORDER[prevScreenRef.current] ?? 0;
    const currOrder = SCREEN_ORDER[currentScreen] ?? 0;
    direction = currOrder >= prevOrder ? "forward" : "backward";
  }

  useEffect(() => {
    prevScreenRef.current = currentScreen;
    prevHistoryLengthRef.current = screenHistory.length;
  }, [currentScreen, screenHistory.length]);

  const renderScreen = () => {
    switch (currentScreen) {
      case "GROUPS":
        return <CloudNavigator initial="groups" />;
      case "HISTORY":
        return <CloudNavigator initial="history" />;
      case "ACCOUNT":
        return <AccountScreen />;
      case "HOME":
        return <HomeScreen />;
      case "ENTER_TOTAL":
        return <EnterTotalScreen />;
      case "PEOPLE":
        return <PeopleScreen />;
      case "SPLIT_METHOD":
        return <SplitMethodScreen />;
      case "CUSTOM_SPLIT":
        return <CustomSplitScreen />;
      case "REVIEW":
        return <ReviewScreen />;
      case "SUCCESS":
        return <SuccessScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <ScreenTransition screenKey={currentScreen} direction={direction}>
      {renderScreen()}
    </ScreenTransition>
  );
};

