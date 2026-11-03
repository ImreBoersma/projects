// Projects (v2) GraphQL calls for the board (spec 004). No issue titles are requested.
import type { BoardItem, OpenIssue, Option } from "./project";

export async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string,
): Promise<T> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (!response.ok || json.errors || !json.data) {
    const messages = json.errors?.map((e) => e.message).join("; ");
    throw new Error(`GraphQL error (HTTP ${response.status}): ${messages ?? "no data"}`);
  }
  return json.data;
}

export interface Field {
  id: string;
  name: string;
  options: Option[];
}

export interface Board {
  id: string;
  fields: Map<string, Field>;
}

export async function readBoard(url: string, token: string): Promise<Board> {
  const match = url.match(/github\.com\/users\/([^/]+)\/projects\/(\d+)/);
  if (!match) throw new Error(`BOARD_URL is not a user project URL: ${url}`);
  const data = await graphql<{
    user: { projectV2: { id: string; fields: { nodes: (Field | Record<string, never>)[] } } };
  }>(
    `query($login: String!, $number: Int!) {
      user(login: $login) { projectV2(number: $number) { id
        fields(first: 50) { nodes { ... on ProjectV2SingleSelectField {
          id name options { id name color description } } } } } }
    }`,
    { login: match[1], number: Number(match[2]) },
    token,
  );
  const project = data.user.projectV2;
  const fields = new Map<string, Field>();
  for (const f of project.fields.nodes) if ("id" in f) fields.set(f.name, f as Field);
  return { id: project.id, fields };
}

const VALUES = ["project", "stakeholder", "roadmap"]
  .map(
    (alias) =>
      `${alias}: fieldValueByName(name: "${alias[0].toUpperCase()}${alias.slice(1)}") {
        ... on ProjectV2ItemFieldSingleSelectValue { name } }`,
  )
  .join("\n");

type Value = { name?: string } | null;
const name = (v: Value) => v?.name ?? null;

export async function readItems(projectId: string, token: string): Promise<BoardItem[]> {
  const items: BoardItem[] = [];
  let after: string | null = null;
  do {
    const data: {
      node: {
        items: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: {
            id: string;
            content: {
              __typename: string;
              id?: string;
              number?: number;
              state?: string;
              repository?: { nameWithOwner: string; isPrivate: boolean };
              labels?: { nodes: { name: string }[] };
            } | null;
            project: Value;
            stakeholder: Value;
            roadmap: Value;
          }[];
        };
      };
    } = await graphql(
      `query($id: ID!, $after: String) {
        node(id: $id) { ... on ProjectV2 { items(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { id
            content { __typename ... on Issue { id number state
              repository { nameWithOwner isPrivate } labels(first: 20) { nodes { name } } } }
            ${VALUES} } } } }
      }`,
      { id: projectId, after },
      token,
    );
    for (const n of data.node.items.nodes) {
      const c = n.content;
      if (c?.__typename !== "Issue" || !c.id || !c.repository) continue;
      items.push({
        id: n.id,
        contentId: c.id,
        repo: c.repository.nameWithOwner,
        number: c.number ?? 0,
        isPrivate: c.repository.isPrivate,
        open: c.state === "OPEN",
        labels: c.labels?.nodes.map((l) => l.name) ?? [],
        project: name(n.project),
        stakeholder: name(n.stakeholder),
        roadmap: name(n.roadmap),
      });
    }
    after = data.node.items.pageInfo.hasNextPage ? data.node.items.pageInfo.endCursor : null;
  } while (after);
  return items;
}

// `withBody` only for ImreBoersma/projects, to read the marker. No text of other repos is read.
export async function readOpenIssues(
  repo: string,
  token: string,
  options: { withBody?: boolean; label?: string } = {},
): Promise<OpenIssue[]> {
  const [owner, repoName] = repo.split("/");
  const issues: OpenIssue[] = [];
  let after: string | null = null;
  do {
    const data: {
      repository: {
        issues: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: { id: string; number: number; body?: string; author: { login: string } | null }[];
        };
      } | null;
    } = await graphql(
      `query($owner: String!, $name: String!, $after: String, $withBody: Boolean!, $labels: [String!]) {
        repository(owner: $owner, name: $name) {
          issues(states: OPEN, first: 100, after: $after, labels: $labels) {
            pageInfo { hasNextPage endCursor }
            nodes { id number author { login } body @include(if: $withBody) } } }
      }`,
      {
        owner,
        name: repoName,
        after,
        withBody: options.withBody ?? false,
        labels: options.label ? [options.label] : null,
      },
      token,
    );
    if (!data.repository) throw new Error(`No access to ${repo}.`);
    for (const n of data.repository.issues.nodes) {
      issues.push({
        id: n.id,
        repo,
        number: n.number,
        body: n.body ?? null,
        author: n.author?.login ?? null,
      });
    }
    const page = data.repository.issues.pageInfo;
    after = page.hasNextPage ? page.endCursor : null;
  } while (after);
  return issues;
}

// Returns the existing item when the issue is already on the board.
export async function addItem(projectId: string, contentId: string, token: string) {
  const data = await graphql<{ addProjectV2ItemById: { item: { id: string } } }>(
    `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) { item { id } }
    }`,
    { projectId, contentId },
    token,
  );
  return data.addProjectV2ItemById.item.id;
}

export async function readItemValues(itemId: string, token: string) {
  const data = await graphql<{ node: { project: Value; roadmap: Value } }>(
    `query($id: ID!) { node(id: $id) { ... on ProjectV2Item { ${VALUES} } } }`,
    { id: itemId },
    token,
  );
  return { project: name(data.node.project), roadmap: name(data.node.roadmap) };
}

export async function setOption(
  projectId: string,
  itemId: string,
  fieldId: string,
  optionId: string,
  token: string,
) {
  await graphql(
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: { projectId: $projectId, itemId: $itemId,
        fieldId: $fieldId, value: { singleSelectOptionId: $optionId } }) { clientMutationId }
    }`,
    { projectId, itemId, fieldId, optionId },
    token,
  );
}

// Replaces the full option list. Each option with an id keeps its item values (research.md §4).
export async function setOptions(fieldId: string, options: Option[], token: string) {
  await graphql(
    `mutation($fieldId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]) {
      updateProjectV2Field(input: { fieldId: $fieldId, singleSelectOptions: $options }) {
        clientMutationId }
    }`,
    { fieldId, options },
    token,
  );
}
