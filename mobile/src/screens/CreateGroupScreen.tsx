import React, { useState } from "react";
import { View, Text, Platform, StyleSheet, Pressable } from "react-native";
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
  Heading,
  Field,
  Notice,
} from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import { Avatar } from "../components/Avatar.tsx";
import {
  COLORS,
  PURPOSE_CONFIG,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../constants/theme.ts";

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

  const currentPurpose =
    PURPOSE_CONFIG[form.purpose as keyof typeof PURPOSE_CONFIG] ??
    PURPOSE_CONFIG.general;

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
        <View style={styles.formContainer}>
          {/* Purpose section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionBadge}>STEP 1</Text>
              <Heading>What brings you together?</Heading>
              <Text style={styles.sectionDescription}>
                Choose a purpose for the group. Every purpose uses the same
                expenses, balances and history.
              </Text>
            </View>

            <View style={styles.purposeGrid}>
              {GROUP_PURPOSES.map((item) => {
                const isSelected = form.purpose === item.id;
                const meta =
                  PURPOSE_CONFIG[item.id as keyof typeof PURPOSE_CONFIG] ??
                  PURPOSE_CONFIG.general;

                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: isSelected, disabled: !editable }}
                    disabled={!editable}
                    onPress={() => selectPurpose(item.id)}
                    style={({ pressed }) => [
                      styles.purposeChip,
                      isSelected && {
                        borderColor: meta.color,
                        backgroundColor: meta.bg,
                      },
                      pressed && editable && styles.purposeChipPressed,
                      !editable && { opacity: 0.5 },
                    ]}
                  >
                    <View
                      style={[
                        styles.purposeIconBadge,
                        {
                          backgroundColor: isSelected
                            ? "transparent"
                            : COLORS.surfaceMuted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.purposeIcon,
                          {
                            color: isSelected
                              ? meta.color
                              : COLORS.electricMint,
                          },
                        ]}
                      >
                        {meta.icon}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.purposeLabel,
                        isSelected
                          ? { color: meta.color, fontWeight: "700" }
                          : { color: COLORS.textPrimary },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Group details section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionBadge}>STEP 2</Text>
              <Heading>{trip ? "Trip details" : "Group details"}</Heading>
            </View>

            <Field
              label={trip ? "Trip name" : "Group name"}
              value={form.name}
              maxLength={100}
              placeholder={trip ? "e.g. Goa weekend" : "e.g. Flat 402"}
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

                <View style={styles.datesContainer}>
                  {(["startDate", "endDate"] as const).map((field) => (
                    <View key={field} style={styles.datePickerCard}>
                      <Text style={styles.dateFieldLabel}>
                        {field === "startDate" ? "Start date" : "End date"} · optional
                      </Text>
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
                </View>

                {form.startDate &&
                  form.endDate &&
                  form.startDate > form.endDate && (
                    <Notice message="End date must be on or after the start date." />
                  )}
              </>
            )}
          </View>

          {/* People roster section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionBadge}>STEP 3</Text>
              <Heading>People</Heading>
              <Text style={styles.sectionDescription}>
                You are included as the first admin. Add the other people now;
                they do not need accounts. You can invite them later.
              </Text>
            </View>

            <View style={styles.addPersonInputRow}>
              <View style={{ flex: 1 }}>
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
              </View>
            </View>

            <Pressable
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Add person"
              disabled={
                !editable ||
                !isValidLabel(personText) ||
                form.people.length >= 199
              }
              onPress={() => {
                setForm((f) => ({ ...f, people: [...f.people, personText] }));
                setPersonText("");
              }}
              style={({ pressed }) => [
                styles.addPersonButton,
                (!editable || !isValidLabel(personText) || form.people.length >= 199) &&
                  styles.addPersonButtonDisabled,
                pressed && styles.addPersonButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.addPersonButtonText,
                  (!editable || !isValidLabel(personText) || form.people.length >= 199) &&
                    styles.addPersonButtonTextDisabled,
                ]}
              >
                Add person
              </Text>
            </Pressable>

            <View style={styles.rosterList}>
              <View style={styles.adminMemberRow}>
                <Avatar name="You" size={38} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>You</Text>
                  <Text style={styles.memberRole}>Group Creator · Admin</Text>
                </View>
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>ADMIN</Text>
                </View>
              </View>

              {form.people.map((name, index) => (
                <View key={index} style={styles.memberRow}>
                  <Avatar name={name} size={38} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{name}</Text>
                    <Text style={styles.memberRole}>Member</Text>
                  </View>
                  <Pressable
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${name}`}
                    disabled={!editable}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        people: f.people.filter((_, i) => i !== index),
                      }))
                    }
                    style={({ pressed }) => [
                      styles.removePersonButton,
                      pressed && styles.removePersonButtonPressed,
                    ]}
                  >
                    <Text style={styles.removePersonIcon}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>

            <Text style={styles.sectionFootnote}>
              Names can repeat. Use distinct labels when people need to tell
              each other apart. You can manage members later.
            </Text>
          </View>

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
        </View>
      ) : (
        /* Review Screen */
        <View style={styles.reviewContainer}>
          <View style={styles.reviewReceiptCard}>
            <View style={styles.reviewHeader}>
              <View
                style={[
                  styles.reviewPurposeBadge,
                  { backgroundColor: currentPurpose.bg },
                ]}
              >
                <Text
                  style={[
                    styles.reviewPurposeIcon,
                    { color: currentPurpose.color },
                  ]}
                >
                  {currentPurpose.icon}
                </Text>
                <Text
                  style={[
                    styles.reviewPurposeText,
                    { color: currentPurpose.color },
                  ]}
                >
                  {purposeLabel(form.purpose)}
                </Text>
              </View>
              <Text style={styles.reviewGroupName}>{form.name}</Text>
              <Text style={styles.reviewCurrencyTag}>Ledger Currency: INR (₹)</Text>
            </View>

            {trip && (
              <View style={styles.tripMetaBox}>
                {form.destination && (
                  <Text style={styles.tripMetaItem}>
                    📍 Destination:{" "}
                    <Text style={{ fontWeight: "700" }}>{form.destination}</Text>
                  </Text>
                )}
                {(form.startDate || form.endDate) && (
                  <Text style={styles.tripMetaItem}>
                    🗓 Dates:{" "}
                    <Text style={{ fontWeight: "600" }}>
                      {form.startDate
                        ? formatCalendarDate(form.startDate)
                        : "Start not set"}{" "}
                      –{" "}
                      {form.endDate
                        ? formatCalendarDate(form.endDate)
                        : "End not set"}
                    </Text>
                  </Text>
                )}
              </View>
            )}

            <View style={styles.receiptDivider} />

            <View style={styles.reviewPeopleSection}>
              <Text style={styles.reviewSectionTitle}>
                People · {form.people.length + 1}
              </Text>
              <Text style={styles.reviewSectionSubtitle}>
                Your account starts as admin.
              </Text>

              <View style={styles.reviewPeopleList}>
                <View style={styles.reviewPersonRow}>
                  <Avatar name="You" size={32} />
                  <Text style={styles.reviewPersonName}>You (Admin)</Text>
                </View>

                {form.people.map((name, index) => (
                  <View key={index} style={styles.reviewPersonRow}>
                    <Avatar name={name} size={32} />
                    <Text style={styles.reviewPersonName}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.receiptPerforation}>
              <View style={styles.perforationHoleLeft} />
              <View style={styles.perforationLine} />
              <View style={styles.perforationHoleRight} />
            </View>

            <Text style={styles.reviewTrustNotice}>
              Creating saves the group and all these people together. Expenses,
              splits and repayments use the same group rules for every purpose.
            </Text>
          </View>

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
            <Text style={styles.submittedWarning}>
              Keep these details unchanged while this save is unconfirmed.
              Retrying reuses the same request.
            </Text>
          )}
        </View>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: SPACING.lg,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.subtle,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  sectionDescription: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  sectionFootnote: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textTertiary,
    fontSize: 13,
    lineHeight: 18,
  },
  purposeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  purposeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 6,
    ...SHADOWS.subtle,
  },
  purposeChipPressed: {
    transform: [{ scale: 0.96 }],
  },
  purposeIconBadge: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  purposeIcon: {
    fontSize: 14,
    fontWeight: "700",
  },
  reviewPurposeIcon: {
    fontSize: 16,
    fontWeight: "700",
  },
  purposeLabel: {
    ...TYPOGRAPHY.secondaryMedium,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  datesContainer: {
    gap: SPACING.md,
  },
  datePickerCard: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  dateFieldLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  addPersonInputRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  addPersonButton: {
    minHeight: 48,
    backgroundColor: COLORS.electricMint,
    borderRadius: RADIUS.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    ...SHADOWS.subtle,
  },
  addPersonButtonDisabled: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.borderSubtle,
    opacity: 0.5,
  },
  addPersonButtonPressed: {
    backgroundColor: COLORS.freshGreen,
    transform: [{ scale: 0.98 }],
  },
  addPersonButtonText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.midnight,
    fontWeight: "800",
    fontSize: 15,
  },
  addPersonButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  removePersonButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: "#EF4444",
    borderWidth: 1,
    borderColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.subtle,
  },
  removePersonButtonPressed: {
    backgroundColor: "#B91C1C",
    borderColor: "#991B1B",
    transform: [{ scale: 0.92 }],
  },
  removePersonIcon: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "900",
    lineHeight: 16,
  },
  rosterList: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  adminMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.deepForest,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    gap: SPACING.md,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  memberRole: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  adminBadge: {
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.electricMint,
    letterSpacing: 0.5,
  },
  reviewContainer: {
    gap: SPACING.lg,
  },
  reviewReceiptCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    padding: SPACING.xl,
    gap: SPACING.md,
    position: "relative",
    ...SHADOWS.card,
  },
  reviewHeader: {
    alignItems: "center",
    gap: SPACING.xs,
  },
  reviewPurposeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  reviewPurposeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  reviewGroupName: {
    ...TYPOGRAPHY.screenTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  reviewCurrencyTag: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  tripMetaBox: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
  },
  tripMetaItem: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textPrimary,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  reviewPeopleSection: {
    gap: SPACING.xs,
  },
  reviewSectionTitle: {
    ...TYPOGRAPHY.section,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  reviewSectionSubtitle: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  reviewPeopleList: {
    gap: SPACING.xs,
  },
  reviewPersonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  reviewPersonName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  receiptPerforation: {
    height: 20,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: -SPACING.xl,
    marginVertical: SPACING.xs,
  },
  perforationHoleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    marginLeft: -10,
  },
  perforationLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  perforationHoleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    marginRight: -10,
  },
  reviewTrustNotice: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textTertiary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  submittedWarning: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});

