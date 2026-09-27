export type UserType = "student" | "professor" | "professional";

export type PortfolioStatus = "generating" | "draft" | "published" | "failed";

export interface BusinessCardData {
  name: string;
  headline: string;
  phone: string;
  email: string;
  organizationAddress: string | null;
  logoUrl?: string | null | undefined;
}

export type ProfileFieldKind =
  | "email"
  | "phone"
  | "tel"
  | "company"
  | "university"
  | "department"
  | "major"
  | "github"
  | "scholar"
  | "blog"
  | "linkedin"
  | "notion";

export interface ProfileField {
  kind: ProfileFieldKind;
  label: string;
  value: string;
}

export interface ProfileData {
  name: string;
  title: string;
  avatarUrl: string | null;
  fields: ProfileField[];
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface AboutBlock {
  id: string;
  type: "about";
  visible: boolean;
  body: string;
}

export type TimelineBlockType =
  | "education"
  | "experience"
  | "activities"
  | "awards"
  | "certification";

export type TimelineItemKind =
  | "fulltime"
  | "intern"
  | "research"
  | "exchange"
  | "volunteer"
  | "club"
  | "program"
  | "talk";

export interface TimelineItem {
  id: string;
  entityId?: string;
  startDate: string;
  endDate?: string;
  organization: string;
  role?: string;
  description?: string;
  kind?: TimelineItemKind;
}

export interface TimelineBlock {
  id: string;
  type: TimelineBlockType;
  visible: boolean;
  items: TimelineItem[];
}

export type WorkItemKind = "project" | "publication" | "opensource";

export interface WorkItem {
  id: string;
  entityId?: string;
  kind: WorkItemKind;
  title: string;
  role?: string;
  skills?: string[];
  description: string;
  imageUrl?: string | null;
  links: ProjectLink[];
}

export interface WorksBlock {
  id: string;
  type: "works";
  visible: boolean;
  items: WorkItem[];
}

export interface SkillCategory {
  id: string;
  category: string;
  items: string[];
}

export interface SkillsBlock {
  id: string;
  type: "skills";
  visible: boolean;
  categories: SkillCategory[];
}

export type ContentBlock = AboutBlock | TimelineBlock | WorksBlock | SkillsBlock;

export interface SourceSnapshot {
  url: string;
  contentHash: string;
  lastFetchedAt: string;
}

export interface PortfolioDocument {
  id: string;
  title: string;
  userType: UserType;
  cardDesignId: string;
  siteDesignId: string;
  card: BusinessCardData;
  profile: ProfileData;
  blocks: ContentBlock[];
  sourceLinks: string[];
  sourceSnapshots: SourceSnapshot[];
  schemaVersion: number;
  status: PortfolioStatus;
  createdAt: string;
  updatedAt: string;
}
