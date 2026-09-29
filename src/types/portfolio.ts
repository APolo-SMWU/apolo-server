export type UserType = "student" | "professor" | "professional";

export type PortfolioStatus = "generating" | "draft" | "published" | "failed";

export interface BusinessCardData {
  name: string;
  headline: string;
  phone: string;
  /** 기관·유선 전화. 기존 명함에는 없을 수 있다. */
  tel?: string | null;
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
  description: string;
}

export interface EducationItem {
  id: string;
  entityId?: string;
  startDate: string | null;
  endDate: string | null | "Present";
  organization: string;
  role?: string | null;
}

export interface EducationBlock {
  id: string;
  type: "education";
  visible: boolean;
  items: EducationItem[];
}

export type ExperienceItemKind = "fulltime" | "contract" | "intern" | "research";

export interface ExperienceItem {
  id: string;
  entityId?: string;
  startDate: string | null;
  endDate: string | null | "Present";
  organization?: string | null;
  role?: string | null;
  description?: string | null;
  kind?: ExperienceItemKind | null;
}

export interface ExperienceBlock {
  id: string;
  type: "experience";
  visible: boolean;
  items: ExperienceItem[];
}

export type ActivityItemKind = "club" | "volunteer" | "program" | "talk";

export interface ActivityItem {
  id: string;
  entityId?: string;
  startDate: string | null;
  endDate: string | null | "Present";
  organization: string;
  role?: string | null;
  description?: string | null;
  kind?: ActivityItemKind | null;
}

export interface ActivitiesBlock {
  id: string;
  type: "activities";
  visible: boolean;
  items: ActivityItem[];
}

export interface AwardItem {
  id: string;
  entityId?: string;
  title: string;
  issuer?: string | null;
  date: string | null;
  description?: string | null;
}

export interface AwardsBlock {
  id: string;
  type: "awards";
  visible: boolean;
  items: AwardItem[];
}

export interface CertificationItem {
  id: string;
  entityId?: string;
  title: string;
  grade?: string | null;
  issuer?: string | null;
  date: string | null;
}

export interface CertificationBlock {
  id: string;
  type: "certification";
  visible: boolean;
  items: CertificationItem[];
}

export type TimelineItem =
  | EducationItem
  | ExperienceItem
  | ActivityItem
  | AwardItem
  | CertificationItem;

export type TimelineBlock =
  | EducationBlock
  | ExperienceBlock
  | ActivitiesBlock
  | AwardsBlock
  | CertificationBlock;

export type WorkItemKind = "project" | "publication" | "opensource";

export interface WorkItem {
  id: string;
  entityId?: string;
  kind: WorkItemKind;
  title: string;
  role?: string | null;
  skills?: string[] | null;
  description?: string | null;
  imageUrl?: string | null;
  /** Internal S3 object key; removed from API responses. */
  imageKey?: string;
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
  items: SkillItem[];
}

export interface SkillItem {
  id?: string;
  entityId?: string | undefined;
  name: string;
}

export interface SkillsBlock {
  id: string;
  type: "skills";
  visible: boolean;
  categories: SkillCategory[];
}

export type ContentBlock =
  | AboutBlock
  | EducationBlock
  | ExperienceBlock
  | ActivitiesBlock
  | AwardsBlock
  | CertificationBlock
  | WorksBlock
  | SkillsBlock;

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
