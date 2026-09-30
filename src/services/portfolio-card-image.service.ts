import type { Portfolio } from "@prisma/client";
import sharp from "sharp";
import { createPrivateObjectUrl } from "./s3.service";
import type { BusinessCardData } from "../types/portfolio";

const WIDTH = 1800;
const HEIGHT = 1000;
const LOGO_KEY_PATTERN = /^portfolios\/\d+\/avatar\/[0-9a-f-]+\.(?:jpg|png|webp)$/;

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const text = (
  value: string | null | undefined,
  x: number,
  y: number,
  className: string,
  attributes = "",
) =>
  value?.trim()
    ? `<text x="${x}" y="${y}" class="${className}" ${attributes}>${escapeXml(value.trim())}</text>`
    : "";

const toLogoUrl = async (logoUrl: string) => {
  if (LOGO_KEY_PATTERN.test(logoUrl)) return createPrivateObjectUrl(logoUrl);
  return logoUrl;
};

const fetchLogoDataUri = async (logoUrl: string | null | undefined): Promise<string | null> => {
  if (!logoUrl) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(await toLogoUrl(logoUrl), { signal: controller.signal });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";", 1)[0] ?? "image/png";
    if (!contentType.startsWith("image/")) return null;
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length === 0) return null;
    return `data:${contentType};base64,${body.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const buildPortfolioFrontSvg = async (portfolio: Portfolio): Promise<string> => {
  const card = portfolio.card as unknown as BusinessCardData;
  const bold = portfolio.cardDesignId === "bold";
  const logoDataUri = await fetchLogoDataUri(card.logoUrl);
  const fontFamily = "'Noto Sans CJK KR', 'Noto Sans KR', Arial, sans-serif";
  const logo = logoDataUri
    ? bold
      ? `<image href="${logoDataUri}" x="320" y="162" width="50" height="50" preserveAspectRatio="xMidYMid meet"/>`
      : `<image href="${logoDataUri}" x="20" y="20" width="70" height="70" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  const arrow = `<path d="M360 31h10v10M370 31l-12 12" fill="none" stroke="#202124" stroke-width="1.2"/>`;
  const border = `<rect x="0.75" y="0.75" width="388.5" height="215.5" rx="12" fill="#ffffff" stroke="#202124" stroke-width="1.5"/>`;
  const divider = `<line x1="20" y1="100" x2="370" y2="100" stroke="#202124" stroke-width="0.75"/>`;
  const label = (value: string, x: number, y: number) => text(value, x, y, "label");
  const value = (content: string | null | undefined, x: number, y: number) => text(content, x, y, "value");
  const professional = portfolio.userType !== "student";

  const defaultHeader = `<g>
    ${text(card.headline, 365, 48, "job", `text-anchor="end"`)}
    ${text(card.name, 365, 78, "name default-name", `text-anchor="end"`)}
  </g>`;
  const boldHeader = `<g>
    ${text(card.headline, 20, 39, "job")}
    ${text(card.name, 20, 84, "name bold-name")}
  </g>`;
  const defaultBody = `<g>
    ${professional ? `${label("Tel.", 20, 119)}${value(card.tel, 84, 119)}` : ""}
    ${label("Mobile.", 20, professional ? 139 : 119)}${value(card.phone, 84, professional ? 139 : 119)}
    ${label("E-mail.", 20, professional ? 159 : 139)}${value(card.email, 84, professional ? 159 : 139)}
    ${value(card.organizationAddress, 20, professional ? 181 : 161)}
  </g>`;
  const boldBody = `<g>
    ${professional ? `${label("Tel.", 20, 121)}${value(card.tel, 20, 135)}` : ""}
    ${label("E-mail.", 140, 121)}${value(card.email, 140, 135)}
    ${label("Mobile.", 20, professional ? 157 : 121)}${value(card.phone, 20, professional ? 171 : 135)}
    ${label("ADDRESS", 140, professional ? 157 : 157)}${value(card.organizationAddress, 140, professional ? 171 : 171)}
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 390 217">
  ${border}
  <style>
    .name { font-family: ${fontFamily}; fill: #202124; }
    .default-name { font-size: 32px; font-weight: 600; }
    .bold-name { font-size: 64px; font-weight: 700; }
    .job, .value, .label { font-family: ${fontFamily}; fill: #202124; }
    .job { font-size: 12px; font-weight: 400; }
    .label { font-size: 12px; font-weight: 700; }
    .value { font-size: 12px; font-weight: 400; }
  </style>
  ${logo}
  ${arrow}
  ${bold ? boldHeader : defaultHeader}
  ${divider}
  ${bold ? boldBody : defaultBody}
  </svg>`;
};

export const generatePortfolioFrontImage = async (portfolio: Portfolio): Promise<Buffer> => {
  const svg = await buildPortfolioFrontSvg(portfolio);
  return sharp(Buffer.from(svg)).png().toBuffer();
};

export const portfolioFrontImageDimensions = { width: WIDTH, height: HEIGHT } as const;
