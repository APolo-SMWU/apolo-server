import { z } from "zod";

const WIKIDATA_TIMEOUT_MS = 5_000;
// 봇 요청을 막는 홈페이지는 응답 없이 시간을 끌기 때문에 더 짧게 끊는다.
const HOMEPAGE_TIMEOUT_MS = 3_000;
const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";
// Wikimedia 정책상 요청 주체를 식별할 수 있는 User-Agent가 필요하다.
const USER_AGENT = "apolo-server/1.0 (https://github.com/APolo-SMWU/apolo-server)";
const LOGO_WIDTH = 500;
const MIN_ICON_SIZE = 64;

const sparqlResultSchema = z.object({
  results: z.object({
    bindings: z.array(z.object({
      item: z.object({ value: z.string() }),
      logo: z.object({ value: z.string() }).optional(),
      site: z.object({ value: z.string() }).optional(),
    })),
  }),
});

// 검색 상위 3개 항목의 로고(P154)·공식 홈페이지(P856)만 한 번의 쿼리로 가져온다.
const buildQuery = (name: string) => `SELECT ?item ?num ?logo ?site WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch"; wikibase:endpoint "www.wikidata.org";
      mwapi:search ${JSON.stringify(name)}; mwapi:language "ko"; mwapi:limit "3".
    ?item wikibase:apiOutputItem mwapi:item.
    ?num wikibase:apiOrdinal true.
  }
  OPTIONAL { ?item wdt:P154 ?logo }
  OPTIONAL { ?item wdt:P856 ?site }
} ORDER BY ?num`;

const toLogoUrl = (fileUrl: string) => {
  const url = new URL(fileUrl);
  url.protocol = "https:";
  url.searchParams.set("width", String(LOGO_WIDTH));
  return url.toString();
};

/** 검색 순서상 로고나 홈페이지가 있는 첫 항목을 기관으로 보고 그 링크를 고른다. */
export const selectOrganizationLinks = (
  searchResult: unknown,
): { logoUrl: string | null; homepage: string | null } | null => {
  const { bindings } = sparqlResultSchema.parse(searchResult).results;
  const first = bindings.find((row) => row.logo || row.site);
  if (!first) return null;
  const rows = bindings.filter((row) => row.item.value === first.item.value);
  const logo = rows.find((row) => row.logo)?.logo?.value;
  return {
    logoUrl: logo ? toLogoUrl(logo) : null,
    homepage: rows.find((row) => row.site)?.site?.value ?? null,
  };
};

const attributeOf = (tag: string, name: string) =>
  tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];

/** apple-touch-icon → SVG 아이콘 → 가장 큰 icon → /favicon.ico 순으로 아이콘 주소를 고른다. */
export const selectIconUrl = (html: string, pageUrl: string): string => {
  const rank = (tag: string) => {
    const rel = attributeOf(tag, "rel")?.toLowerCase().split(/\s+/) ?? [];
    if (rel.some((value) => value.startsWith("apple-touch-icon"))) return 10_000;
    if (!rel.includes("icon")) return -1;
    if (/svg/i.test(attributeOf(tag, "type") ?? attributeOf(tag, "href") ?? "")) return 5_000;
    const sizes = attributeOf(tag, "sizes")?.split(/\s+/) ?? [];
    return Math.max(0, ...sizes.map((size) => Number.parseInt(size, 10) || 0));
  };
  const best = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .filter((tag) => attributeOf(tag, "href") && rank(tag) >= 0)
    .sort((a, b) => rank(b) - rank(a))[0];
  return new URL(best ? attributeOf(best, "href")! : "/favicon.ico", pageUrl).toString();
};

/** PNG·GIF·ICO·JPEG 헤더에서 크기를 읽는다. 알 수 없는 형식은 null. */
export const imageSizeOf = (bytes: Buffer): { width: number; height: number } | null => {
  if (bytes.length < 24) return null;
  if (bytes.readUInt32BE(0) === 0x89504e47) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.toString("ascii", 0, 3) === "GIF") {
    return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  }
  if (bytes.readUInt32BE(0) === 0x00000100) {
    // ICO는 여러 크기를 담으므로 가장 큰 것을 쓴다. 0은 256px을 뜻한다.
    let size = 0;
    for (let i = 0; i < bytes.readUInt16LE(4) && 6 + 16 * i + 1 < bytes.length; i++) {
      size = Math.max(size, bytes[6 + 16 * i] || 256);
    }
    return size ? { width: size, height: size } : null;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let i = 2; i + 9 < bytes.length; ) {
      if (bytes[i] !== 0xff) return null;
      const marker = bytes[i + 1]!;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: bytes.readUInt16BE(i + 7), height: bytes.readUInt16BE(i + 5) };
      }
      i += 2 + bytes.readUInt16BE(i + 2);
    }
  }
  return null;
};

// 위키데이터 값은 누구나 편집할 수 있으므로 내부망 주소로는 요청하지 않는다.
const isPublicHttpUrl = (value: string) => {
  const url = new URL(value);
  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    !/^(localhost|\d{1,3}(\.\d{1,3}){3}|\[.*\])$/i.test(url.hostname)
  );
};

/** 응답 본문까지 읽은 뒤 타이머를 해제한다. */
const fetchBytes = async (
  url: string,
  timeoutMs: number,
  headers: Record<string, string> = {},
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, ...headers },
      signal: controller.signal,
    });
    return { response, bytes: Buffer.from(await response.arrayBuffer()) };
  } finally {
    clearTimeout(timer);
  }
};

/** 공식 홈페이지 아이콘은 명함에 쓸 만한 크기일 때만 쓴다. */
const findHomepageIcon = async (homepage: string): Promise<string | null> => {
  if (!isPublicHttpUrl(homepage)) return null;
  const page = await fetchBytes(homepage, HOMEPAGE_TIMEOUT_MS);
  if (!page.response.ok) return null;
  const iconUrl = selectIconUrl(page.bytes.toString("latin1"), page.response.url);
  if (!isPublicHttpUrl(iconUrl)) return null;
  const icon = await fetchBytes(iconUrl, HOMEPAGE_TIMEOUT_MS);
  if (!icon.response.ok) return null;
  if (/svg/i.test(icon.response.headers.get("content-type") ?? iconUrl)) return iconUrl;
  const size = imageSizeOf(icon.bytes);
  return size && Math.min(size.width, size.height) >= MIN_ICON_SIZE ? iconUrl : null;
};

/**
 * 소속 기관 로고 URL을 찾는다. 위키데이터 공식 로고 → 공식 홈페이지 아이콘 순.
 * 실패·결과 없음은 null로 처리하여 명함 생성을 계속한다.
 */
export const lookupOrganizationLogo = async (
  organizationName: string,
): Promise<string | null> => {
  const name = organizationName.trim();
  if (!name) return null;

  try {
    const url = new URL(WIKIDATA_SPARQL_URL);
    url.searchParams.set("format", "json");
    url.searchParams.set("query", buildQuery(name));
    const { response, bytes } = await fetchBytes(url.toString(), WIKIDATA_TIMEOUT_MS, {
      Accept: "application/sparql-results+json",
    });
    if (!response.ok) {
      console.warn(`[logo-lookup] 위키데이터 조회 실패 (HTTP ${response.status})`);
      return null;
    }
    const links = selectOrganizationLinks(JSON.parse(bytes.toString("utf8")));
    if (!links) return null;
    return links.logoUrl ?? (links.homepage ? await findHomepageIcon(links.homepage) : null);
  } catch {
    console.warn("[logo-lookup] 로고 조회 응답 오류 또는 연결 실패");
    return null;
  }
};
