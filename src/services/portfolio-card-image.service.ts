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

const text = (value: string | null | undefined, x: number, y: number, className: string) =>
  value?.trim()
    ? `<text x="${x}" y="${y}" class="${className}">${escapeXml(value.trim())}</text>`
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

const renderSvg = (card: BusinessCardData, bold: boolean, logoDataUri: string | null) => {
  const colors = bold
    ? { ink: "#111111", muted: "#555555", accent: "#111111" }
    : { ink: "#202124", muted: "#5f6368", accent: "#3157d5" };
  const logo = logoDataUri
    ? `<image href="${logoDataUri}" x="1500" y="115" width="170" height="170" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  const divider = bold ? "<rect x=\"140\" y=\"500\" width=\"1520\" height=\"12\" fill=\"#111111\"/>" : "<rect x=\"140\" y=\"500\" width=\"1520\" height=\"4\" fill=\"#3157d5\"/>";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
  <style>
    .name { font: ${bold ? "700" : "600"} 88px Arial, sans-serif; fill: ${colors.ink}; }
    .headline { font: 400 38px Arial, sans-serif; fill: ${colors.accent}; }
    .label { font: 700 25px Arial, sans-serif; fill: ${colors.muted}; }
    .value { font: 400 30px Arial, sans-serif; fill: ${colors.ink}; }
  </style>
  ${logo}
  ${text(card.name, 150, 220, "name")}
  ${text(card.headline, 155, 285, "headline")}
  ${divider}
  ${text(card.phone, 150, 610, "value")}
  ${text(card.tel, 150, 665, "value")}
  ${text(card.email, 150, 720, "value")}
  ${text(card.organizationAddress, 150, 815, "value")}
  <text x="150" y="580" class="label">CONTACT</text>
  </svg>`;
};

export const generatePortfolioFrontImage = async (portfolio: Portfolio): Promise<Buffer> => {
  const card = portfolio.card as unknown as BusinessCardData;
  const logoDataUri = await fetchLogoDataUri(card.logoUrl);
  const svg = renderSvg(card, portfolio.cardDesignId === "bold", logoDataUri);
  return sharp(Buffer.from(svg)).png().toBuffer();
};

export const portfolioFrontImageDimensions = { width: WIDTH, height: HEIGHT } as const;
