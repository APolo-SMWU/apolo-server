export interface CvLink {
  label: string;
  href: string;
}

export interface CvContact {
  label: string;
  value: string;
}

export interface CvHeader {
  name: string;
  contacts: CvContact[];
  links: CvLink[];
}

export interface CvEntry {
  title: string;
  /** 제목 오른쪽에 표시. 예: "2024.03 – 2026.01" */
  date?: string | undefined;
  /** 제목 아래 줄의 기관·역할 */
  subtitle?: string | undefined;
  location?: string | undefined;
  link?: CvLink | undefined;
  bullets?: string[] | undefined;
}

export interface CvSection {
  title: string;
  /** entries: 제목·날짜·불릿 형태, bullets: 제목만 한 줄씩 나열 */
  layout: "entries" | "bullets";
  entries: CvEntry[];
}

export interface CvData {
  header: CvHeader;
  sections: CvSection[];
}
