import { describe, expect, test } from "bun:test";
import { parseCaller } from "../src/conformance/workflows";

const caller = `name: CI
on:
  push: { branches: [main] }
permissions: { contents: read }
jobs:
  ci:
    uses: ImreBoersma/projects/.github/workflows/ci-node.yml@main
    secrets: { build-env: "\${{ secrets.BUILD_ENV }}" }
  deploy:
    needs: ci
    uses: ImreBoersma/projects/.github/workflows/deploy-vercel.yml@main
    with:
      org-id: \${{ vars.VERCEL_ORG_ID }}
    secrets:
      token: \${{ secrets.VERCEL_TOKEN }}
      gh: \${{ secrets.GITHUB_TOKEN }}
      again: \${{ secrets.BUILD_ENV }}
`;

describe("parseCaller", () => {
  test("reads uses, permissions, secrets and vars", () => {
    expect(parseCaller(caller)).toEqual({
      uses: [
        "ImreBoersma/projects/.github/workflows/ci-node.yml@main",
        "ImreBoersma/projects/.github/workflows/deploy-vercel.yml@main",
      ],
      permissions: { contents: "read" },
      secrets: ["BUILD_ENV", "VERCEL_TOKEN"],
      vars: ["VERCEL_ORG_ID"],
    });
  });

  test("tells empty, missing and string permissions apart", () => {
    expect(parseCaller("permissions: {}\njobs: {}").permissions).toBe("empty");
    expect(parseCaller("jobs: {}").permissions).toBe("missing");
    expect(parseCaller("permissions: read-all\njobs: {}").permissions).toBe("read-all");
  });

  test("gives empty results for a file that is not valid YAML", () => {
    expect(parseCaller("jobs: [unclosed")).toEqual({
      uses: [],
      permissions: "missing",
      secrets: [],
      vars: [],
    });
  });
});
