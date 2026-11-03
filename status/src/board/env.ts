import type { Board } from "./graphql";

export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set the environment value ${name}.`);
  return value;
}

export function field(board: Board, name: string) {
  const f = board.fields.get(name);
  if (!f) throw new Error(`The board has no single-select field "${name}".`);
  return f;
}

export function optionId(board: Board, fieldName: string, optionName: string): string {
  const id = field(board, fieldName).options.find((o) => o.name === optionName)?.id;
  if (!id) throw new Error(`Run the board sync: no ${fieldName} option ${optionName}.`);
  return id;
}
