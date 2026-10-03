import { isValidLabel, MoneyValidationError } from "../utils/money.ts";

export const GROUP_PURPOSES = [
  { id: "general", label: "General / Friends" },
  { id: "trip", label: "Trip" },
  { id: "family", label: "Family" },
  { id: "home", label: "Home / Roommates" },
  { id: "car_pool", label: "Car Pool" },
  { id: "couple", label: "Couple" },
  { id: "office", label: "Office / Team" },
  { id: "college", label: "College Friends" },
  { id: "event", label: "Event" },
  { id: "other", label: "Other / Custom" },
] as const;
export type GroupPurpose = (typeof GROUP_PURPOSES)[number]["id"];
export type GroupSetup = {
  name: string;
  purpose: GroupPurpose;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  people: string[];
};
export const isGroupPurpose = (value: unknown): value is GroupPurpose =>
  GROUP_PURPOSES.some((item) => item.id === value);
export const purposeLabel = (value: GroupPurpose) =>
  GROUP_PURPOSES.find((item) => item.id === value)!.label;

/** Display a validated date-only value at local noon to avoid UTC date shifts. */
export function formatCalendarDate(value: string): string {
  if (!isISOCalendarDate(value))
    throw new MoneyValidationError("Invalid group date.");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date.toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

/** Calendar dates have no time zone or implicit timezone conversion. */
export function isISOCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
  );
}
export function assertGroupSetup(value: GroupSetup): GroupSetup {
  if (
    !value ||
    typeof value !== "object" ||
    !isValidLabel(value.name) ||
    !isGroupPurpose(value.purpose)
  )
    throw new MoneyValidationError("Enter a valid group name and purpose.");
  if (
    !Array.isArray(value.people) ||
    value.people.length > 199 ||
    value.people.some((person) => !isValidLabel(person))
  )
    throw new MoneyValidationError("Add up to 199 people with valid names.");
  if (
    value.purpose !== "trip" &&
    (value.destination !== null ||
      value.startDate !== null ||
      value.endDate !== null)
  )
    throw new MoneyValidationError("Trip details are only for Trip groups.");
  if (value.destination !== null && !isValidLabel(value.destination))
    throw new MoneyValidationError("Enter a valid destination.");
  if (value.startDate !== null && !isISOCalendarDate(value.startDate))
    throw new MoneyValidationError("Choose a valid start date.");
  if (value.endDate !== null && !isISOCalendarDate(value.endDate))
    throw new MoneyValidationError("Choose a valid end date.");
  if (value.startDate && value.endDate && value.startDate > value.endDate)
    throw new MoneyValidationError(
      "The end date must be on or after the start date.",
    );
  return { ...value, people: [...value.people] };
}
