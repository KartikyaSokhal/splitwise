export type Payment = {
  payerId: string;
  amountMinor: number;
};

export type Share = {
  personId: string;
  amountMinor: number;
};

export type Expense = {
  id: string;
  groupId: string;
  description: string;
  totalMinor: number;
  currency: "INR";
  payments: Payment[];
  shares: Share[];
};

export type ParticipantBalance = {
  personId: string;
  balanceMinor: number;
};

export type ExpenseValidationIssueCode =
  | "INVALID_TOTAL"
  | "INVALID_PAYMENT_AMOUNT"
  | "INVALID_SHARE_AMOUNT"
  | "PAYMENTS_SUM_MISMATCH"
  | "SHARES_SUM_MISMATCH"
  | "PAYER_NOT_IN_GROUP"
  | "SHARE_PARTICIPANT_NOT_IN_GROUP"
  | "DUPLICATE_PAYER"
  | "DUPLICATE_SHARE_PARTICIPANT"
  | "INVALID_CURRENCY"
  | "EMPTY_ID";

export type ExpenseValidationIssue = {
  code: ExpenseValidationIssueCode;
  message: string;
  participantId?: string;
};

export type ExpenseValidationResult = {
  isValid: boolean;
  errors: string[];
  issues: ExpenseValidationIssue[];
};
