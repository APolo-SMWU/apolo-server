import { readFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import type { CvData } from "../../types/cv";
import { renderCvHtml } from "./cv-html";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_WEIGHTS = [400, 700];

let fontCss: Promise<string> | undefined;

/** setContent 페이지는 file:// 를 읽을 수 없어 폰트를 data URI로 박는다. */
const loadFontCss = () => {
  fontCss ??= Promise.all(
    FONT_WEIGHTS.map(async (weight) => {
      const data = await readFile(path.join(FONT_DIR, `NotoSerifKR-${weight}.woff2`));
      return `@font-face{font-family:"Noto Serif KR";font-weight:${weight};src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2");}`;
    }),
  ).then((rules) => rules.join(""));
  fontCss.catch(() => {
    fontCss = undefined;
  });
  return fontCss;
};

export const renderCvPdf = async (cv: CvData): Promise<Buffer> => {
  const css = await loadFontCss();
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(renderCvHtml(cv, css), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};
