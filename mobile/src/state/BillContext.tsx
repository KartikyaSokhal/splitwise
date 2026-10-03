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
import { formatMinorAsInr, parseInrToMinor } from "../utils/money.ts";
import {
  calculateEqualSplit,
  CustomSharesInput,
  evaluateCustomSplit,
  redistributeCustomShares,
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
  commitCustomShare: (personId: string, explicitVal?: string) => void;
  unpinCustomShare: (personId: string) => void;
  pinnedParticipantIds: Record<string, boolean>;
  resetToEqual: () => void;

  calculatedShares: PersonShareResult[];
  customReconciliation: CustomSplitReconciliation | null;
  customHasInvalidFormat: boolean;
  isCustomReconciled: boolean;

  resetBill: () => void;
  startNewSplit: () => void;
};

const BillContext = createContext<BillContextType | null>(null);

export const BillProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [screenHistory, setScreenHistory] = useState<ScreenName[]>(["HOME"]);
  const currentScreen = screenHistory[screenHistory.length - 1] ?? "HOME";

  const [totalInput, setTotalInputState] = useState<string>("");
  const [people, setPeople] = useState<Person[]>([]);
  const [splitMethod, setSplitMethodState] = useState<SplitMethod>("equal");
  const [customShares, setCustomShares] = useState<CustomSharesInput>({});
  const [pinnedParticipantIds, setPinnedParticipantIds] = useState<
    Record<string, boolean>
  >({});

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
    setPinnedParticipantIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setSplitMethod = useCallback(
    (method: SplitMethod) => {
      setSplitMethodState(method);
      // If switching to custom, ensure each person has an entry and reset pinning
      if (method === "custom" && totalMinor !== null && people.length > 0) {
        setPinnedParticipantIds({});
        const equalShares = calculateEqualSplit(totalMinor, people);
        const next: CustomSharesInput = {};
        for (const s of equalShares) {
          next[s.personId] = s.formattedShare;
        }
        setCustomShares(next);
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

  const commitCustomShare = useCallback(
    (personId: string, explicitVal?: string) => {
      if (totalMinor === null || people.length === 0) return;

      const raw = explicitVal !== undefined ? explicitVal : (customShares[personId] ?? "");
      const trimmed = raw.trim();
      let committedMinor: number;
      try {
        committedMinor = trimmed === "" ? 0 : parseInrToMinor(trimmed);
      } catch {
        // Invalid format - do not pin or redistribute
        return;
      }

      const nextPinned: Record<string, boolean> = {
        ...pinnedParticipantIds,
        [personId]: true,
      };

      const updatedInputs: CustomSharesInput = {
        ...customShares,
        [personId]: formatMinorAsInr(committedMinor),
      };

      const { newInputs } = redistributeCustomShares(
        totalMinor,
        people,
        updatedInputs,
        nextPinned,
      );

      setPinnedParticipantIds(nextPinned);
      setCustomShares(newInputs);
    },
    [totalMinor, people, customShares, pinnedParticipantIds],
  );

  const unpinCustomShare = useCallback(
    (personId: string) => {
      if (totalMinor === null || people.length === 0) return;

      const nextPinned: Record<string, boolean> = { ...pinnedParticipantIds };
      delete nextPinned[personId];

      const { newInputs } = redistributeCustomShares(
        totalMinor,
        people,
        customShares,
        nextPinned,
      );

      setPinnedParticipantIds(nextPinned);
      setCustomShares(newInputs);
    },
    [totalMinor, people, customShares, pinnedParticipantIds],
  );

  const resetToEqual = useCallback(() => {
    if (totalMinor === null || people.length === 0) return;
    setPinnedParticipantIds({});
    const equalShares = calculateEqualSplit(totalMinor, people);
    const next: CustomSharesInput = {};
    for (const s of equalShares) {
      next[s.personId] = s.formattedShare;
    }
    setCustomShares(next);
  }, [totalMinor, people]);

  // Split calculation results
  const customEvaluation = useMemo(() => {
    if (totalMinor === null || people.length === 0) {
      return {
        reconciliation: null,
        hasInvalidFormat: false,
        shares: [],
      };
    }
    return evaluateCustomSplit(
      totalMinor,
      people,
      customShares,
      pinnedParticipantIds,
    );
  }, [totalMinor, people, customShares, pinnedParticipantIds]);

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
    setTotalInputState("");
    setPeople([]);
    setSplitMethodState("equal");
    setCustomShares({});
    setPinnedParticipantIds({});
    setScreenHistory(["HOME"]);
  }, []);

  const startNewSplit = useCallback(() => {
    setTotalInputState("");
    setPeople([]);
    setSplitMethodState("equal");
    setCustomShares({});
    setPinnedParticipantIds({});
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
      commitCustomShare,
      unpinCustomShare,
      pinnedParticipantIds,
      resetToEqual,
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
      commitCustomShare,
      unpinCustomShare,
      pinnedParticipantIds,
      resetToEqual,
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
