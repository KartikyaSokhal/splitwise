import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  Person,
  PersonShareResult,
  ScreenName,
  SplitMethod,
} from "../types/index.ts";
import { parseInrToMinor } from "../utils/money.ts";
import {
  calculateEqualSplit,
  CustomSharesInput,
  evaluateCustomSplit,
} from "./splitLogic.ts";
import type { CustomSplitReconciliation } from "../utils/split.ts";

export type BillContextType = {
  currentScreen: ScreenName;
  screenHistory: ScreenName[];
  navigate: (screen: ScreenName) => void;
  goBack: () => void;
  canGoBack: boolean;

  totalInput: string;
  totalMinor: number | null;
  totalError: string | null;
  setTotalInput: (val: string) => void;
  appendKeypad: (char: string) => void;
  backspaceKeypad: () => void;

  people: Person[];
  addPerson: (name: string) => boolean;
  removePerson: (id: string) => void;

  splitMethod: SplitMethod;
  setSplitMethod: (method: SplitMethod) => void;

  customShares: CustomSharesInput;
  setCustomShare: (personId: string, val: string) => void;

  calculatedShares: PersonShareResult[];
  customReconciliation: CustomSplitReconciliation | null;
  customHasInvalidFormat: boolean;
  isCustomReconciled: boolean;

  resetBill: () => void;
  startNewSplit: () => void;
};

const DEFAULT_PEOPLE: Person[] = [
  { id: "p-1", name: "Kartikya", isYou: true },
  { id: "p-2", name: "Rahul" },
  { id: "p-3", name: "Aman" },
];

const BillContext = createContext<BillContextType | null>(null);

export const BillProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [screenHistory, setScreenHistory] = useState<ScreenName[]>(["HOME"]);
  const currentScreen = screenHistory[screenHistory.length - 1] ?? "HOME";

  const [totalInput, setTotalInputState] = useState<string>("1240");
  const [people, setPeople] = useState<Person[]>(DEFAULT_PEOPLE);
  const [splitMethod, setSplitMethodState] = useState<SplitMethod>("equal");
  const [customShares, setCustomShares] = useState<CustomSharesInput>({
    "p-1": "413.34",
    "p-2": "413.33",
    "p-3": "413.33",
  });

  const navigate = useCallback((nextScreen: ScreenName) => {
    setScreenHistory((prev) => [...prev, nextScreen]);
  }, []);

  const goBack = useCallback(() => {
    setScreenHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const canGoBack = screenHistory.length > 1 && currentScreen !== "HOME";

  // Parse totalMinor safely
  const { totalMinor, totalError } = useMemo(() => {
    const trimmed = totalInput.trim();
    if (trimmed === "") {
      return { totalMinor: null, totalError: "Please enter an amount." };
    }
    try {
      const minor = parseInrToMinor(trimmed);
      if (minor <= 0) {
        return { totalMinor: null, totalError: "Amount must be greater than zero." };
      }
      return { totalMinor: minor, totalError: null };
    } catch {
      return {
        totalMinor: null,
        totalError: "Invalid amount. Use standard INR (max 2 decimals).",
      };
    }
  }, [totalInput]);

  const setTotalInput = useCallback((val: string) => {
    setTotalInputState(val);
  }, []);

  const appendKeypad = useCallback((char: string) => {
    setTotalInputState((prev) => {
      if (char === ".") {
        if (prev.includes(".")) return prev;
        if (prev === "") return "0.";
        return prev + ".";
      }
      // If prev is "0" and adding a digit, replace "0"
      if (prev === "0") {
        return char;
      }
      // Check decimal places constraint (max 2 decimals)
      if (prev.includes(".")) {
        const parts = prev.split(".");
        if (parts[1] && parts[1].length >= 2) {
          return prev; // ignore further decimals
        }
      }
      // Prevent exceeding safe integer digits (limit whole part to 9 digits, e.g. 99 crores)
      if (!prev.includes(".") && prev.length >= 9) {
        return prev;
      }
      return prev + char;
    });
  }, []);

  const backspaceKeypad = useCallback(() => {
    setTotalInputState((prev) => (prev.length > 0 ? prev.slice(0, -1) : ""));
  }, []);

  const addPerson = useCallback((name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const newPerson: Person = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
    };
    setPeople((prev) => [...prev, newPerson]);
    return true;
  }, []);

  const removePerson = useCallback((id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setCustomShares((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setSplitMethod = useCallback(
    (method: SplitMethod) => {
      setSplitMethodState(method);
      // If switching to custom, ensure each person has an entry
      if (method === "custom" && totalMinor !== null && people.length > 0) {
        const equalShares = calculateEqualSplit(totalMinor, people);
        setCustomShares((prev) => {
          const next: CustomSharesInput = { ...prev };
          for (const s of equalShares) {
            if (next[s.personId] === undefined) {
              next[s.personId] = s.formattedShare;
            }
          }
          return next;
        });
      }
    },
    [totalMinor, people],
  );

  const setCustomShare = useCallback((personId: string, val: string) => {
    setCustomShares((prev) => ({
      ...prev,
      [personId]: val,
    }));
  }, []);

  // Split calculation results
  const customEvaluation = useMemo(() => {
    if (totalMinor === null || people.length === 0) {
      return {
        reconciliation: null,
        hasInvalidFormat: false,
        shares: [],
      };
    }
    return evaluateCustomSplit(totalMinor, people, customShares);
  }, [totalMinor, people, customShares]);

  const equalShares = useMemo(() => {
    if (totalMinor === null || people.length === 0) return [];
    return calculateEqualSplit(totalMinor, people);
  }, [totalMinor, people]);

  const calculatedShares =
    splitMethod === "equal" ? equalShares : customEvaluation.shares;

  const customReconciliation = customEvaluation.reconciliation;
  const customHasInvalidFormat = customEvaluation.hasInvalidFormat;
  const isCustomReconciled = Boolean(
    customReconciliation &&
      customReconciliation.isReconciled &&
      !customHasInvalidFormat,
  );

  const resetBill = useCallback(() => {
    setTotalInputState("1240");
    setPeople(DEFAULT_PEOPLE);
    setSplitMethodState("equal");
    setCustomShares({
      "p-1": "413.34",
      "p-2": "413.33",
      "p-3": "413.33",
    });
    setScreenHistory(["HOME"]);
  }, []);

  const startNewSplit = useCallback(() => {
    setTotalInputState("");
    setSplitMethodState("equal");
    setCustomShares({});
    setScreenHistory(["HOME", "ENTER_TOTAL"]);
  }, []);

  const value = useMemo(
    () => ({
      currentScreen,
      screenHistory,
      navigate,
      goBack,
      canGoBack,
      totalInput,
      totalMinor,
      totalError,
      setTotalInput,
      appendKeypad,
      backspaceKeypad,
      people,
      addPerson,
      removePerson,
      splitMethod,
      setSplitMethod,
      customShares,
      setCustomShare,
      calculatedShares,
      customReconciliation,
      customHasInvalidFormat,
      isCustomReconciled,
      resetBill,
      startNewSplit,
    }),
    [
      currentScreen,
      screenHistory,
      navigate,
      goBack,
      canGoBack,
      totalInput,
      totalMinor,
      totalError,
      setTotalInput,
      appendKeypad,
      backspaceKeypad,
      people,
      addPerson,
      removePerson,
      splitMethod,
      setSplitMethod,
      customShares,
      setCustomShare,
      calculatedShares,
      customReconciliation,
      customHasInvalidFormat,
      isCustomReconciled,
      resetBill,
      startNewSplit,
    ],
  );

  return <BillContext.Provider value={value}>{children}</BillContext.Provider>;
};

export function useBill(): BillContextType {
  const context = useContext(BillContext);
  if (!context) {
    throw new Error("useBill must be used within a BillProvider");
  }
  return context;
}
