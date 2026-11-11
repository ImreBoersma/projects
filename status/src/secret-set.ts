// Spec 015 US3, contracts/commands.md: `bun run secret-set <NAME>`. Sets one secret value in each
// repo that the catalog list of spec 013 gives for the name. The value is read with the echo off
// and goes only to the stdin of `gh secret set`; it is never in an argument, a file or a log.
import { parseCatalog, parseSecrets } from "./catalog";
import type { SecretEntry } from "./types";

export function reposFor(name: string, entries: SecretEntry[]): string[] {
  const same = entries.filter((e) => e.name === name);
  if (same.some((e) => e.kind === "environment-secret")) {
    throw new Error(`${name}: environment secrets are not supported. Set them by hand.`);
  }
  const repos = same.filter((e) => e.kind === "actions-secret").map((e) => e.where);
  if (!repos.length) throw new Error(`${name} is not in the catalog as an actions-secret.`);
  return repos;
}

// `run` gets the arguments and the stdin text; it returns the exit code and the error text of gh.
export type Runner = (args: string[], stdin: string) => Promise<{ code: number; stderr: string }>;
export type SetResult = { repo: string; ok: boolean; error: string };

export async function setAll(name: string, repos: string[], value: string, run: Runner) {
  const results: SetResult[] = [];
  for (const repo of repos) {
    const { code, stderr } = await run(["gh", "secret", "set", name, "-R", repo], value);
    // The gh text does not contain the value; replace it anyway, so that it never reaches a log.
    const error = code === 0 ? "" : stderr.split(value).join("***").trim();
    results.push({ repo, ok: code === 0, error });
  }
  return results;
}

// contracts/commands.md: `set`, or `failed: <gh exit text>`.
export const resultLine = (r: SetResult) =>
  `  ${r.repo.padEnd(40)} ${r.ok ? "set" : `failed: ${r.error || "exit code not 0"}`}`;

const ghRunner: Runner = async (args, stdin) => {
  const child = Bun.spawn(args, { stdin: new Blob([stdin]), stdout: "ignore", stderr: "pipe" });
  const code = await child.exited;
  return { code, stderr: await new Response(child.stderr).text() };
};

// Read one line with the echo off. Ctrl+C stops without a change.
async function readHidden(prompt: string): Promise<string> {
  // A value from a pipe or a file could end up in the shell history; only a terminal is allowed.
  if (!process.stdin.isTTY)
    throw new Error("Run this command in a terminal. No secret was changed.");
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let value = "";
  return new Promise((resolve) => {
    const onData = (chunk: Buffer) => {
      for (const ch of chunk.toString("utf8")) {
        if (ch === "\u0003") {
          process.stdin.setRawMode(false);
          process.stdout.write("\nStopped. No secret was changed.\n");
          process.exit(1);
        }
        if (ch === "\r" || ch === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        value = ch === "\u007f" ? value.slice(0, -1) : value + ch;
      }
    };
    process.stdin.on("data", onData);
  });
}

if (import.meta.main) {
  const name = process.argv[2];
  try {
    if (!name) throw new Error("Use: bun run secret-set <NAME>");
    const text = await Bun.file("../projects.yaml").text();
    const repos = reposFor(name, parseSecrets(text, parseCatalog(text)));
    console.log(`${name} goes to:\n${repos.map((r) => `  ${r}`).join("\n")}`);
    const value = await readHidden("Value (not shown): ");
    if (!value) throw new Error("No value. No secret was changed.");
    for (const r of await setAll(name, repos, value, ghRunner)) console.log(resultLine(r));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
