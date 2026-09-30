import type { CvData, CvEntry, CvLink, CvSection } from "../../types/cv";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const link = ({ label, href }: CvLink) =>
  /^https?:\/\//i.test(href)
    ? `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`
    : escapeHtml(label);

const bullets = (items?: string[]) =>
  items?.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";

const row = (left: string, right: string, className: string) =>
  left || right ? `<div class="row ${className}"><span>${left}</span><span>${right}</span></div>` : "";

const entry = (item: CvEntry) =>
  `<div class="entry">${row(
    `<b>${escapeHtml(item.title)}</b>`,
    item.link ? link(item.link) : escapeHtml(item.date ?? ""),
    "main",
  )}${item.link && item.date ? row("", escapeHtml(item.date), "sub") : ""}${row(
    escapeHtml(item.subtitle ?? ""),
    escapeHtml(item.location ?? ""),
    "sub",
  )}${bullets(item.bullets)}</div>`;

const section = ({ title, layout, entries }: CvSection) =>
  `<section><h2>${escapeHtml(title)}</h2>${
    layout === "bullets"
      ? bullets(entries.map((item) => item.title))
      : entries.map(entry).join("")
  }</section>`;

const STYLE = `
@page { size: A4; margin: 14mm 16mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #111; font-family: "Noto Serif KR", "Noto Serif CJK KR", "Nanum Myeongjo", "AppleMyungjo", serif; font-size: 10pt; line-height: 1.45; }
header { display: flex; justify-content: space-between; align-items: flex-start; }
h1 { margin: 0; font-size: 26pt; line-height: 1.1; }
.links { margin-top: 2px; }
.links a + a::before { content: " | "; color: #111; }
.contacts { text-align: right; }
a { color: #111; text-decoration: underline; }
section { margin-top: 12px; }
h2 { margin: 0 0 6px; padding-bottom: 1px; border-bottom: 0.7px solid #333; color: #1f3a93; font-size: 12pt; }
.entry { margin: 0 0 9px 14px; break-inside: avoid; }
.row { display: flex; justify-content: space-between; gap: 12px; }
.row.main { font-size: 10.5pt; }
.row.sub { font-size: 9.5pt; }
.row span:last-child { text-align: right; white-space: nowrap; }
ul { margin: 3px 0 0; padding-left: 22px; }
li { margin: 1px 0; }
section > ul { margin-left: 14px; }
`;

export const renderCvHtml = ({ header, sections }: CvData) =>
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(
    header.name,
  )} CV</title><style>${STYLE}</style></head><body><header><div><h1>${escapeHtml(
    header.name,
  )}</h1><div class="links">${header.links.map(link).join("")}</div></div><div class="contacts">${header.contacts
    .map((contact) => `<div>${escapeHtml(contact.label)}: ${escapeHtml(contact.value)}</div>`)
    .join("")}</div></header>${sections.map(section).join("")}</body></html>`;
