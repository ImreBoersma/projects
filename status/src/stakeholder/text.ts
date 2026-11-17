// Spec 022 contracts/stakeholder-page.md "Texts". This file is Dutch at taalniveau B1, the rule of
// Principle X for Dutch text for stakeholders (constitution v2.2.0). Keep each sentence short,
// with common words and the active voice. Do not mention cost (Principle VII).
const ZONE = "Europe/Amsterdam";

export function untilText(days: number): string {
  if (days === 0) return "vandaag";
  if (days < 45) return days === 1 ? "over 1 dag" : `over ${days} dagen`;
  const months = Math.floor(days / 30);
  return months === 1 ? "over 1 maand" : `over ${months} maanden`;
}

// A catalog date (YYYY-MM-DD) as "1 februari 2027".
export const datum = (date: string) =>
  new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

// A time as "17 november 2026 om 12:00" (Amsterdam time).
export const tijd = (time: Date) =>
  new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: ZONE,
  }).format(time);

export const percent = (value: number) =>
  `${Number.isInteger(value) ? value : value.toFixed(1).replace(".", ",")} %`;

export const renewalName = (name: string) => (name === "Domain" ? "de domeinnaam" : `'${name}'`);

export const TEXT = {
  nothing: "Er is niets waar het bestuur iets mee moet.",
  attention: "Hier moet het bestuur iets mee:",
  offline: (address: string, since: string) =>
    `De website ${address} is offline sinds ${since}. De beheerder weet het.`,
  online: (address: string) => `De website ${address} is online.`,
  notChecked: (address: string, at: string) =>
    `De controle van de website ${address} is om ${at} niet gelukt.`,
  uptime30: (p: string) => `De afgelopen 30 dagen was de website ${p} van de tijd online.`,
  uptimeSince: (date: string, p: string) => `Sinds ${date} was de website ${p} van de tijd online.`,
  works: "Dit onderdeel werkt.",
  problem: "Er is een probleem. De beheerder weet het.",
  notCheckedPart: "Dit onderdeel is niet gecontroleerd.",
  renewal: (name: string, date: string, until: string) =>
    `De beheerder verlengt ${name} vóór ${date} (${until}).`,
  title: (name: string) => `${name}: status van de projecten`,
  heading: (name: string) => `Projecten van ${name}`,
  stand: (time: string) => `Stand van ${time}.`,
  stale: (time: string) => `Deze informatie is van ${time}. Ze kan verouderd zijn.`,
  more: "Alle technische details staan op de",
  statusPage: "statuspagina",
  thisPage: "Deze pagina:",
};
