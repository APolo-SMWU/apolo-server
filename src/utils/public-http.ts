import { lookup, type LookupAddress } from "node:dns";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

const MAX_REDIRECTS = 5;
// User-Agent가 없는 요청을 거부하는 사이트가 있어 요청 주체를 밝힌다.
const USER_AGENT = "apolo-server/1.0 (https://github.com/APolo-SMWU/apolo-server)";
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class BlockedUrlError extends Error {
  constructor() {
    super("내부 네트워크 주소로는 요청할 수 없습니다.");
    this.name = "BlockedUrlError";
  }
}

export class ResponseTooLargeError extends Error {
  constructor() {
    super("응답 크기가 제한을 넘었습니다.");
    this.name = "ResponseTooLargeError";
  }
}

// 사설망·루프백·링크 로컬(클라우드 메타데이터)·예약 대역
// BlockList는 ::ffff:127.0.0.1 같은 IPv4-mapped 주소도 IPv4 규칙으로 검사한다.
// ::ffff:0:0/96을 따로 넣으면 모든 IPv4 주소가 막히므로 넣지 않는다.
const blockedRanges = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const) {
  blockedRanges.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedRanges.addSubnet(network, prefix, "ipv6");
}

export const isBlockedAddress = (address: string) => {
  const family = isIP(address);
  if (family === 0) return true;
  return blockedRanges.check(address, family === 4 ? "ipv4" : "ipv6");
};

// 접속 직전에 확인한 IP로만 연결하므로 DNS 응답을 바꿔치기해도 우회할 수 없다.
const publicLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, result) => {
    if (error) return callback(error, "");
    const addresses = result as unknown as LookupAddress[];
    if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
      return callback(new BlockedUrlError(), "");
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0]!.address, addresses[0]!.family);
  });
};

// IP로 적힌 주소는 DNS 조회를 거치지 않으므로 따로 확인한다.
const assertPublicUrl = (url: URL) => {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new BlockedUrlError();
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && isBlockedAddress(host)) throw new BlockedUrlError();
};

const decodedBody = (response: IncomingMessage): Readable => {
  switch (response.headers["content-encoding"]) {
    case "gzip":
    case "x-gzip":
      return response.pipe(createGunzip());
    case "deflate":
      return response.pipe(createInflate());
    case "br":
      return response.pipe(createBrotliDecompress());
    default:
      return response;
  }
};

export interface PublicFetchOptions {
  timeoutMs: number;
  maxBytes: number;
  headers?: Record<string, string>;
}

export interface PublicResponse {
  status: number;
  url: string;
  contentType: string;
  body: Buffer;
}

const requestOnce = (
  url: URL,
  { maxBytes, headers = {} }: PublicFetchOptions,
  deadline: number,
) =>
  new Promise<PublicResponse & { location?: string }>((resolve, reject) => {
    let settled = false;
    const settle = (finish: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      finish();
    };
    const fail = (error: Error) => settle(() => reject(error));

    const client = url.protocol === "https:" ? https : http;
    const request = client.get(
      url,
      {
        headers: { "user-agent": USER_AGENT, "accept-encoding": "identity", ...headers },
        lookup: publicLookup,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const contentType = response.headers["content-type"] ?? "";
        const { location } = response.headers;
        if (REDIRECT_STATUSES.has(status) && location) {
          response.resume();
          settle(() => resolve({ status, url: url.toString(), contentType, body: Buffer.alloc(0), location }));
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        const body = decodedBody(response);
        body.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            fail(new ResponseTooLargeError());
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        body.on("end", () =>
          settle(() => resolve({ status, url: url.toString(), contentType, body: Buffer.concat(chunks) })),
        );
        body.on("error", fail);
        response.on("error", fail);
      },
    );
    request.on("error", fail);
    const timer = setTimeout(() => {
      fail(new Error("요청 시간이 초과되었습니다."));
      request.destroy();
    }, Math.max(0, deadline - Date.now()));
  });

/**
 * 공개 인터넷 주소에만 GET 요청을 보낸다. 리다이렉트도 매번 같은 검사를 거친다.
 * 내부망 주소면 BlockedUrlError, 응답이 maxBytes를 넘으면 ResponseTooLargeError.
 */
export const fetchPublic = async (
  rawUrl: string,
  options: PublicFetchOptions,
): Promise<PublicResponse> => {
  const deadline = Date.now() + options.timeoutMs;
  let url = new URL(rawUrl);
  for (let redirects = 0; ; redirects++) {
    assertPublicUrl(url);
    const { location, ...response } = await requestOnce(url, options, deadline);
    if (!location) return response;
    if (redirects >= MAX_REDIRECTS) throw new Error("리다이렉트가 너무 많습니다.");
    url = new URL(location, url);
  }
};
