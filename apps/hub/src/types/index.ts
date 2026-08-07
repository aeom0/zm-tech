import type { HubMemberRole } from "@zmtech/hub-schema";

export type HubMemberWeb = {
  userId: string;
  role: HubMemberRole;
  displayName: string | null;
};
