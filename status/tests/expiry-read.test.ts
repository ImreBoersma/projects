import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import type tls from "node:tls";
import { isoDate, readCertificate, readRegistryDate } from "../src/expiry/read";

const now = new Date("2026-11-05T10:00:00Z");

// A fake tls.connect: it gives a certificate, an error, or no answer.
function fakeConnect(result: { validTo?: string; error?: boolean; silent?: boolean }) {
  const calls: Record<string, unknown>[] = [];
  const connect = ((options: Record<string, unknown>, onConnect: () => void) => {
    calls.push(options);
    const socket = Object.assign(new EventEmitter(), {
      getPeerCertificate: () => ({ valid_to: result.validTo }),
      destroy: () => {},
    });
    queueMicrotask(() => {
      if (result.error) socket.emit("error", new Error("certificate has expired"));
      else if (!result.silent) onConnect();
    });
    return socket;
  }) as unknown as typeof tls.connect;
  return { connect, calls };
}

describe("readCertificate (US1)", () => {
  test("reads the end date and the days", async () => {
    const { connect, calls } = fakeConnect({ validTo: "Dec 19 05:48:50 2026 GMT" });
    expect(await readCertificate("pretband.nl", now, connect)).toEqual({
      date: "2026-12-19",
      days: 44,
    });
    expect(calls[0]).toMatchObject({
      host: "pretband.nl",
      servername: "pretband.nl",
      rejectUnauthorized: false,
    });
  });

  test("reads an expired certificate as negative days", async () => {
    const { connect } = fakeConnect({ validTo: "Nov  2 23:59:59 2026 GMT" });
    expect(await readCertificate("old.example", now, connect)).toEqual({
      date: "2026-11-02",
      days: -3,
    });
  });

  test("gives not-known for an error or no answer", async () => {
    expect(await readCertificate("x.example", now, fakeConnect({ error: true }).connect)).toBe(
      "not-known",
    );
    expect(await readCertificate("x.example", now, fakeConnect({ silent: true }).connect, 20)).toBe(
      "not-known",
    );
  });

  test("converts valid_to to YYYY-MM-DD", () => {
    expect(isoDate("Jan 25 22:53:04 2027 GMT")).toBe("2027-01-25");
    expect(isoDate("nonsense")).toBeNull();
  });
});

describe("readRegistryDate (US3)", () => {
  const bootstrap = {
    services: [
      [["nl"], ["https://rdap.sidn.nl/"]],
      [["app"], ["https://pubapi.registry.google/rdap/"]],
    ] as [string[], string[]][],
  };
  const fake = (status: number, body?: unknown) =>
    (async () =>
      new Response(body ? JSON.stringify(body) : null, { status })) as unknown as typeof fetch;

  test("reads the expiration event", async () => {
    const body = { events: [{ eventAction: "expiration", eventDate: "2027-05-01T00:00:00Z" }] };
    expect(await readRegistryDate("example.app", bootstrap, fake(200, body))).toBe("2027-05-01");
  });
  test("a .nl domain without the event is not known", async () => {
    expect(
      await readRegistryDate(
        "pretband.nl",
        bootstrap,
        fake(200, { events: [{ eventAction: "registration", eventDate: "2010-01-01" }] }),
      ),
    ).toBe("not-known");
  });
  test("a platform subdomain is not registered", async () => {
    expect(await readRegistryDate("scales-imreboersma.web.app", bootstrap, fake(400))).toBe(
      "not-registered",
    );
  });
  test("no server for the top-level domain is not known", async () => {
    expect(await readRegistryDate("example.xyz", bootstrap, fake(200, {}))).toBe("not-known");
  });
});
