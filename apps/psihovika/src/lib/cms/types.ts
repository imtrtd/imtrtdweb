export type TeamRole = "owner" | "editor" | "viewer";

export type TeamRow = {
  id: string;
  name: string;
  invite_code: string;
  role: TeamRole;
};

export type ContentOverride = {
  id: string;
  team_id: string;
  method_id: string;
  title: string | null;
  lead: string | null;
  source: string | null;
  warn: string | null;
  notes: string | null;
  updated_by: string;
  updated_at: string;
};

export type TeamNote = {
  id: string;
  team_id: string;
  method_id: string | null;
  body: string;
  author_id: string;
  author_name: string | null;
  created_at: string;
};

export type MethodPatch = {
  methodId: string;
  title?: string;
  lead?: string;
  source?: string;
  warn?: string;
  notes?: string;
};
