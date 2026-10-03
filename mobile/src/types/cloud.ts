/** Cloud identity is deliberately distinct from the ephemeral Quick Split Person. */
export type AccountProfile = { id: string; display_name: string };
export type GroupPerson = {
  id: string;
  group_id: string;
  user_id: string | null;
  display_name: string;
};
export type GroupMember = {
  group_id: string;
  person_id: string;
  role: "admin" | "member";
  active: boolean;
};
export type RecordedSettlement = {
  id: string;
  group_id: string;
  from_person_id: string;
  to_person_id: string;
  amount_minor: number;
  recorded_by: string;
  request_key: string;
  created_at: string;
};
// Never substitute SuggestedTransfer for RecordedSettlement. A server-confirmed RPC
// response is necessary to record history, and still is not proof of a bank payment.
