import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { ScreenHeader } from "../components/ScreenHeader.tsx";
import { StepIndicator } from "../components/StepIndicator.tsx";
import { PersonRow } from "../components/PersonRow.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { ErrorMessage } from "../components/ErrorMessage.tsx";
import { useBill } from "../state/BillContext.tsx";

const QUICK_SUGGESTIONS = ["Priya", "Vikram", "Sneha", "Ananya", "Rohan"];

export const PeopleScreen: React.FC = () => {
  const { people, addPerson, removePerson, navigate, goBack } = useBill();
  const [nameInput, setNameInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const handleAdd = (nameToAdd?: string) => {
    const target = (nameToAdd ?? nameInput).trim();
    if (!target) {
      setInputError("Please enter a name.");
      return;
    }

    // Check duplicate name
    if (people.some((p) => p.name.toLowerCase() === target.toLowerCase())) {
      setInputError("A person with this name is already in the bill.");
      return;
    }

    const success = addPerson(target);
    if (success) {
      if (!nameToAdd) {
        setNameInput("");
      }
      setInputError(null);
    }
  };

  const handleContinue = () => {
    if (people.length >= 2) {
      navigate("SPLIT_METHOD");
    }
  };

  const isContinueDisabled = people.length < 2;

  // Filter suggestions to those not already added
  const availableSuggestions = QUICK_SUGGESTIONS.filter(
    (s) => !people.some((p) => p.name.toLowerCase() === s.toLowerCase()),
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScreenHeader
        title="Who's splitting?"
        subtitle="Add everyone sharing this bill."
        onBack={goBack}
        rightElement={
          <View style={styles.headerRight}>
            <StepIndicator currentStep={2} totalSteps={3} />
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {people.length} {people.length === 1 ? "person" : "people"}
              </Text>
            </View>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* People List */}
        {people.map((person) => (
          <PersonRow
            key={person.id}
            name={person.name}
            isYou={person.isYou}
            subtitle="Equal split"
            onRemove={() => removePerson(person.id)}
            canRemove={true}
          />
        ))}

        {people.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No people added</Text>
            <Text style={styles.emptySubtitle}>
              Add at least 2 people to split this bill.
            </Text>
          </View>
        ) : null}

        {/* Minimum requirement warning */}
        {people.length === 1 ? (
          <ErrorMessage
            message="Add at least 1 more person to split the bill."
            type="warning"
          />
        ) : null}

        {/* Inline Add Person Card */}
        <View style={styles.addCard}>
          <Text style={styles.addCardTitle}>Add person</Text>

          <View style={styles.inputRow}>
            <TextInput
              value={nameInput}
              onChangeText={(text) => {
                setNameInput(text);
                if (inputError) setInputError(null);
              }}
              placeholder="e.g. Priya"
              placeholderTextColor={COLORS.textMuted}
              accessible={true}
              accessibilityLabel="Person name input"
              style={styles.textInput}
              returnKeyType="done"
              onSubmitEditing={() => handleAdd()}
            />
            <Pressable
              onPress={() => handleAdd()}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Add person"
              style={({ pressed }) => [
                styles.addBtn,
                pressed && styles.addBtnPressed,
              ]}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          {inputError ? <ErrorMessage message={inputError} /> : null}

          {/* Quick Suggestion Chips */}
          {availableSuggestions.length > 0 ? (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsLabel}>Suggestions:</Text>
              <View style={styles.chipsRow}>
                {availableSuggestions.slice(0, 3).map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => handleAdd(suggestion)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Add suggestion ${suggestion}`}
                    style={({ pressed }) => [
                      styles.chip,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <View style={styles.chipDot} />
                    <Text style={styles.chipText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          disabled={isContinueDisabled}
          accessibilityLabel="Continue to split method"
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  countBadge: {
    backgroundColor: COLORS.borderSubtle,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  countText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.section,
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  addCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
  },
  addCardTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  addBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  addBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  suggestionsContainer: {
    marginTop: SPACING.md,
  },
  suggestionsLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  chipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primaryDark,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
});
