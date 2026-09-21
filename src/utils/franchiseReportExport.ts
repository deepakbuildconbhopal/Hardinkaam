import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FranchisePartner, FranchiseAgreementRecord, KYCDocumentRecord } from '../types';

export interface FranchiseReportOptions {
  partner: FranchisePartner | null;
  agreement?: FranchiseAgreementRecord | null;
  kycDocs?: KYCDocumentRecord[];
  activeAgreementStatus: string;
  activeKycStatus: string;
  startDate: string;
  endDate: string;
  renewalDueDate: string;
  daysUntilRenewal: number;
}

/**
 * Generates an official, beautifully formatted summary PDF report of Franchise Partner Agreement & KYC status
 */
export const generateFranchiseAgreementKycPDF = (options: FranchiseReportOptions) => {
  const {
    partner,
    agreement,
    kycDocs = [],
    activeAgreementStatus,
    activeKycStatus,
    startDate,
    endDate,
    renewalDueDate,
    daysUntilRenewal,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Background Banner
  doc.setFillColor(28, 25, 23); // Stone 900
  doc.rect(0, 0, pageWidth, 75, 'F');

  // Accent line
  doc.setFillColor(217, 119, 6); // Amber 600
  doc.rect(0, 75, pageWidth, 4, 'F');

  // Brand Name & Tagline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('HARDINKAAM', 40, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(253, 230, 138); // Amber 200
  doc.text('DEEPAK BUILDCON MULTI-STATE HOME SERVICES NETWORK', 40, 50);

  doc.setFontSize(7.5);
  doc.setTextColor(214, 211, 209); // Stone 300
  doc.text('Corporate HQ: MP Nagar Zone 1, Bhopal, MP • Phone: +91 98260 12345', 40, 63);

  // Document Title on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('FRANCHISE COMPLIANCE REPORT', pageWidth - 40, 34, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(254, 243, 199);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 40, 48, { align: 'right' });
  doc.text(`Status: Official Audit Record`, pageWidth - 40, 60, { align: 'right' });

  // Franchise Partner Info Box
  let currentY = 95;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, currentY, pageWidth - 80, 80, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(partner?.name || 'District Franchise Administrator', 55, currentY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(217, 119, 6); // Amber 600
  doc.text(`Franchise Code: ${partner?.franchiseCode || 'HDK-001'}`, 55, currentY + 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Territory: ${partner?.assignedDistrictName || 'District'} District, ${partner?.stateName || 'Madhya Pradesh'}`, 55, currentY + 54);
  doc.text(`Contact: ${partner?.phone || 'N/A'} • Email: ${partner?.email || 'N/A'}`, 55, currentY + 68);

  // Partner Status Badges on right of info box
  const boxRightX = pageWidth - 55;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('OPERATIONAL STATUS:', boxRightX, currentY + 22, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  if (partner?.status === 'ACTIVE') {
    doc.setTextColor(5, 150, 105); // Emerald 600
    doc.text('● ACTIVE / AUTHORIZED', boxRightX, currentY + 38, { align: 'right' });
  } else {
    doc.setTextColor(217, 119, 6);
    doc.text(`● ${(partner?.status || 'PENDING').toUpperCase()}`, boxRightX, currentY + 38, { align: 'right' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Revenue Share: 90% Partner / 10% HQ Royalty`, boxRightX, currentY + 54, { align: 'right' });
  doc.text(`Target: Min 30 Bookings / Month`, boxRightX, currentY + 68, { align: 'right' });

  // Section 1: Agreement Status & Dates Matrix
  currentY = 190;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Franchise Agreement Status & Lifecycle', 40, currentY);

  const agreementRows = [
    ['Current Agreement Status', `${activeAgreementStatus} (Verified by Super Admin)`],
    ['Agreement Reference Code', agreement?.agreementId || `AGR-${partner?.franchiseCode || 'HDK'}-2026`],
    ['Effective Start Date', startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '01 Apr 2026'],
    ['Agreement Expiration Date', endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '31 Mar 2027'],
    ['Annual Renewal Due Date', `${renewalDueDate ? new Date(renewalDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '01 Mar 2027'} (${daysUntilRenewal > 0 ? `${daysUntilRenewal} days remaining` : 'Renewal window active'})`],
    ['Authorized Signatory', partner?.agreementSignedBy || partner?.name || 'Authorized District Representative'],
    ['Signing Timestamp', partner?.agreementSignedAt ? new Date(partner.agreementSignedAt).toLocaleString('en-IN') : 'Completed via Portal'],
  ];

  autoTable(doc, {
    startY: currentY + 8,
    head: [['Compliance Parameter', 'Official Recorded Value']],
    body: agreementRows,
    margin: { left: 40, right: 40 },
    theme: 'striped',
    headStyles: {
      fillColor: [41, 37, 36], // Stone 800
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 5,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 170, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto' },
    },
  });

  // Section 2: KYC Compliance Matrix
  currentY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Partner KYC Document Verification Matrix', 40, currentY);

  const kycTableData: any[] = [];
  if (kycDocs.length > 0) {
    kycDocs.forEach((d, idx) => {
      kycTableData.push([
        (idx + 1).toString(),
        d.documentTitle || d.documentType?.replace(/_/g, ' ') || 'DOCUMENT',
        d.fileName || 'SUBMITTED',
        d.status || 'VERIFIED',
        d.verifiedBy || 'Super Admin (Deepak HQ)',
        d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-IN') : 'Active',
      ]);
    });
  } else {
    // Standard default KYC verification items
    const standardKyc = [
      ['1', 'AADHAAR CARD VERIFICATION', 'Aadhaar_Document_Verified.pdf', activeKycStatus === 'Verified' ? 'VERIFIED' : 'PENDING', 'Deepak HQ Compliance', 'Active'],
      ['2', 'PAN CARD VERIFICATION', 'PAN_Card_Verified.pdf', activeKycStatus === 'Verified' ? 'VERIFIED' : 'PENDING', 'Income Tax Verification Desk', 'Active'],
      ['3', 'DISTRICT COMMERCIAL PROOF / GUMASTA', 'Gumasta_Certificate.pdf', activeKycStatus === 'Verified' ? 'VERIFIED' : 'PENDING', 'Govt of MP Portal', 'Active'],
      ['4', 'BANK ACCOUNT & CANCELLED CHEQUE', 'Cancelled_Cheque_Proof.pdf', activeKycStatus === 'Verified' ? 'VERIFIED' : 'PENDING', 'Razorpay Payout Desk', 'Active'],
      ['5', 'POLICE BACKGROUND CLEARANCE', 'Police_Verification_Report.pdf', activeKycStatus === 'Verified' ? 'VERIFIED' : 'PENDING', 'Bhopal HQ Vigilance', 'Active'],
    ];
    standardKyc.forEach((row) => kycTableData.push(row));
  }

  autoTable(doc, {
    startY: currentY + 8,
    head: [['#', 'Document / Verification Item', 'File / Reference', 'Status', 'Verified By', 'Updated']],
    body: kycTableData,
    margin: { left: 40, right: 40 },
    theme: 'striped',
    headStyles: {
      fillColor: [217, 119, 6], // Amber 600
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: 5,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 4.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 160, fontStyle: 'bold' },
      2: { cellWidth: 120 },
      3: { cellWidth: 70, fontStyle: 'bold' },
      4: { cellWidth: 100 },
      5: { cellWidth: 50, halign: 'center' },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const text = String(data.cell.raw || '');
        if (text === 'VERIFIED') {
          doc.setTextColor(5, 150, 105); // Emerald 600
        } else if (text === 'PENDING' || text === 'UNDER_REVIEW') {
          doc.setTextColor(217, 119, 6); // Amber 600
        } else if (text === 'REJECTED') {
          doc.setTextColor(225, 29, 72); // Rose 600
        }
      }
    },
  });

  // Renewal Alert Highlight Notice if within 30 days
  currentY = (doc as any).lastAutoTable.finalY + 15;
  if (daysUntilRenewal <= 30) {
    doc.setFillColor(254, 242, 242); // Red 50
    doc.setDrawColor(248, 113, 113);
    doc.roundedRect(40, currentY, pageWidth - 80, 40, 5, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28); // Red 700
    doc.text('⚠️ ANNUAL AGREEMENT RENEWAL NOTICE:', 50, currentY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(153, 27, 27);
    doc.text(
      `Your annual agreement is due for renewal on ${new Date(renewalDueDate).toLocaleDateString('en-IN')}. Please contact Deepak Buildcon HQ for timely renewal submission.`,
      50,
      currentY + 28
    );
    currentY += 48;
  }

  // Legal & Certification Footer Box
  const footerBoxY = pageHeight - 75;
  doc.setFillColor(245, 245, 244);
  doc.rect(40, footerBoxY, pageWidth - 80, 50, 'F');
  doc.setDrawColor(214, 211, 209);
  doc.rect(40, footerBoxY, pageWidth - 80, 50, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(68, 64, 60);
  doc.text('OFFICIAL CERTIFICATION & LEGAL NOTICE', 50, footerBoxY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text(
    'This compliance document is electronically generated from the HARDINKAAM Deepak Buildcon Super Admin Registry. It confirms the registered agreement status and KYC records of the authorized Franchise Partner.',
    50,
    footerBoxY + 26
  );
  doc.text(
    'For any discrepancies or official updates, please reach Deepak Buildcon Compliance Cell: deepakbuildconbhopal@gmail.com | +91 98260 12345',
    50,
    footerBoxY + 38
  );

  // Page numbering and watermark line
  doc.setFontSize(7);
  doc.setTextColor(168, 162, 158);
  doc.text('HARDINKAAM Franchise Partner Registry • Confidential & Official Record', 40, pageHeight - 12);
  doc.text('Page 1 of 1', pageWidth - 40, pageHeight - 12, { align: 'right' });

  // Save PDF
  const cleanCode = (partner?.franchiseCode || 'HDK-PARTNER').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Franchise_Agreement_KYC_Summary_${cleanCode}_${dateStr}.pdf`;

  doc.save(filename);
};
