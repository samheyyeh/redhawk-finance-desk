import fs from "node:fs";
import path from "node:path";

export type Row = Record<string, string>;

export function parseCSV(text: string): Row[] {
  const matrix: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  text = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === "\n") { row.push(field); field = ""; if (c === "\n") { matrix.push(row); row = []; } }
    else field += c;
  }
  if (quoted) throw new Error("Unclosed quoted field");
  if (field || row.length) { row.push(field); matrix.push(row); }
  const headers = matrix.shift();
  if (!headers?.length) throw new Error("Missing header row");
  return matrix.filter((r) => r.some((v) => v !== "")).map((r, i) => {
    if (r.length !== headers.length) throw new Error(`Row ${i + 2}: expected ${headers.length} fields, got ${r.length}`);
    return Object.fromEntries(headers.map((h, j) => [h, r[j]]));
  });
}

const dataDir = path.join(process.cwd(), "data");
export const readCSV = (name: string) => parseCSV(fs.readFileSync(path.join(dataDir, name), "utf8"));
export const readDoc = (rel: string) => {
  const p = path.join(dataDir, rel);
  if (!p.startsWith(path.join(dataDir, "documents"))) throw new Error("Bad path");
  return fs.readFileSync(p, "utf8");
};
