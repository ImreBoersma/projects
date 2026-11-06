import { describe, expect, test } from "bun:test";
import { gaps, usedSecrets } from "../src/secrets/compare";
import type { SecretEntry } from "../src/types";

const entry = (
  name: string,
  where: string,
  kind: SecretEntry["kind"] = "actions-secret",
): SecretEntry => ({
  name,
  kind,
  where,
  expires: "never",
  project: null,
});

describe("gaps (FR-009)", () => {
  const used = [{ owner: "one", repo: "ImreBoersma/one", names: ["A", "B", "GITHUB_TOKEN"] }];

  test("a listed name gives no gap; a name without an entry does", () => {
    expect(gaps(used, [entry("A", "ImreBoersma/one")])).toEqual([
      { owner: "one", repo: "ImreBoersma/one", name: "B" },
    ]);
  });

  test("an environment secret counts; a variable or another repo does not", () => {
    const entries = [
      entry("A", "ImreBoersma/one", "environment-secret"),
      entry("B", "ImreBoersma/one", "actions-variable"),
    ];
    expect(gaps(used, entries).map((g) => g.name)).toEqual(["B"]);
    expect(gaps(used, [entry("A", "ImreBoersma/two"), entry("B", "ImreBoersma/two")])).toHaveLength(
      2,
    );
  });

  test("GITHUB_TOKEN is never a gap, and an unused entry gives no gap", () => {
    expect(
      gaps(
        [{ owner: "one", repo: "ImreBoersma/one", names: ["GITHUB_TOKEN"] }],
        [entry("X", "ImreBoersma/one")],
      ),
    ).toEqual([]);
  });
});

describe("usedSecrets", () => {
  test("leaves out the secrets that a shared workflow gets from the caller", () => {
    const text = `on:
  workflow_call:
    secrets:
      SSH_PASSWORD:
        required: true
      ssh-host:
        required: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: echo "\${{ secrets.SSH_PASSWORD }} \${{ secrets.ssh-host }} \${{ secrets.OWN_SECRET }}"
`;
    expect(usedSecrets(text)).toEqual(["OWN_SECRET"]);
  });

  test("a caller workflow keeps all its names", () => {
    const text = `on: push
jobs:
  deploy:
    uses: ImreBoersma/projects/.github/workflows/deploy-ssh.yml@main
    secrets:
      SSH_PASSWORD: \${{ secrets.SSH_PASSWORD }}
`;
    expect(usedSecrets(text)).toEqual(["SSH_PASSWORD"]);
  });
});
