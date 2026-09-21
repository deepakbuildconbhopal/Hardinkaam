import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking } from '../types';

export interface CustomerExportInfo {
  name?: string;
  phone?: string;
  email?: string;
  dateRangeLabel?: string;
}

/**
 * Format currency in Indian Rupees notation
 */
const formatINR = (val: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

/**
 * Human-readable status label
 */
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    case 'on_the_way':
      return 'On The Way';
    case 'accepted':
      return 'Confirmed';
    case 'pending':
      return 'Pending';
    case 'cancelled':
      return 'Cancelled';
    case 'rejected':
      return 'Declined';
    default:
      return status ? status.toUpperCase() : 'UNKNOWN';
  }
};

/**
 * Clean string for CSV to prevent delimiter breakage or formula injection
 */
const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();
  // Neutralize CSV formula injection characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Export booking history to CSV
 */
export const exportBookingsToCSV = (
  bookings: Booking[],
  customerInfo: CustomerExportInfo = {},
  filterName: string = 'All',
  dateRangeLabel?: string
) => {
  if (!bookings || bookings.length === 0) {
    alert('No bookings available to download.');
    return;
  }

  const effectiveRange = dateRangeLabel || customerInfo.dateRangeLabel || 'All Time';

  const headers = [
    'Booking ID',
    'Service Name',
    'Category',
    'Status',
    'Scheduled Date',
    'Scheduled Time',
    'Amount (INR)',
    'Payment Status',
    'Payment Method',
    'Assigned Technician',
    'Technician Phone',
    'Customer Name',
    'Customer Phone',
    'Service Address',
    'City',
    'Pincode',
    'Rating',
    'Customer Review',
    'Booking Notes',
    'Created Date',
    'Completed Date',
  ];

  const rows = bookings.map((b) => [
    escapeCSV(b.id),
    escapeCSV(b.serviceName || 'Standard Service'),
    escapeCSV(b.categoryName || 'General'),
    escapeCSV(getStatusLabel(b.status)),
    escapeCSV(b.scheduledDate || 'N/A'),
    escapeCSV(b.scheduledTime || 'N/A'),
    escapeCSV(b.amount || 0),
    escapeCSV((b.paymentStatus || 'unpaid').toUpperCase()),
    escapeCSV((b.paymentMethod || 'cash').toUpperCase()),
    escapeCSV(b.serviceManName || 'Not Assigned'),
    escapeCSV(b.serviceManPhone || 'N/A'),
    escapeCSV(b.customerName || customerInfo.name || 'Customer'),
    escapeCSV(b.customerPhone || customerInfo.phone || 'N/A'),
    escapeCSV(b.address || 'N/A'),
    escapeCSV(b.city || 'Bhopal'),
    escapeCSV(b.pincode || 'N/A'),
    escapeCSV(b.rating ? `${b.rating} / 5` : 'Not Rated'),
    escapeCSV(b.reviewComment || ''),
    escapeCSV(b.notes || ''),
    escapeCSV(b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : 'N/A'),
    escapeCSV(b.completedAt ? new Date(b.completedAt).toLocaleDateString('en-IN') : 'N/A'),
  ]);

  // Add UTF-8 BOM for perfect Microsoft Excel Hindi/English rendering
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanName = (customerInfo.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const rangeSlug = effectiveRange !== 'All Time'
    ? `_${effectiveRange.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)}`
    : '';
  const filename = `HARDINKAAM_Bookings_${cleanName}_${filterName}${rangeSlug}_${dateStr}.csv`;

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export booking history to an executive summary PDF
 */
export const exportBookingsToPDF = (
  bookings: Booking[],
  customerInfo: CustomerExportInfo = {},
  filterName: string = 'All',
  dateRangeLabel?: string
) => {
  if (!bookings || bookings.length === 0) {
    alert('No bookings available to download.');
    return;
  }

  const effectiveRange = dateRangeLabel || customerInfo.dateRangeLabel || 'All Time';

  // Create A4 Landscape PDF for rich legible tabular statement
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Metrics computation
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const activeBookings = bookings.filter((b) =>
    ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(b.status)
  );
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled' || b.status === 'rejected');
  const totalSpent = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalAllInvoiced = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);

  // 1. Brand Header Banner
  doc.setFillColor(249, 115, 22); // Orange 500
  doc.rect(0, 0, pageWidth, 54, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('HARDINKAAM', 36, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(254, 243, 199);
  doc.text('India’s Trusted On-Demand Home & Local Services • hardinkaam.com', 36, 44);

  // Statement Label on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('CUSTOMER BOOKING SUMMARY', pageWidth - 36, 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const printDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated: ${printDate}`, pageWidth - 36, 42, { align: 'right' });

  // 2. Customer & Filter Details Box
  doc.setFillColor(245, 245, 244); // Stone 100
  doc.roundedRect(36, 66, pageWidth - 72, 54, 6, 6, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(1);
  doc.roundedRect(36, 66, pageWidth - 72, 54, 6, 6, 'D');

  // Customer column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(`Customer: ${customerInfo.name || 'Valued Customer'}`, 48, 82);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const phoneText = customerInfo.phone ? `Phone: ${customerInfo.phone}` : '';
  const emailText = customerInfo.email ? `Email: ${customerInfo.email}` : '';
  const contactText = [phoneText, emailText].filter(Boolean).join('  |  ') || 'Customer Account';
  doc.text(contactText, 48, 96);
  doc.text(
    `Status: ${completedBookings.length} Completed  •  ${activeBookings.length} Active  •  ${cancelledBookings.length} Cancelled`,
    48,
    110
  );

  // Summary counts and Period column
  const midX = pageWidth / 2 - 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(`View Filter: ${filterName} Bookings (${totalBookings})`, midX, 82);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(234, 88, 12); // Orange 600
  doc.text(`Period: ${effectiveRange}`, midX, 96);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Records matched: ${totalBookings} service job(s)`, midX, 110);

  // Financial column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`Total Paid: ${formatINR(totalSpent)}`, pageWidth - 48, 82, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Invoiced: ${formatINR(totalAllInvoiced)}`, pageWidth - 48, 96, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Includes verified GST receipts', pageWidth - 48, 110, { align: 'right' });

  // 3. Table of Bookings
  const tableData = bookings.map((b, idx) => {
    const serviceName = b.serviceName || 'General Service';
    const category = b.categoryName ? `[${b.categoryName}]` : '';
    const fullService = `${serviceName} ${category}`.trim();
    const schedule = `${b.scheduledDate || 'N/A'}${b.scheduledTime ? ` (${b.scheduledTime})` : ''}`;
    const technician = b.serviceManName
      ? `${b.serviceManName}${b.serviceManPhone ? `\n${b.serviceManPhone}` : ''}`
      : 'Unassigned';
    const status = getStatusLabel(b.status);
    const payment = `${(b.paymentStatus || 'unpaid').toUpperCase()} / ${(b.paymentMethod || 'cash').toUpperCase()}`;
    const amount = formatINR(b.amount || 0);

    return [
      String(idx + 1),
      b.id ? `#${b.id.slice(-6)}` : `B-${idx + 1}`,
      fullService,
      schedule,
      technician,
      status,
      payment,
      amount,
    ];
  });

  autoTable(doc, {
    startY: 128,
    head: [
      [
        '#',
        'Order ID',
        'Service Requested & Category',
        'Scheduled Date & Time',
        'Technician',
        'Status',
        'Payment',
        'Amount',
      ],
    ],
    body: tableData,
    margin: { left: 36, right: 36, bottom: 45 },
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 6,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      overflow: 'linebreak',
      textColor: [33, 37, 41],
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' }, // #
      1: { cellWidth: 55, fontStyle: 'bold' }, // Order ID
      2: { cellWidth: 170 }, // Service Name
      3: { cellWidth: 110 }, // Schedule
      4: { cellWidth: 120 }, // Technician
      5: { cellWidth: 75, fontStyle: 'bold' }, // Status
      6: { cellWidth: 95 }, // Payment
      7: { cellWidth: 70, halign: 'right', fontStyle: 'bold' }, // Amount
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
    didDrawCell: (data) => {
      // Color-code Status column
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw || '');
        if (text === 'Completed') {
          doc.setTextColor(5, 150, 105); // Emerald 600
        } else if (text === 'In Progress' || text === 'On The Way' || text === 'Confirmed') {
          doc.setTextColor(217, 119, 6); // Amber 600
        } else if (text === 'Cancelled' || text === 'Declined') {
          doc.setTextColor(225, 29, 72); // Rose 600
        }
      }
    },
    didDrawPage: (data) => {
      // Footer on every page
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate 400

      // Support & Verification Line
      const footerY = pageHeight - 18;
      doc.text(
        'HARDINKAAM Verified Service Guarantee • 24x7 Support: 1800-889-2555 | support@hardinkaam.com • Bhopal, MP',
        36,
        footerY
      );

      const totalPagesExp = '{total_pages_count_string}';
      const pageStr = `Page ${data.pageNumber} of ${totalPagesExp}`;
      doc.text(pageStr, pageWidth - 36, footerY, { align: 'right' });
    },
  });

  // Calculate total pages dynamically
  if (typeof (doc as any).putTotalPages === 'function') {
    (doc as any).putTotalPages('{total_pages_count_string}');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanName = (customerInfo.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `HARDINKAAM_Booking_Summary_${cleanName}_${filterName}_${dateStr}.pdf`;

  doc.save(filename);
};

/**
 * Export a single booking receipt/invoice to a formal PDF
 */
export const exportSingleInvoicePDF = (
  booking: Booking,
  customerInfo: CustomerExportInfo = {}
) => {
  if (!booking) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Banner
  doc.setFillColor(249, 115, 22); // Orange 500
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('HARDINKAAM', 40, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(254, 243, 199);
  doc.text('GST Compliant Service Receipt & Tax Invoice', 40, 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', pageWidth - 40, 32, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Receipt #: INV-${booking.id}`, pageWidth - 40, 48, { align: 'right' });

  // Invoice Details Block
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 80, pageWidth - 80, 95, 6, 6, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, 80, pageWidth - 80, 95, 6, 6, 'D');

  // Customer Details (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('BILLED TO:', 55, 100);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(booking.customerName || customerInfo.name || 'Valued Customer', 55, 115);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Phone: ${booking.customerPhone || customerInfo.phone || 'N/A'}`, 55, 130);
  doc.text(`Address: ${booking.address || 'Bhopal, MP'}`, 55, 145);
  if (booking.city || booking.pincode) {
    doc.text(`City / PIN: ${[booking.city, booking.pincode].filter(Boolean).join(', ')}`, 55, 160);
  }

  // Booking Info (Right)
  const rightColX = pageWidth - 200;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Booking Ref:', rightColX, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${booking.id}`, rightColX + 75, 100);

  doc.setFont('helvetica', 'bold');
  doc.text('Date of Service:', rightColX, 115);
  doc.setFont('helvetica', 'normal');
  doc.text(`${booking.scheduledDate || 'N/A'}`, rightColX + 75, 115);

  doc.setFont('helvetica', 'bold');
  doc.text('Technician:', rightColX, 130);
  doc.setFont('helvetica', 'normal');
  doc.text(`${booking.serviceManName || 'Hardinkaam Pro'}`, rightColX + 75, 130);

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Status:', rightColX, 145);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129);
  doc.text(
    `${(booking.paymentStatus || 'paid').toUpperCase()} (${(booking.paymentMethod || 'cash').toUpperCase()})`,
    rightColX + 75,
    145
  );

  // Line items
  const baseAmount = Math.round((booking.amount || 0) / 1.18);
  const gstAmount = (booking.amount || 0) - baseAmount;

  autoTable(doc, {
    startY: 190,
    head: [['#', 'Item / Service Description', 'Category', 'Rate (INR)', 'GST (18%)', 'Total (INR)']],
    body: [
      [
        '1',
        booking.serviceName || 'On-Demand Service',
        booking.categoryName || 'Standard Service',
        formatINR(baseAmount),
        formatINR(gstAmount),
        formatINR(booking.amount || 0),
      ],
      [
        '2',
        'Standard Professional Inspection & Visit Charge',
        'Doorstep Warranty',
        '0.00',
        '0.00',
        'FREE',
      ],
    ],
    margin: { left: 40, right: 40 },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 7,
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      1: { cellWidth: 200 },
      2: { cellWidth: 100 },
      3: { cellWidth: 65, halign: 'right' },
      4: { cellWidth: 60, halign: 'right' },
      5: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;

  // Grand Total Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth - 230, finalY, 190, 80, 4, 4, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(pageWidth - 230, finalY, 190, 80, 4, 4, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal (Taxable):', pageWidth - 215, finalY + 20);
  doc.text(formatINR(baseAmount), pageWidth - 55, finalY + 20, { align: 'right' });

  doc.text('GST (18% CGST+SGST):', pageWidth - 215, finalY + 38);
  doc.text(formatINR(gstAmount), pageWidth - 55, finalY + 38, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(pageWidth - 220, finalY + 46, pageWidth - 50, finalY + 46);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Amount Paid:', pageWidth - 215, finalY + 65);
  doc.setTextColor(249, 115, 22);
  doc.text(formatINR(booking.amount || 0), pageWidth - 55, finalY + 65, { align: 'right' });

  // Guarantee and terms box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Service Guarantee & Support:', 40, finalY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('• 30-Day Post-Service Guarantee included with all standard repair jobs.', 40, finalY + 35);
  doc.text('• Genuine MRP spare parts invoice provided directly by verified technician.', 40, finalY + 48);
  doc.text('• Need assistance? Call toll-free 1800-889-2555 or email support@hardinkaam.com', 40, finalY + 61);

  // Bottom Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'HARDINKAAM Private Limited • Registered in Bhopal, Madhya Pradesh, India • This is a computer-generated tax receipt.',
    pageWidth / 2,
    pageHeight - 25,
    { align: 'center' }
  );

  doc.save(`HARDINKAAM_Invoice_${booking.id}.pdf`);
};
