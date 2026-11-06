import { describe, expect, test } from "bun:test";
import { secretStatuses } from "../src/secrets/expiry";
import { tokenExpiry } from "../src/secrets/read";
import type { SecretEntry } from "../src/types";

const fakeFetch = (status: number, headers: Record<string, string> = {}) =>
  (async () => new Response("{}", { status, headers })) as unknown as typeof fetch;

describe("tokenExpiry (US2)", () => {
  test("reads the date part of the header", async () => {
    const f = fakeFetch(200, {
      "GitHub-Authentication-Token-Expiration": "2027-11-06 12:00:00 UTC",
    });
    expect(await tokenExpiry("t", f)).toBe("2027-11-06");
  });

  test("no header: no expiry", async () => {
    expect(await tokenExpiry("t", fakeFetch(200))).toBeNull();
  });

  test("an HTTP or network error: not known", async () => {
    expect(await tokenExpiry("t", fakeFetch(401))).toBe("not-known");
    const broken = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await tokenExpiry("t", broken)).toBe("not-known");
  });

  test("sends the token only in the Authorization header", async () => {
    let seen: RequestInit | undefined;
    let url = "";
    const spy = (async (u: string, init: RequestInit) => {
      url = u;
      seen = init;
      return new Response("{}");
    }) as unknown as typeof fetch;
    await tokenExpiry("secret-value", spy);
    expect(url).toBe("https://api.github.com/rate_limit");
    const headers = (seen as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret-value");
  });
});

describe("secretStatuses with read dates (US2)", () => {
  const now = new Date("2026-11-06T12:00:00Z");
  const entry = (expires: string): SecretEntry => ({
    name: "STATUS_READ_TOKEN_HOB",
    kind: "actions-secret",
    where: "ImreBoersma/projects",
    expires,
    project: null,
  });
  const read = new Map([["STATUS_READ_TOKEN_HOB", "2027-11-06"]]);

  test("a read date without a catalog entry is a shared secret", () => {
    expect(secretStatuses([], read, [], now)).toEqual([
      {
        entry: { ...entry("never") },
        owner: "shared",
        date: "2027-11-06",
        days: 365,
        source: "token",
      },
    ]);
  });

  test("the earlier date wins", () => {
    expect(secretStatuses([entry("2028-01-01")], read, [], now)[0]).toMatchObject({
      date: "2027-11-06",
      source: "both",
    });
    expect(secretStatuses([entry("2027-01-01")], read, [], now)[0]).toMatchObject({
      date: "2027-01-01",
      source: "both",
    });
  });

  test("a catalog entry never with a read date uses the read date", () => {
    expect(secretStatuses([entry("never")], read, [], now)[0]).toMatchObject({
      date: "2027-11-06",
      source: "token",
    });
  });
});
