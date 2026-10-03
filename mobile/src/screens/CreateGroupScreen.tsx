import React, { useState } from "react";
import { View, Platform } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Crypto from "expo-crypto";
import type { CloudRepository } from "../cloud/repository.ts";
import {
  GROUP_PURPOSES,
  assertGroupSetup,
  formatCalendarDate,
  purposeLabel,
  type GroupSetup,
} from "../cloud/groupSetup.ts";
import { isValidLabel } from "../utils/money.ts";
import { useAction } from "../cloud/hooks.ts";
import {
  PageShell,
  Body,
  Heading,
  Field,
  Choice,
  Notice,
  ui,
} from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";

const initial = (): GroupSetup => ({
  name: "",
  purpose: "general",
  destination: null,
  startDate: null,
  endDate: null,
  people: [],
});
const localDate = (date: Date) =>
  `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const pickerValue = (value: string | null) => {
  if (!value) return new Date();
  const date = new Date(0);
  date.setFullYear(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  );
  date.setHours(12, 0, 0, 0);
  return date;
};

export function CreateGroupScreen({
  repository,
  back,
  done,
}: {
  repository: CloudRepository;
  back: () => void;
  done: (id: string) => void;
}) {
  const [form, setForm] = useState<GroupSetup>(initial);
  const [personText, setPersonText] = useState("");
  const [review, setReview] = useState(false);
  const [datePicker, setDatePicker] = useState<"startDate" | "endDate" | null>(
    null,
  );
  const [submitted, setSubmitted] = useState<GroupSetup | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [key] = useState(Crypto.randomUUID),
    action = useAction();
  const editable = submitted === null && !action.busy;
  let created = "";
  const trip = form.purpose === "trip";
  function selectPurpose(purpose: GroupSetup["purpose"]) {
    if (!editable) return;
    setForm((f) => ({
      ...f,
      purpose,
      ...(purpose === "trip"
        ? {}
        : {
            destination: null,
            startDate: null,
            endDate: null,
          }),
    }));
    setValidation(null);
  }
  function chooseDate(
    field: "startDate" | "endDate",
    event: DateTimePickerEvent,
    date?: Date,
  ) {
    if (event.type === "set" && date && editable)
      setForm((f) => ({ ...f, [field]: localDate(date) }));
    if (Platform.OS !== "ios") setDatePicker(null);
  }
  return (
    <PageShell
      title={review ? "Review your group" : "Create a group"}
      subtitle={
        review
          ? "Check the people and details before saving."
          : "One shared place for your people."
      }
      back={review && submitted === null ? () => setReview(false) : back}
    >
      {!review ? (
        <>
          <Heading>What brings you together?</Heading>
          <Body muted>
            Choose a purpose for the group. Every purpose uses the same
            expenses, balances and history.
          </Body>
          <View style={ui.row}>
            {GROUP_PURPOSES.map((item) => (
              <Choice
                key={item.id}
                title={item.label}
                selected={form.purpose === item.id}
                disabled={!editable}
                onPress={() => selectPurpose(item.id)}
              />
            ))}
          </View>

          <Heading>{trip ? "Trip details" : "Group details"}</Heading>
          <Field
            label={trip ? "Trip name" : "Group name"}
            value={form.name}
            maxLength={100}
            placeholder={trip ? "e.g. Goa weekend" : "e.g. Our people"}
            editable={editable}
            onChangeText={(name) => setForm((f) => ({ ...f, name }))}
          />
          {trip && (
            <>
              <Field
                label="Destination · optional"
                value={form.destination ?? ""}
                maxLength={100}
                placeholder="Where are you going?"
                editable={editable}
                onChangeText={(destination) =>
                  setForm((f) => ({ ...f, destination: destination || null }))
                }
              />
              {(["startDate", "endDate"] as const).map((field) => (
                <View key={field} style={ui.card}>
                  <Body>
                    {field === "startDate" ? "Start date" : "End date"} ·
                    optional
                  </Body>
                  <SecondaryButton
                    title={
                      form[field]
                        ? formatCalendarDate(form[field]!)
                        : "Choose a date"
                    }
                    disabled={!editable}
                    onPress={() => setDatePicker(field)}
                  />
                  {!!form[field] && (
                    <SecondaryButton
                      title={`Clear ${field === "startDate" ? "start" : "end"} date`}
                      disabled={!editable}
                      onPress={() => setForm((f) => ({ ...f, [field]: null }))}
                    />
                  )}
                  {datePicker === field && (
                    <>
                      <DateTimePicker
                        mode="date"
                        value={pickerValue(form[field])}
                        onChange={(event, date) =>
                          chooseDate(field, event, date)
                        }
                      />
                      {Platform.OS === "ios" && (
                        <SecondaryButton
                          title="Done choosing date"
                          onPress={() => setDatePicker(null)}
                        />
                      )}
                    </>
                  )}
                </View>
              ))}
              {form.startDate &&
                form.endDate &&
                form.startDate > form.endDate && (
                  <Notice message="End date must be on or after the start date." />
                )}
            </>
          )}

          <Heading>People</Heading>
          <Body muted>
            You are included as the first admin. Add the other people now; they
            do not need accounts. You can invite them later.
          </Body>
          <Field
            label="Person's name"
            value={personText}
            maxLength={100}
            editable={editable}
            placeholder="Add a name"
            onChangeText={setPersonText}
            onSubmitEditing={() => {
              if (
                editable &&
                isValidLabel(personText) &&
                form.people.length < 199
              ) {
                setForm((f) => ({ ...f, people: [...f.people, personText] }));
                setPersonText("");
              }
            }}
          />
          <SecondaryButton
            title="Add person"
            disabled={
              !editable ||
              !isValidLabel(personText) ||
              form.people.length >= 199
            }
            onPress={() => {
              setForm((f) => ({ ...f, people: [...f.people, personText] }));
              setPersonText("");
            }}
          />
          {form.people.map((name, index) => (
            <View key={index} style={ui.card}>
              <Body>{name}</Body>
              <SecondaryButton
                title={`Remove ${name}`}
                disabled={!editable}
                onPress={() =>
                  setForm((f) => ({
                    ...f,
                    people: f.people.filter((_, i) => i !== index),
                  }))
                }
              />
            </View>
          ))}
          <Body muted>
            Names can repeat. Use distinct labels when people need to tell each
            other apart. You can manage members later.
          </Body>
          <Notice message={validation} />
          <PrimaryButton
            title="Review group"
            disabled={!editable || !isValidLabel(form.name)}
            onPress={() => {
              if (personText.trim()) {
                setValidation(
                  "Add the typed person or clear that field before reviewing.",
                );
                return;
              }
              try {
                assertGroupSetup(form);
                setValidation(null);
                setReview(true);
              } catch {
                setValidation(
                  "Check the group name, people and trip dates before reviewing.",
                );
              }
            }}
          />
        </>
      ) : (
        <>
          <Heading>{form.name}</Heading>
          <Body>{purposeLabel(form.purpose)} · INR</Body>
          {trip && (
            <>
              {form.destination && <Body>Destination: {form.destination}</Body>}
              {(form.startDate || form.endDate) && (
                <Body>
                  Dates:{" "}
                  {form.startDate
                    ? formatCalendarDate(form.startDate)
                    : "Not set"}{" "}
                  –{" "}
                  {form.endDate ? formatCalendarDate(form.endDate) : "Not set"}
                </Body>
              )}
            </>
          )}
          <Heading>People · {form.people.length + 1}</Heading>
          <Body muted>Your account starts as admin.</Body>
          {form.people.map((name, index) => (
            <Body key={index}>{name}</Body>
          ))}
          <Body muted>
            Creating saves the group and all these people together. Expenses,
            splits and repayments use the same group rules for every purpose.
          </Body>
          <Notice message={validation ?? action.error} />
          <PrimaryButton
            title={submitted ? "Retry creating this group" : "Create group"}
            loading={action.busy}
            onPress={() =>
              void action.run(
                async () => {
                  const setup = submitted ?? assertGroupSetup(form);
                  setSubmitted(setup);
                  created = await repository.createConfiguredGroup(setup, key);
                },
                () => done(created),
              )
            }
          />
          {!submitted && (
            <SecondaryButton
              title="Edit group"
              disabled={action.busy}
              onPress={() => setReview(false)}
            />
          )}
          {submitted && (
            <Body muted>
              Keep these details unchanged while this save is unconfirmed.
              Retrying reuses the same request.
            </Body>
          )}
        </>
      )}
    </PageShell>
  );
}
