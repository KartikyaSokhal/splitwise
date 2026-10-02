export type Person = {
  id: string;
  name: string;
  isYou?: boolean;
};

export type SplitMethod = "equal" | "custom";

export type ScreenName =
  | "HOME"
  | "ENTER_TOTAL"
  | "PEOPLE"
  | "SPLIT_METHOD"
  | "CUSTOM_SPLIT"
  | "REVIEW"
  | "SUCCESS";

export type PersonShareResult = {
  personId: string;
  name: string;
  shareMinor: number;
  formattedShare: string;
  isYou?: boolean;
};

export type SplitCalculationResult = {
  totalMinor: number;
  formattedTotal: string;
  shares: PersonShareResult[];
  isReconciled: boolean;
  remainingMinor?: number;
};
