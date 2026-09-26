import { z } from "zod";

const LOOKUP_TIMEOUT_MS = 10_000;
const KEYWORD_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
const HEADQUARTERS_SUFFIX = /^(본사|본점|본교|본원)$/;
const CAMPUS_SUFFIX = /^\S*캠퍼스$/;

const searchResultSchema = z.object({
  documents: z.array(z.object({
    place_name: z.string(),
    road_address_name: z.string(),
    category_name: z.string(),
  })),
});

type Place = z.infer<typeof searchResultSchema>["documents"][number];

const normalizeName = (name: string) => name.trim().replace(/\s+/g, "").toLowerCase();

// "교육,학문 > 학교 > 대학교"는 포함하고 "교육,학문 > 학교부속시설"은 제외한다.
const isSchool = (place: Place) => place.category_name.split(" > ")[1] === "학교";

/** 후보가 하나이거나 모두 같은 주소일 때만 그 주소를 쓴다. 동명 기관이 여러 곳이면 null. */
const singleAddress = (places: Place[]) =>
  new Set(places.map((place) => place.road_address_name)).size === 1
    ? places[0]!.road_address_name
    : null;

/**
 * 키워드 검색 결과에서 기관의 대표 주소를 고른다. 앞 단계에서 정해지면 뒤 단계는 보지 않는다.
 * 1. "{기관명} 본사·본점·본교·본원" — 동명 매장보다 정확하다. (예: "야놀자"는 PC방, "야놀자 본사"가 본사)
 * 2. 이름이 정확히 일치하는 장소
 * 3. "{기관명} ○○캠퍼스"인 학교 — 여러 캠퍼스면 카카오 정확도 1순위(대개 본캠퍼스)
 */
export const selectOrganizationAddress = (
  organizationName: string,
  searchResult: unknown,
): string | null => {
  const { documents } = searchResultSchema.parse(searchResult);
  const name = normalizeName(organizationName);
  if (!name) return null;

  const places = documents
    .map((place) => ({ ...place, road_address_name: place.road_address_name.trim() }))
    .filter((place) => place.road_address_name);
  const withSuffix = (suffix: RegExp) =>
    places.filter((place) => {
      const placeName = place.place_name.trim();
      const lastSpace = placeName.lastIndexOf(" ");
      return (
        lastSpace > 0 &&
        normalizeName(placeName.slice(0, lastSpace)) === name &&
        suffix.test(placeName.slice(lastSpace + 1))
      );
    });

  const exact = places.filter((place) => normalizeName(place.place_name) === name);
  const campuses = withSuffix(CAMPUS_SUFFIX).filter(isSchool);
  return (
    singleAddress(withSuffix(HEADQUARTERS_SUFFIX)) ??
    singleAddress(exact) ??
    campuses[0]?.road_address_name ??
    null
  );
};

/** 실패·키 미설정·모호한 검색 결과는 null로 처리하여 프로필 저장을 계속한다. */
export const lookupOrganizationAddress = async (
  organizationName: string,
): Promise<string | null> => {
  const name = organizationName.trim();
  if (!name) return null;
  const apiKey = process.env.KAKAO_REST_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[address-lookup] KAKAO_REST_API_KEY가 없어 주소 조회를 건너뜁니다.");
    return null;
  }

  try {
    const url = new URL(KEYWORD_SEARCH_URL);
    url.searchParams.set("query", name);
    url.searchParams.set("size", "15");
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`[address-lookup] 장소 검색 실패 (HTTP ${response.status})`);
      return null;
    }
    return selectOrganizationAddress(name, await response.json());
  } catch {
    // 인증 정보나 외부 응답 본문은 로그에 기록하지 않는다.
    console.warn("[address-lookup] 장소 검색 응답 오류 또는 연결 실패");
    return null;
  }
};
