import test, { mock } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  BillProvider,
  useBill,
  type BillContextType,
} from "../state/BillContext.tsx";
import { prepareBillShare } from "../state/shareBoundary.ts";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let current: BillContextType;
const Capture = () => {
  current = useBill();
  return null;
};
test("mounted BillProvider: Review/Edit/invalid/Back remains unshareable and no-op Custom preserves pins", async () => {
  let root: ReactTestRenderer;
  await act(async () => {
    root = create(
      <BillProvider>
        <Capture />
      </BillProvider>,
    );
  });
  await act(async () => {
    current.setTotalInput("100");
    current.addPerson("A");
    current.addPerson("B");
  });
  await act(async () => {
    current.setSplitMethod("custom");
  });
  const a = current!.people[0].id;
  await act(async () => {
    current.commitCustomShare(a, "60");
  });
  await act(async () => {
    current.setSplitMethod("custom");
  });
  assert.equal(current!.customShares[a], "60.00");
  assert.equal(current!.pinnedParticipantIds[a], true);
  await act(async () => {
    current.navigate("REVIEW");
  });
  assert.match(prepareBillShare(current!), /₹100.00/);
  await act(async () => {
    current.navigate("CUSTOM_SPLIT");
  });
  await act(async () => {
    current.setCustomShare(a, "150");
  });
  assert.equal(current!.customShares[current!.people[1].id], "40.00"); // no per-key redistribution
  await act(async () => {
    current.commitCustomShare(a, "150");
  });
  await act(async () => {
    current.goBack();
  });
  assert.equal(current!.currentScreen, "REVIEW");
  assert.throws(() => prepareBillShare(current!));
  await act(async () => {
    current.resetBill();
  });
  assert.equal(current!.people.length, 0);
  await act(async () => root!.unmount());
});

let nativeShareCalls = 0;
let nativeShare: () => Promise<{ action: string }> = async () => ({
  action: "dismissedAction",
});
let alerts = 0;
mock.module("react-native", {
  exports: {
    StyleSheet: { create: (x: unknown) => x },
    Text: "Text",
    TextInput: "TextInput",
    TouchableOpacity: "TouchableOpacity",
    View: "View",
    Pressable: "Pressable",
    ScrollView: "ScrollView",
    ActivityIndicator: "ActivityIndicator",
    Alert: {
      alert: () => {
        alerts++;
      },
    },
    Share: {
      share: () => {
        nativeShareCalls++;
        return nativeShare();
      },
    },
  },
});
const { ReviewScreen } = await import("../screens/ReviewScreen.tsx");
test("mounted Review share handler rejects invalid current state, handles dismissal/failure, and prevents duplicate launch", async () => {
  let root: ReactTestRenderer;
  await act(async () => {
    root = create(
      <BillProvider>
        <Capture />
        <ReviewScreen />
      </BillProvider>,
    );
  });
  await act(async () => {
    current.setTotalInput("100");
    current.addPerson("A");
    current.addPerson("B");
  });
  await act(async () => {
    current.setSplitMethod("custom");
    current.navigate("REVIEW");
  });
  const button = () =>
    root!.root
      .findAllByType("Pressable" as never)
      .find((n) => n.props.accessibilityLabel === "Share bill split")!;
  const staleHandler = button().props.onPress;
  await act(async () => {
    current.setCustomShare(current.people[0].id, "101");
  });
  assert.equal(button().props.disabled, true);
  await act(async () => {
    await staleHandler();
  });
  assert.equal(nativeShareCalls, 0);
  assert.equal(alerts, 1);
  await act(async () => {
    current.setCustomShare(current.people[0].id, "50");
  });
  await act(async () => {
    await button().props.onPress();
  });
  assert.equal(current!.currentScreen, "REVIEW");
  nativeShare = async () => {
    throw new Error("native failure");
  };
  await act(async () => {
    await button().props.onPress();
  });
  assert.equal(alerts, 2);
  assert.equal(current!.currentScreen, "REVIEW");
  let finish!: (result: { action: string }) => void;
  nativeShare = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  let pending: Promise<void>;
  const before = nativeShareCalls;
  await act(async () => {
    pending = button().props.onPress();
    void button().props.onPress();
  });
  assert.equal(nativeShareCalls, before + 1);
  await act(async () => {
    finish({ action: "sharedAction" });
    await pending!;
  });
  assert.equal(current!.currentScreen, "SUCCESS");
  await act(async () => root!.unmount());
});
const { CustomAmountRow } = await import("../components/CustomAmountRow.tsx");
test("mounted amount row: unchanged blur is not a pin; Done+blur commits latest input once", async () => {
  const commits: string[] = [];
  let root: ReactTestRenderer;
  await act(async () => {
    root = create(
      <CustomAmountRow
        name="A"
        value="50.00"
        onChangeValue={() => {}}
        onCommitValue={(s) => commits.push(s)}
      />,
    );
  });
  const input = root!.root.findByType("TextInput" as never);
  await act(async () => {
    input.props.onFocus();
    input.props.onBlur();
  });
  assert.deepEqual(commits, []);
  await act(async () => {
    input.props.onFocus();
    input.props.onChangeText("60");
    input.props.onSubmitEditing();
    input.props.onBlur();
  });
  assert.deepEqual(commits, ["60"]);
  await act(async () => root!.unmount());
});
