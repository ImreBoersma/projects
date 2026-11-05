// Read the certificate date and the registry date (spec 009, research.md §1 and §2).
import tls from "node:tls";
import { daysUntil } from "./expiry";

const MONTHS = "JanFebMarAprMayJunJulAugSepOctNovDec";

// `valid_to` is for example "Dec 19 05:48:50 2026 GMT".
export function isoDate(validTo: string): string | null {
  const m = validTo.match(/^(\w{3})\s+(\d{1,2})\s+\S+\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]) / 3 + 1;
  if (month < 1) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

// rejectUnauthorized is false so that an expired certificate can be read (research.md §1).
// The connection only reads the end date and sends no data.
export function readCertificate(
  host: string,
  now: Date,
  connect: typeof tls.connect = tls.connect,
  timeoutMs = 10_000,
): Promise<{ date: string; days: number } | "not-known"> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value: { date: string; days: number } | "not-known") => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(value);
    };
    const socket = connect({ host, port: 443, servername: host, rejectUnauthorized: false }, () => {
      const date = isoDate(socket.getPeerCertificate()?.valid_to ?? "");
      finish(date ? { date, days: daysUntil(date, now) } : "not-known");
    });
    const timer = setTimeout(() => finish("not-known"), timeoutMs);
    socket.on("error", () => finish("not-known"));
  });
}

export type Bootstrap = { services: [string[], string[]][] };
export type RegistryDate = string | "not-known" | "not-registered";

export async function readBootstrap(fetch = globalThis.fetch): Promise<Bootstrap | null> {
  try {
    const res = await fetch("https://data.iana.org/rdap/dns.json", {
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? ((await res.json()) as Bootstrap) : null;
  } catch {
    return null;
  }
}

// Three results: a date, "not-known" (no published date or an error), "not-registered"
// (400 or 404 for the exact name, for example a platform subdomain).
export async function readRegistryDate(
  domain: string,
  bootstrap: Bootstrap | null,
  fetch = globalThis.fetch,
): Promise<RegistryDate> {
  const tld = domain.split(".").pop() ?? "";
  const server = bootstrap?.services.find(([tlds]) => tlds.includes(tld))?.[1][0];
  if (!server) return "not-known";
  try {
    const res = await fetch(`${server.replace(/\/?$/, "/")}domain/${domain}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 400 || res.status === 404) return "not-registered";
    if (!res.ok) return "not-known";
    const events = ((await res.json()).events ?? []) as {
      eventAction: string;
      eventDate: string;
    }[];
    const expiry = events.find((e) => e.eventAction === "expiration")?.eventDate;
    return expiry ? expiry.slice(0, 10) : "not-known";
  } catch {
    return "not-known";
  }
}
