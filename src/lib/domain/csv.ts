export type CsvRow = Record<string, string>;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows.filter((record) => record.some((value) => value.length > 0));
}

export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function mapCsvRows(
  rows: string[][],
  aliases: Record<string, string[]>,
): { records: CsvRow[]; missing: string[]; headers: string[] } {
  if (rows.length === 0) {
    return { records: [], missing: Object.keys(aliases), headers: [] };
  }
  const [headerRow, ...body] = rows;
  const headers = headerRow.map(normalizeHeader);
  const index: Record<string, number> = {};
  headers.forEach((header, position) => {
    for (const [field, names] of Object.entries(aliases)) {
      if (index[field] === undefined && names.includes(header)) {
        index[field] = position;
      }
    }
  });
  const required = Object.entries(aliases)
    .filter(([, names]) => names.includes("__required__"))
    .map(([field]) => field);
  const missing = Object.keys(aliases).filter(
    (field) => index[field] === undefined && required.includes(field),
  );
  const records = body.map((cells) => {
    const record: CsvRow = {};
    for (const [field, position] of Object.entries(index)) {
      record[field] = cells[position] ?? "";
    }
    return record;
  });
  return { records, missing, headers };
}

export const SUB_CSV_ALIASES: Record<string, string[]> = {
  name: [
    "__required__",
    "name",
    "vendor",
    "vendor_name",
    "subcontractor",
    "sub_name",
    "payee",
    "company",
    "company_name",
  ],
  email: ["email", "vendor_email", "email_address", "e_mail"],
  phone: ["phone", "telephone", "phone_number", "mobile"],
  trade: ["trade", "type", "category", "1099_type", "vendor_type"],
  agentName: ["agent_name", "agent", "insurance_agent", "producer", "producer_name"],
  agentEmail: [
    "agent_email",
    "insurance_agent_email",
    "producer_email",
    "agent_e_mail",
  ],
};

export const PAYMENT_CSV_ALIASES: Record<string, string[]> = {
  name: [
    "__required__",
    "name",
    "vendor",
    "vendor_name",
    "payee",
    "subcontractor",
    "company",
  ],
  amount: [
    "__required__",
    "amount",
    "amount_paid",
    "payment",
    "total",
    "sum_of_amount",
    "paid",
  ],
  date: [
    "__required__",
    "date",
    "paid_on",
    "payment_date",
    "txn_date",
    "check_date",
    "transaction_date",
  ],
  memo: ["memo", "description", "note", "notes", "ref"],
};
