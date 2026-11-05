import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDay, readHistory, resultLine } from "../src/history/store";

const now = new Date("2026-11-05T15:00:00Z");
const line = (time: string, site = "up", problems: string[] = []) =>
  JSON.stringify({ time, projects: { a: { site, problems } } });

describe("parseDay", () => {
  test("reads valid lines and skips the others", () => {
    const text = [
      line("2026-11-05T13:00:00Z"),
      "{broken",
      "",
      line("2026-11-05T14:00:00Z", "down"),
    ].join("\n");
    const day = parseDay(text, now);
    expect(day.results.map((r) => r.projects.a.site)).toEqual(["up", "down"]);
    expect(day.skipped).toBe(1);
  });

  test("skips a result in the future and a result without a valid time", () => {
    const text = [
      line("2026-11-05T16:00:00Z"),
      JSON.stringify({ projects: {} }),
      line("nonsense"),
    ].join("\n");
    expect(parseDay(text, now)).toEqual({ results: [], skipped: 3 });
  });

  test("skips a line with an unknown site state", () => {
    expect(parseDay(line("2026-11-05T13:00:00Z", "sideways"), now).skipped).toBe(1);
  });
});

describe("resultLine", () => {
  test("writes one line with only the fields of the data model", () => {
    const result = {
      time: "2026-11-05T15:00:00Z",
      projects: { a: { site: "up" as const, problems: ["a/ci-failed"], extra: "x" } },
      note: "not stored",
    };
    expect(resultLine(result)).toBe(
      '{"time":"2026-11-05T15:00:00Z","projects":{"a":{"site":"up","problems":["a/ci-failed"]}}}\n',
    );
  });
});

describe("readHistory", () => {
  test("reads the files of the last days, sorted by time, and gives the first date", async () => {
    const dir = await mkdtemp(join(tmpdir(), "history-"));
    await writeFile(join(dir, "2026-01-01.ndjson"), `${line("2026-01-01T10:00:00Z")}\n`);
    await writeFile(join(dir, "2026-11-04.ndjson"), `${line("2026-11-04T10:00:00Z")}\n`);
    await writeFile(
      join(dir, "2026-11-05.ndjson"),
      `${line("2026-11-05T12:00:00Z")}\n${line("2026-11-05T11:00:00Z")}\n`,
    );
    await writeFile(join(dir, "README.md"), "not a day file");
    const history = await readHistory(dir, now);
    expect(history.results.map((r) => r.time)).toEqual([
      "2026-11-04T10:00:00Z",
      "2026-11-05T11:00:00Z",
      "2026-11-05T12:00:00Z",
    ]);
    expect(history.start).toBe("2026-01-01");
  });

  test("gives no history for a missing folder", async () => {
    expect(await readHistory("/no/such/folder", now)).toEqual({ results: [], start: null });
  });
});
