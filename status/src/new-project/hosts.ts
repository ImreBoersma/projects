// Spec 011 data-model.md "Host map": the CI variant of each host and the names it needs. The
// command and the "New project" dialog both use this table.
export type HostKey = "pages" | "vercel" | "firebase" | "ssh" | "none";
export type Visibility = "public" | "private";

export interface Host {
  key: HostKey;
  catalog: string; // the `host` field of the catalog; empty for `none`
  label: string; // the dialog label
  ci: string; // the file in template/
  secrets: string[];
  vars: string[];
  hostSide: string | null; // what the Maintainer makes by hand on the host
}

export const HOSTS: Host[] = [
  {
    key: "pages",
    catalog: "GitHub Pages",
    label: "GitHub Pages",
    ci: "ci/pages.yml",
    secrets: [],
    vars: [],
    hostSide: null,
  },
  {
    key: "vercel",
    catalog: "Vercel",
    label: "Vercel",
    ci: "ci/vercel.yml",
    secrets: ["VERCEL_TOKEN"],
    vars: ["VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
    hostSide: "the Vercel project",
  },
  {
    key: "firebase",
    catalog: "Firebase",
    label: "Firebase",
    ci: "ci/firebase.yml",
    secrets: ["FIREBASE_SERVICE_ACCOUNT"],
    vars: ["FIREBASE_PROJECT_ID"],
    hostSide: "the Firebase site and firebase.json",
  },
  {
    key: "ssh",
    catalog: "Shared hosting",
    label: "Shared hosting (SSH)",
    ci: "ci/ssh.yml",
    secrets: ["SSH_HOST", "SSH_USER", "SSH_PASSWORD"],
    vars: ["SSH_KNOWN_HOSTS", "SSH_TARGET", "SSH_PATTERN"],
    hostSide: "the folder on the server",
  },
  {
    key: "none",
    catalog: "",
    label: "Other (no deploy)",
    ci: "ci/none.yml",
    secrets: [],
    vars: [],
    hostSide: null,
  },
];

export function host(key: string): Host {
  const h = HOSTS.find((x) => x.key === key);
  if (!h) throw new Error(`--host must be ${HOSTS.map((x) => x.key).join(", ")}.`);
  return h;
}

export function secretsFor(key: HostKey, visibility: Visibility) {
  const h = host(key);
  return {
    secrets: [...(visibility === "public" ? ["BOARD_TOKEN"] : []), ...h.secrets],
    vars: [...h.vars],
  };
}
