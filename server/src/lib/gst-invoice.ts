import PDFDocument from "pdfkit";
import type { Response } from "express";

export interface GstInvoiceParams {
  invoiceNumber: string;
  invoiceDate: string;
  buyerName: string;
  buyerEmail: string;
  buyerGst?: string | null;
  contractorName: string;
  contractorEmail: string;
  contractorGst?: string | null;
  razorpayLinkedAccountId?: string | null;
  requirementTitle: string;
  requirementId: string;
  baseAmount: number;      // in INR (net to provider)
  platformFee: number;     // in INR
  tdsAmount: number;       // in INR (already deducted)
  razorpayTransferId?: string | null;
}

// GST rates for works contracts (Indian GST law)
const GST_RATE = 0.18;          // 18% total
const CGST_RATE = 0.09;         // 9% CGST
const SGST_RATE = 0.09;         // 9% SGST

// OmniBid brand colours
const BRAND_TEAL = "#0f766e";
const BRAND_DARK = "#1a1a2e";
const LIGHT_GREY = "#f8fafc";
const MID_GREY = "#64748b";
const BORDER_GREY = "#e2e8f0";

/**
 * Streams a GST-compliant PDF invoice directly to the Express response object.
 * No temporary file is written to disk.
 */
export function streamGstInvoice(res: Response, params: GstInvoiceParams): void {
  const doc = new PDFDocument({ size: "A4", margin: 50, autoFirstPage: true });

  // Stream directly to response
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="OmniBid-GST-Invoice-${params.invoiceNumber}.pdf"`
  );
  doc.pipe(res);

  // ─── GST Calculations ──────────────────────────────────────────────────────
  const taxableValue = params.baseAmount;
  const cgstAmount = Math.round(taxableValue * CGST_RATE * 100) / 100;
  const sgstAmount = Math.round(taxableValue * SGST_RATE * 100) / 100;
  const totalGst = cgstAmount + sgstAmount;
  const grandTotal = taxableValue + totalGst;

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  let y = doc.page.margins.top;

  // ─── Header Band ────────────────────────────────────────────────────────────
  doc
    .rect(0, 0, doc.page.width, 90)
    .fill(BRAND_DARK);

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("OmniBid India", doc.page.margins.left, 24, { align: "left" });

  doc
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(9)
    .text("B2B Construction & Services Marketplace", doc.page.margins.left, 50, { align: "left" });

  // GST Invoice title (right side)
  doc
    .fillColor(BRAND_TEAL)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("TAX INVOICE", doc.page.margins.left, 24, { align: "right" });

  doc
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(8)
    .text("Works Contract — GST Registered", doc.page.margins.left, 50, { align: "right" });

  y = 110;

  // ─── Invoice Meta Info ──────────────────────────────────────────────────────
  doc
    .fillColor(BRAND_DARK)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(`Invoice No: ${params.invoiceNumber}`, doc.page.margins.left, y)
    .text(`Invoice Date: ${params.invoiceDate}`, doc.page.margins.left, y + 13)
    .text(`GSTIN (OmniBid): 29AADCO1234A1Z5`, doc.page.margins.left, y + 26)
    .text(`SAC Code: 9954 (Works Contract Services)`, doc.page.margins.left, y + 39);

  if (params.razorpayTransferId) {
    doc
      .fillColor(MID_GREY)
      .font("Helvetica")
      .fontSize(8)
      .text(`Transfer Ref: ${params.razorpayTransferId}`, doc.page.margins.left, y + 52);
  }

  y += 80;

  // ─── Divider ────────────────────────────────────────────────────────────────
  doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor(BORDER_GREY).stroke();
  y += 14;

  // ─── Billed From / Billed To ────────────────────────────────────────────────
  const colW = (pageWidth - 20) / 2;

  // Supplier (Contractor)
  doc
    .fillColor(BRAND_TEAL)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("SUPPLIER (CONTRACTOR)", doc.page.margins.left, y);

  doc
    .fillColor(BRAND_DARK)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(params.contractorName, doc.page.margins.left, y + 12);

  doc
    .fillColor(MID_GREY)
    .font("Helvetica")
    .fontSize(8.5)
    .text(params.contractorEmail, doc.page.margins.left, y + 25);

  if (params.contractorGst) {
    doc.text(`GSTIN: ${params.contractorGst}`, doc.page.margins.left, y + 37);
  }

  // Buyer (Client)
  const rightX = doc.page.margins.left + colW + 20;
  doc
    .fillColor(BRAND_TEAL)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("BILLED TO (BUYER)", rightX, y);

  doc
    .fillColor(BRAND_DARK)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(params.buyerName, rightX, y + 12);

  doc
    .fillColor(MID_GREY)
    .font("Helvetica")
    .fontSize(8.5)
    .text(params.buyerEmail, rightX, y + 25);

  if (params.buyerGst) {
    doc.text(`GSTIN: ${params.buyerGst}`, rightX, y + 37);
  }

  y += 62;

  doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor(BORDER_GREY).stroke();
  y += 14;

  // ─── Project Details ─────────────────────────────────────────────────────────
  doc
    .fillColor(BRAND_TEAL)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("PROJECT / REQUIREMENT", doc.page.margins.left, y);

  doc
    .fillColor(BRAND_DARK)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(params.requirementTitle, doc.page.margins.left, y + 12, { width: pageWidth });

  doc
    .fillColor(MID_GREY)
    .font("Helvetica")
    .fontSize(8)
    .text(`Requirement ID: ${params.requirementId}`, doc.page.margins.left, y + 28);

  y += 50;

  doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor(BORDER_GREY).stroke();
  y += 14;

  // ─── Line Items Table ────────────────────────────────────────────────────────
  const cols = {
    description: doc.page.margins.left,
    sac: doc.page.margins.left + pageWidth * 0.45,
    rate: doc.page.margins.left + pageWidth * 0.6,
    qty: doc.page.margins.left + pageWidth * 0.72,
    amount: doc.page.margins.left + pageWidth * 0.82,
  };

  // Table header
  doc
    .rect(doc.page.margins.left, y, pageWidth, 18)
    .fill(LIGHT_GREY);

  doc
    .fillColor(BRAND_DARK)
    .font("Helvetica-Bold")
    .fontSize(8);

  doc.text("Description", cols.description + 4, y + 5);
  doc.text("SAC", cols.sac, y + 5);
  doc.text("Rate (₹)", cols.rate, y + 5);
  doc.text("Qty", cols.qty, y + 5);
  doc.text("Amount (₹)", cols.amount, y + 5);

  y += 22;

  // Row: Works Contract Services
  function drawRow(desc: string, sac: string, rate: number, qty: number, amount: number, rowY: number) {
    doc
      .fillColor(BRAND_DARK)
      .font("Helvetica")
      .fontSize(8.5)
      .text(desc, cols.description + 4, rowY, { width: pageWidth * 0.42 });

    doc.text(sac, cols.sac, rowY);
    doc.text(`₹${rate.toLocaleString("en-IN")}`, cols.rate, rowY);
    doc.text(String(qty), cols.qty, rowY);
    doc
      .font("Helvetica-Bold")
      .text(`₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, cols.amount, rowY);
  }

  drawRow(
    `Works Contract Services — ${params.requirementTitle}`,
    "9954",
    taxableValue,
    1,
    taxableValue,
    y
  );
  y += 20;

  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor(BORDER_GREY)
    .lineWidth(0.5)
    .stroke();

  y += 10;

  // ─── Tax Breakdown Table ─────────────────────────────────────────────────────
  const taxX = doc.page.margins.left + pageWidth * 0.48;
  const taxW = pageWidth * 0.52;

  function taxRow(label: string, value: string, rowY: number, bold = false) {
    doc
      .fillColor(bold ? BRAND_DARK : MID_GREY)
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(8.5);
    doc.text(label, taxX, rowY, { width: taxW * 0.6 });
    doc.text(value, taxX + taxW * 0.6, rowY, { width: taxW * 0.4, align: "right" });
  }

  taxRow("Taxable Value (Base Amount)", `₹${taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, y);
  y += 14;
  taxRow(`CGST @ ${(CGST_RATE * 100).toFixed(0)}%`, `₹${cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, y);
  y += 14;
  taxRow(`SGST @ ${(SGST_RATE * 100).toFixed(0)}%`, `₹${sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, y);
  y += 14;

  if (params.tdsAmount > 0) {
    taxRow(`TDS Deducted (Sec 194C @ 2%)`, `-₹${params.tdsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, y);
    y += 14;
  }

  doc
    .moveTo(taxX, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor(BORDER_GREY)
    .lineWidth(1)
    .stroke();

  y += 8;

  // Grand Total
  doc
    .rect(taxX - 4, y - 4, taxW + 8, 26)
    .fill(BRAND_TEAL);

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("GRAND TOTAL", taxX, y + 4, { width: taxW * 0.6 });
  doc.text(
    `₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    taxX + taxW * 0.6,
    y + 4,
    { width: taxW * 0.4, align: "right" }
  );

  y += 40;

  // ─── Platform Fee Note ───────────────────────────────────────────────────────
  if (params.platformFee > 0) {
    doc
      .rect(doc.page.margins.left, y, pageWidth, 28)
      .fill(LIGHT_GREY);

    doc
      .fillColor(MID_GREY)
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        `Platform Facilitation Fee: ₹${params.platformFee.toLocaleString("en-IN")} (charged separately by OmniBid India, inclusive of GST) — not included in this invoice.`,
        doc.page.margins.left + 6,
        y + 8,
        { width: pageWidth - 12 }
      );

    y += 36;
  }

  // ─── Declaration ─────────────────────────────────────────────────────────────
  y += 10;
  doc
    .fillColor(BRAND_DARK)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("Declaration", doc.page.margins.left, y);

  doc
    .fillColor(MID_GREY)
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      "We declare that this invoice shows the actual price of the goods/services described above and that all particulars are true and correct. This is a computer-generated invoice and does not require a physical signature.",
      doc.page.margins.left,
      y + 12,
      { width: pageWidth }
    );

  y += 42;

  // ─── Footer ──────────────────────────────────────────────────────────────────
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor(BORDER_GREY)
    .lineWidth(0.5)
    .stroke();

  doc
    .fillColor(MID_GREY)
    .font("Helvetica")
    .fontSize(7)
    .text(
      `OmniBid India Pvt. Ltd. | CIN: U74999MH2024PTC000000 | GSTIN: 29AADCO1234A1Z5 | support@omnibid.in | omnibid.in`,
      doc.page.margins.left,
      y + 8,
      { align: "center", width: pageWidth }
    );

  doc.end();
}
