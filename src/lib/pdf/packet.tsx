import "server-only";
import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatIsoDate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { COVERAGE_LABEL, type CoverageType } from "@/lib/domain/types";
import type { SubGrade } from "@/lib/domain/types";
import type { UncoveredReport } from "@/lib/domain/uncovered";

export type PacketSub = {
  name: string;
  trade: string;
  grade: SubGrade;
  windows: { type: CoverageType; policyNumber: string | null; effective: string | null; expiry: string | null }[];
};

export type PacketModel = {
  companyName: string;
  generatedOn: string;
  planLabel: string;
  requirementSummary: string;
  subs: PacketSub[];
  report: UncoveredReport;
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a2332" },
  kicker: { fontSize: 8, letterSpacing: 1.2, color: "#8a5a00", textTransform: "uppercase", marginBottom: 6 },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  muted: { color: "#445066", marginBottom: 8, lineHeight: 1.4 },
  section: { marginTop: 14, marginBottom: 6, fontFamily: "Helvetica-Bold", fontSize: 12 },
  row: { borderTopWidth: 1, borderTopColor: "#e4dccb", paddingVertical: 6 },
  name: { fontFamily: "Helvetica-Bold" },
  reason: { color: "#445066", marginTop: 2 },
  total: { marginTop: 8, fontFamily: "Helvetica-Bold", fontSize: 12 },
  foot: { marginTop: 18, fontSize: 8, color: "#667085", lineHeight: 1.4 },
});

function PacketDocument({ data }: { data: PacketModel }) {
  return (
    <Document title={`${data.companyName} audit packet`} author="AuditReady Subs">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.kicker}>AuditReady Subs · Eddy Woods LLC</Text>
        <Text style={styles.h1}>Coverage timeline</Text>
        <Text style={styles.muted}>
          {data.companyName} · prepared {formatIsoDate(data.generatedOn)} · {data.planLabel}
        </Text>
        <Text style={styles.muted}>{data.requirementSummary}</Text>
        <Text style={styles.section}>Subcontractors</Text>
        {data.subs.map((sub) => (
          <View key={sub.name} style={styles.row} wrap={false}>
            <Text style={styles.name}>
              {sub.name} · {sub.grade.label}
              {sub.trade ? ` · ${sub.trade}` : ""}
            </Text>
            {sub.windows.length === 0 ? (
              <Text style={styles.reason}>No confirmed certificate.</Text>
            ) : (
              sub.windows.map((window) => (
                <Text key={`${sub.name}-${window.type}`} style={styles.reason}>
                  {COVERAGE_LABEL[window.type]} {window.policyNumber ? `· ${window.policyNumber}` : ""} ·{" "}
                  {formatIsoDate(window.effective)} – {formatIsoDate(window.expiry)}
                </Text>
              ))
            )}
            {sub.grade.reasons.slice(0, 3).map((reason) => (
              <Text key={reason.text} style={styles.reason}>
                {reason.text}
              </Text>
            ))}
          </View>
        ))}
        <Text style={styles.section}>Uncovered dollars</Text>
        <Text style={styles.muted}>
          Payments on dates with no confirmed workers&apos; comp and general liability in force. The
          workers&apos; comp column is the amount an auditor can add back to payroll.
        </Text>
        {data.report.bySub.map((row) => (
          <Text key={row.key} style={styles.reason}>
            {row.name}: paid {formatMoney(row.totalCents)}, uncovered {formatMoney(row.uncoveredCents)}, payroll
            add-back {formatMoney(row.uncoveredWcCents)}
          </Text>
        ))}
        <Text style={styles.total}>
          Uncovered {formatMoney(data.report.uncoveredCents)} of {formatMoney(data.report.totalPaidCents)} paid
        </Text>
        <Text style={styles.foot}>
          This packet is a record of certificates the contractor confirmed in AuditReady Subs. It does not
          issue coverage, interpret a policy, or replace the auditor&apos;s worksheet. Endorsement forms are
          not attached unless they were uploaded as the certificate file.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderPacketPdf(data: PacketModel): Promise<Buffer> {
  const output = await renderToBuffer(<PacketDocument data={data} />);
  return Buffer.from(output);
}
