import test, { mock } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { randomUUID } from "node:crypto";
import type { GroupSnapshot } from "../cloud/contracts.ts";
import { CloudRepository } from "../cloud/repository.ts";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let repo: CloudRepository | null = null;
const user = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  g = "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
let auth = {
  user: { id: user } as { id: string } | null,
  generation: 1,
  configured: true,
  busy: false,
  message: null,
  signIn: async () => {},
  logout: async () => {},
};
let backHandlers: (() => boolean)[] = [];
mock.module("react-native", {
  exports: {
    Text: "Text",
    View: "View",
    TextInput: "TextInput",
    Pressable: "Pressable",
    TouchableOpacity: "TouchableOpacity",
    ScrollView: "ScrollView",
    KeyboardAvoidingView: "KeyboardAvoidingView",
    ActivityIndicator: "ActivityIndicator",
    StyleSheet: { create: (v: unknown) => v },
    Platform: { OS: "ios" },
    Alert: { alert: () => {} },
    Share: { share: async () => ({ action: "dismissedAction" }) },
    BackHandler: {
      addEventListener: (_event: string, fn: () => boolean) => {
        backHandlers.push(fn);
        return {
          remove: () => {
            backHandlers = backHandlers.filter((f) => f !== fn);
          },
        };
      },
    },
    FlatList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListFooterComponent,
      ListEmptyComponent,
    }: any) => (
      <>
        {ListHeaderComponent}
        {data.length
          ? data.map((item: any, index: number) => (
              <React.Fragment key={item.id ?? item.personId ?? index}>
                {renderItem({ item, index })}
              </React.Fragment>
            ))
          : ListEmptyComponent}
        {ListFooterComponent}
      </>
    ),
  },
});
mock.module("expo-crypto", { exports: { randomUUID } });
mock.module("@react-native-community/datetimepicker", {
  exports: { default: "DateTimePicker" },
});
mock.module("../auth/AuthContext.tsx", { exports: { useAuth: () => auth } });
mock.module("../cloud/CloudContext.tsx", { exports: { useCloud: () => repo } });
const { HomeScreen } = await import("../screens/HomeScreen.tsx");
const { AccountScreen } = await import("../screens/AccountScreen.tsx");
const { CloudNavigator } = await import("../navigation/CloudNavigator.tsx");
const { CreateGroupScreen } = await import("../screens/CreateGroupScreen.tsx");
const { GroupExpenseScreen } = await import(
  "../screens/GroupExpenseScreen.tsx"
);
const { RepaymentScreen } = await import("../screens/RepaymentScreen.tsx");
const { BillProvider, useBill } = await import("../state/BillContext.tsx");
const { useResource, useAction } = await import("../cloud/hooks.ts");
const group: GroupSnapshot = {
  id: g,
  name: "Trip",
  archived: false,
  created_at: "2026-10-03T00:00:00+00:00",
  purpose: "trip",
  destination: "Goa",
  start_date: "2026-10-03",
  end_date: "2026-10-05",
  people: [
    { id: a, name: "Alice", user_id: user, active: true, role: "admin" },
    { id: b, name: "Bob", user_id: null, active: true, role: "member" },
  ],
  balances: [
    { personId: a, balanceMinor: 0 },
    { personId: b, balanceMinor: 0 },
  ],
};
const dto = (snapshot = group) => ({
  ...snapshot,
  balances: snapshot.balances.map((b) => ({
    person_id: b.personId,
    balance_minor: String(b.balanceMinor),
  })),
});
const flush = async () => {
  await new Promise((resolve) => setImmediate(resolve));
};
const button = (root: ReactTestRenderer, label: string) =>
  root.root
    .findAllByType("Pressable" as any)
    .find((n) => n.props.accessibilityLabel === label)!;
const input = (root: ReactTestRenderer, label: string) =>
  root.root
    .findAllByType("TextInput" as any)
    .find((n) => n.props.accessibilityLabel === label)!;
async function mount(element: React.ReactElement) {
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(element);
    await flush();
  });
  return root;
}
const text = (root: ReactTestRenderer) => JSON.stringify(root.toJSON());

test("mounted Home and Account keep guest action explicit and expose no Apple/phone placeholders", async () => {
  auth = { ...auth, user: null };
  repo = null;
  let bill: ReturnType<typeof useBill>;
  function Capture() {
    bill = useBill();
    return null;
  }
  const root = await mount(
    <BillProvider>
      <Capture />
      <HomeScreen />
    </BillProvider>,
  );
  assert.match(text(root), /DueShare/);
  assert(button(root, "Groups"));
  await act(async () =>
    button(root, "Quick Split, no account needed").props.onPress(),
  );
  assert.equal(bill!.currentScreen, "ENTER_TOTAL");
  await act(async () => root.unmount());
  const account = await mount(
    <BillProvider>
      <AccountScreen />
    </BillProvider>,
  );
  assert(button(account, "Continue without an account"));
  assert(button(account, "Continue with Google"));
  assert(!/Apple|phone|OTP|coming next/.test(text(account)));
  await act(async () => account.unmount());
});
test("mounted group navigation creates once, opens persisted group, and hardware Back respects nested history", async () => {
  auth = { ...auth, user: { id: user } };
  let creates = 0;
  let creation: any;
  repo = new CloudRepository(user, async (name, args) => {
    if (name === "split_list_groups" || name === "split_history") return [];
    if (name === "split_create_group_v2") {
      creates++;
      creation = args;
      return g;
    }
    if (name === "split_group_snapshot") return dto();
    throw new Error("Unexpected operation");
  });
  const root = await mount(
    <BillProvider>
      <CloudNavigator initial="groups" />
    </BillProvider>,
  );
  await act(async () => {
    button(root, "Create a group").props.onPress();
    await flush();
  });
  await act(async () => {
    button(root, "Trip").props.onPress();
  });
  await act(async () => {
    input(root, "Trip name").props.onChangeText("Trip");
    input(root, "Destination · optional").props.onChangeText("Goa");
    input(root, "Person's name").props.onChangeText("Bob");
  });
  await act(async () => button(root, "Add person").props.onPress());
  await act(async () => button(root, "Choose a date").props.onPress());
  await act(async () =>
    root.root
      .findByType("DateTimePicker" as any)
      .props.onChange({ type: "set" }, new Date(2026, 9, 3)),
  );
  await act(async () => {
    const choose = root.root
      .findAllByType("Pressable" as any)
      .filter((n) => n.props.accessibilityLabel === "Choose a date");
    choose[0].props.onPress();
  });
  await act(async () =>
    root.root
      .findByType("DateTimePicker" as any)
      .props.onChange({ type: "set" }, new Date(2026, 9, 5)),
  );
  await act(async () => button(root, "Review group").props.onPress());
  await act(async () => {
    const save = button(root, "Create group").props.onPress;
    save();
    save();
    await flush();
  });
  assert.equal(creates, 1);
  assert.deepEqual(creation.p_people, [{ name: "Bob" }]);
  assert.equal(creation.p_purpose, "trip");
  assert.equal(creation.p_destination, "Goa");
  assert.equal(creation.p_start_date, "2026-10-03");
  assert.equal(creation.p_end_date, "2026-10-05");
  assert(button(root, "Add expense"));
  assert.match(text(root), /Goa/);
  await act(async () => {
    backHandlers.at(-1)!();
    await flush();
  });
  assert(button(root, "Create a group"));
  await act(async () => root.unmount());
  repo.dispose();
});
test("non-Trip purposes create real Groups without Trip-only fields", async () => {
  let sent: any;
  const repository = new CloudRepository(user, async (name, args) => {
    assert.equal(name, "split_create_group_v2");
    sent = args;
    return g;
  });
  let created = "";
  const root = await mount(
    <CreateGroupScreen
      repository={repository}
      back={() => {}}
      done={(id) => {
        created = id;
      }}
    />,
  );
  await act(async () => button(root, "Family").props.onPress());
  assert(!text(root).includes("Destination · optional"));
  await act(async () =>
    input(root, "Group name").props.onChangeText("Family bills"),
  );
  await act(async () => button(root, "Review group").props.onPress());
  await act(async () => {
    button(root, "Create group").props.onPress();
    await flush();
  });
  assert.equal(created, g);
  assert.equal(sent.p_purpose, "family");
  assert.equal(sent.p_destination, null);
  assert.equal(sent.p_start_date, null);
  assert.equal(sent.p_end_date, null);
  await act(async () => root.unmount());
  repository.dispose();
});
test("mounted group expense custom commits once, reselect preserves pins, review saves exact values once", async () => {
  const writes: any[] = [];
  let finished = 0;
  const repository = new CloudRepository(user, async (name, args) => {
    if (name === "split_group_snapshot") return dto();
    writes.push(args);
    return randomUUID();
  });
  const root = await mount(
    <GroupExpenseScreen
      repository={repository}
      group={group}
      back={() => {}}
      done={() => {
        finished++;
      }}
    />,
  );
  await act(async () => {
    input(root, "What was it for?").props.onChangeText("Dinner");
    input(root, "Total bill · INR").props.onChangeText("10.01");
  });
  await act(async () => button(root, "Custom").props.onPress());
  await act(async () => {
    const row = input(root, "Amount for Alice");
    row.props.onFocus();
    row.props.onChangeText("7");
    row.props.onSubmitEditing();
    row.props.onBlur();
  });
  assert.equal(input(root, "Amount for Bob").props.value, "3.01");
  await act(async () => button(root, "Custom").props.onPress());
  assert.equal(input(root, "Amount for Alice").props.value, "7");
  await act(async () => button(root, "Review expense").props.onPress());
  await act(async () => {
    const save = button(root, "Save expense").props.onPress;
    save();
    save();
    await flush();
  });
  assert.equal(writes.length, 1);
  assert.equal(finished, 1);
  assert.deepEqual(
    writes[0].p_shares.map((s: any) => s.amountMinor),
    [700, 301],
  );
  assert.equal(writes[0].p_total_minor, 1001);
  await act(async () => root.unmount());
});
test("mounted final Save refuses stale callbacks that alter raw form after review", async () => {
  let writes = 0;
  let release!: (value: unknown) => void;
  const repository = new CloudRepository(user, async (name) => {
    if (name === "split_group_snapshot")
      return new Promise((resolve) => {
        release = resolve;
      });
    writes++;
    return dto();
  });
  const root = await mount(
    <GroupExpenseScreen
      repository={repository}
      group={group}
      back={() => {}}
      done={() => {}}
    />,
  );
  const change = input(root, "Total bill · INR").props.onChangeText;
  await act(async () => {
    input(root, "What was it for?").props.onChangeText("Dinner");
    change("1");
  });
  await act(async () => button(root, "Review expense").props.onPress());
  const save = button(root, "Save expense").props.onPress;
  await act(async () => change("invalid"));
  await act(async () => {
    save();
    await flush();
  });
  assert.equal(writes, 0);
  assert.match(text(root), /Check the names and amounts/);
  // Also adversarially invoke an old input callback WHILE a fresh membership
  // read is pending. Neither the reviewed snapshot nor disabled UI is authority.
  await act(async () => change("1"));
  await act(async () => {
    save();
    await flush();
  });
  assert.equal(button(root, "Edit expense").props.disabled, true);
  await act(async () => change("2"));
  await act(async () => {
    release(dto());
    await flush();
  });
  assert.equal(writes, 0);
  assert.match(text(root), /Check the names and amounts/);
  await act(async () => root.unmount());
});
test("mounted repayment requires explicit confirmation and rechecks changed balances", async () => {
  let writes = 0;
  const repository = new CloudRepository(user, async (name) => {
    if (name === "split_group_snapshot") return dto();
    writes++;
    return randomUUID();
  });
  const root = await mount(
    <RepaymentScreen
      repository={repository}
      group={group}
      transfer={{ fromPersonId: a, toPersonId: b, amountMinor: 100 }}
      back={() => {}}
      done={() => {}}
    />,
  );
  await act(async () => {
    button(root, "Record repayment").props.onPress();
    await flush();
  });
  assert.equal(writes, 0);
  await act(async () =>
    button(root, "I have already repaid this amount").props.onPress(),
  );
  await act(async () => {
    button(root, "Record repayment").props.onPress();
    await flush();
  });
  assert.equal(writes, 0); // Fresh balances are zero, even though the old suggestion says 100.
  await act(async () => root.unmount());
});
test("mounted async resource ignores a late previous load and clears data on permission failure", async () => {
  let resolve!: (value: string) => void, current: any;
  const old = () =>
    new Promise<string>((r) => {
      resolve = r;
    });
  const fresh = async () => "new account";
  const denied = async () => {
    throw { code: "42501" };
  };
  function Capture({ load }: { load: () => Promise<string> }) {
    current = useResource(load);
    return null;
  }
  const root = await mount(<Capture load={old} />);
  await act(async () => {
    root.update(<Capture load={fresh} />);
    await flush();
  });
  await act(async () => {
    resolve("old private data");
    await flush();
  });
  assert.equal(current.data, "new account");
  await act(async () => {
    root.update(<Capture load={denied} />);
    await flush();
  });
  assert.equal(current.data, null);
  assert.match(current.error, /Access changed/);
  await act(async () => root.unmount());
});
test("mounted action suppresses duplicate taps and cannot navigate after unmount", async () => {
  let action!: ReturnType<typeof useAction>,
    release!: () => void,
    writes = 0,
    navigation = 0;
  function Capture() {
    action = useAction();
    return null;
  }
  const root = await mount(<Capture />);
  const work = async () => {
    writes++;
    await new Promise<void>((r) => {
      release = r;
    });
  };
  await act(async () => {
    void action.run(work, () => {
      navigation++;
    });
    void action.run(work, () => {
      navigation++;
    });
  });
  assert.equal(writes, 1);
  await act(async () => root.unmount());
  await act(async () => {
    release();
    await flush();
  });
  assert.equal(navigation, 0);
});
