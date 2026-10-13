export const exportTaskMonthlyReportToPDF = async (submissions: any[], monthLabel?: string) => {
  if (!submissions || submissions.length === 0) {
    alert('No task records available to generate monthly report.');
    return;
  }

  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 90, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('HARDINKAAM - MONTHLY TASK REPORT', 40, 40);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')} | Period: ${monthLabel || 'Current Month'}`, 40, 65);

  let startY = 110;

  // Summary Metrics
  const totalTasks = submissions.length;
  const approvedTasks = submissions.filter((s: any) => s.status === 'APPROVED' || s.status === 'PAID').length;
  const totalDisbursed = approvedTasks * 10;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 40, startY);

  startY += 15;

  const summaryData = [
    ['Total Task Submissions', String(totalTasks)],
    ['Approved & Processed Tasks (₹10 each)', String(approvedTasks)],
    ['Total Rewards Disbursed', `₹${totalDisbursed}`],
  ];

  autoTable(doc, {
    startY,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [13, 148, 136] }, // teal-600
    styles: { fontSize: 10, cellPadding: 8 },
  });

  startY = (doc as any).lastAutoTable.finalY + 30;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Task Completion & Earnings Log', 40, startY);

  startY += 15;

  const tableRows = submissions.map((s: any, idx: number) => [
    String(idx + 1),
    s.customerName || 'Customer',
    s.customerPhone || '—',
    s.taskTitle || 'Task',
    new Date(s.submittedAt).toLocaleDateString('en-IN'),
    `₹${s.rewardAmount || 10}`,
    s.status,
  ]);

  autoTable(doc, {
    startY,
    head: [['#', 'Customer Name', 'Phone', 'Task Title', 'Timestamp', 'Reward', 'Status']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 9, cellPadding: 6 },
  });

  doc.save(`Hardinkaam_Monthly_Task_Report_${Date.now()}.pdf`);
};
