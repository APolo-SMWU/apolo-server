const defaultCorsOrigins = [
  "http://localhost:5173",
  "https://apolo-git-develop-canofmatos-projects.vercel.app",
];

export function getCorsOrigins(corsOrigin = process.env.CORS_ORIGIN) {
  const origins = corsOrigin
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins?.length ? origins : defaultCorsOrigins;
}
