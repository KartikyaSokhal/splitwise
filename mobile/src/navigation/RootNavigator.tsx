import React, { useEffect } from "react";
import { BackHandler } from "react-native";
import { useBill } from "../state/BillContext.tsx";
import { HomeScreen } from "../screens/HomeScreen.tsx";
import { EnterTotalScreen } from "../screens/EnterTotalScreen.tsx";
import { PeopleScreen } from "../screens/PeopleScreen.tsx";
import { SplitMethodScreen } from "../screens/SplitMethodScreen.tsx";
import { CustomSplitScreen } from "../screens/CustomSplitScreen.tsx";
import { ReviewScreen } from "../screens/ReviewScreen.tsx";
import { SuccessScreen } from "../screens/SuccessScreen.tsx";

export const RootNavigator: React.FC = () => {
  const { currentScreen, canGoBack, goBack } = useBill();

  // Android hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
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

  switch (currentScreen) {
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
