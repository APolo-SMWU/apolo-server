import test from "node:test";
import assert from "node:assert/strict";
import { getCorsOrigins } from "./cors";

test("parses multiple configured CORS origins", () => {
  assert.deepEqual(
    getCorsOrigins(
      "http://localhost:5173, https://apolo-git-develop-canofmatos-projects.vercel.app"
    ),
    [
      "http://localhost:5173",
      "https://apolo-git-develop-canofmatos-projects.vercel.app",
    ]
  );
});
