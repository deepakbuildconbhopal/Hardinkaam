import React, { useState, useEffect } from 'react';
import {
  FileText,
  Receipt,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  Plus,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  DollarSign,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Booking } from '../../types';
import {
  FinancialDocument,
  FinancialDocumentType,
  RefundRecord,
} from '../../types/documents';
import {
  getAllFinancialDocuments,
  getAllRefundRecords,
  processBookingRefund,
  createOrGetTaxInvoiceForBooking,
} from '../../services/documentAndRefundService';
import { FinancialDocumentModal } from '../common/FinancialDocumentModal';

interface Props {
  bookings?: Booking[];
  onSelectTab?: (tab: string) => void;
}

export const AdminDocumentsAndRefunds: React.FC<Props> = ({ bookings = [], onSelectTab }) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'refunds' | 'process_refund'>('documents');
  const [loading, setLoading] = useState<boolean>(true);
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [refundRecords, setRefundRecords] = useState<RefundRecord[]>([]);

  // Filter & Search
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected document for modal preview
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<FinancialDocument | null>(null);

  // Refund Form State
  const [selectedBookingForRefund, setSelectedBookingForRefund] = useState<Booking | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('Customer Cancellation & Quality Dispute');
  const [paymentRefundId, setPaymentRefundId] = useState<string>('');
  const [isProcessingRefund, setIsProcessingRefund] = useState<boolean>(false);
  const [refundSuccessMsg, setRefundSuccessMsg] = useState<string | null>(null);
  const [refundErrorMsg, setRefundErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const typeFilter = selectedType !== 'ALL' ? (selectedType as FinancialDocumentType) : undefined;
      const docs = await getAllFinancialDocuments(typeFilter, 100);
      setDocuments(docs);

      const refunds = await getAllRefundRecords(50);
      setRefundRecords(refunds);
    } catch (e) {
      console.warn('Error loading financial documents:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((d) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      d.documentNumber.toLowerCase().includes(query) ||
      d.bookingId.toLowerCase().includes(query) ||
      d.customer.name.toLowerCase().includes(query) ||
      (d.customer.phone && d.customer.phone.includes(query)) ||
      (d.originalInvoiceNumber && d.originalInvoiceNumber.toLowerCase().includes(query))
    );
  });

  const handleOpenRefundForBooking = (b: Booking) => {
    setSelectedBookingForRefund(b);
    setRefundAmountInput(String(b.amount || 0));
    setPaymentRefundId(`rfnd_man_${Date.now().toString().slice(-6)}`);
    setActiveTab('process_refund');
  };

  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForRefund) return;

    setIsProcessingRefund(true);
    setRefundSuccessMsg(null);
    setRefundErrorMsg(null);

    try {
      const refundAmt = parseFloat(refundAmountInput) || selectedBookingForRefund.amount || 0;
      const res = await processBookingRefund({
        bookingId: selectedBookingForRefund.id,
        refundAmount: refundAmt,
        reason: refundReason,
        paymentRefundId: paymentRefundId || `rfnd_${Date.now()}`,
        processedBy: 'admin_dashboard',
      });

      if (!res.success) {
        setRefundErrorMsg(res.error || 'Refund failed to process.');
      } else {
        setRefundSuccessMsg(
          `Refund of ₹${refundAmt} processed successfully! Credit Note ${res.creditNote?.documentNumber} generated.`
        );
        // Refresh documents & refunds
        loadData();
        setTimeout(() => {
          if (res.creditNote) {
            setSelectedDocForPreview(res.creditNote);
          }
        }, 1200);
      }
    } catch (err: any) {
      setRefundErrorMsg(err?.message || 'Error processing refund.');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleOpenInvoiceForBooking = async (b: Booking) => {
    try {
      const invoice = await createOrGetTaxInvoiceForBooking(b);
      setSelectedDocForPreview(invoice);
    } catch (err) {
      console.warn('Error fetching invoice:', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-stone-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-3 border border-teal-500/30">
              <Receipt className="w-3.5 h-3.5" /> वित्तीय दस्तावेज़ व रिफंड प्रबंधन (Tax Documents &amp; Refund Ledger)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Tax Invoices, Credit Notes &amp; Refunds
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
              Statutory GST Tax Invoices, Receipts, Bills of Supply, Credit Notes, and full/partial refund tracking under Section 34 of the CGST Act.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-right">
              <span className="text-[10px] uppercase font-bold text-teal-300 block">Total Issued Docs</span>
              <span className="font-mono text-lg font-bold">{documents.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-right">
              <span className="text-[10px] uppercase font-bold text-rose-300 block">Total Refunds (Credit Notes)</span>
              <span className="font-mono text-lg font-bold text-rose-300">{refundRecords.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-stone-200/80 rounded-2xl border border-stone-300">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'documents'
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-300/50'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <FileText className="w-4 h-4 text-teal-600" />
          <span>1. All Documents ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('refunds')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'refunds'
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-300/50'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-rose-600" />
          <span>2. Refund &amp; Credit Note Ledger ({refundRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('process_refund')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'process_refund'
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-300/50'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Plus className="w-4 h-4 text-orange-600" />
          <span>3. Initiate New Refund &amp; Credit Note</span>
        </button>
      </div>

      {/* ================= TAB 1: ALL FINANCIAL DOCUMENTS ================= */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold bg-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All Document Types</option>
                <option value="TAX_INVOICE">Tax Invoices (INV)</option>
                <option value="CREDIT_NOTE">Credit Notes (CN)</option>
                <option value="RECEIPT">Payment Receipts (RCP)</option>
                <option value="BILL_OF_SUPPLY">Bills of Supply (BOS)</option>
                <option value="DEBIT_NOTE">Debit Notes (DN)</option>
              </select>

              {/* Search */}
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Doc #, Booking #, Customer..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <button
              onClick={loadData}
              className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
            >
              Refresh
            </button>
          </div>

          {/* Documents Table */}
          {loading ? (
            <div className="p-12 text-center text-stone-500">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <FileText className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-stone-800">No Documents Found</h4>
              <p className="text-xs text-stone-500 mt-1">
                Completed bookings will automatically generate official financial documents here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Doc Number</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Booking</th>
                    <th className="py-3 px-3">Place of Supply</th>
                    <th className="py-3 px-3 text-right">Taxable</th>
                    <th className="py-3 px-3 text-right">Tax (GST)</th>
                    <th className="py-3 px-3 text-right">Total Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredDocuments.map((d) => (
                    <tr key={d.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-stone-900">{d.documentNumber}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            d.documentType === 'TAX_INVOICE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.documentType === 'CREDIT_NOTE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {d.documentType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        {new Date(d.documentDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-800">
                        <div>{d.customer.name}</div>
                        <div className="text-[10px] text-stone-400 font-normal">{d.customer.phone}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-600">#{d.bookingId}</td>
                      <td className="py-3 px-3 font-semibold text-stone-700">
                        {d.placeOfSupplyState} ({d.placeOfSupplyStateCode})
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-stone-800">
                        ₹{d.totalTaxableAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700">
                        ₹{d.totalTaxAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-stone-900">
                        ₹{d.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            d.status === 'ISSUED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedDocForPreview(d)}
                          className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: REFUND & CREDIT NOTE LEDGER ================= */}
      {activeTab === 'refunds' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-lg font-bold text-stone-900">Statutory Refund &amp; Credit Note Audit Records</h2>
            <p className="text-xs text-stone-500">
              Complete history of all processed full and partial refunds with linked Credit Notes, tax reversals, and reward reversals.
            </p>
          </div>

          {refundRecords.length === 0 ? (
            <div className="p-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <RotateCcw className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-stone-800">No Refunds Processed</h4>
              <p className="text-xs text-stone-500 mt-1">
                When a refund is approved, the original transaction is preserved and a Credit Note is generated.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Refund ID</th>
                    <th className="py-3 px-3">Credit Note No.</th>
                    <th className="py-3 px-3">Original Invoice</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Processed Date</th>
                    <th className="py-3 px-3 text-right">Original (₹)</th>
                    <th className="py-3 px-3 text-right">Refunded (₹)</th>
                    <th className="py-3 px-3 text-right">Tax Reversed (₹)</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {refundRecords.map((ref) => (
                    <tr key={ref.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-rose-700">{ref.refundId}</td>
                      <td className="py-3 px-3 font-mono font-bold text-stone-900">{ref.creditNoteNumber}</td>
                      <td className="py-3 px-3 font-mono text-stone-600">{ref.originalInvoiceNumber}</td>
                      <td className="py-3 px-3 font-semibold text-stone-800">{ref.customerName || 'Customer'}</td>
                      <td className="py-3 px-3 text-stone-500">{new Date(ref.processedAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono text-stone-600">
                        ₹{ref.originalTransactionAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-rose-700">
                        ₹{ref.refundAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700">
                        ₹{ref.taxAdjustment.totalTaxReversed.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-stone-600 max-w-[150px] truncate" title={ref.refundReason}>
                        {ref.refundReason}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {ref.refundStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: INITIATE REFUND & CREDIT NOTE ================= */}
      {activeTab === 'process_refund' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-lg font-bold text-stone-900">Initiate Booking Refund &amp; Statutory Credit Note</h2>
            <p className="text-xs text-stone-500">
              Select any paid booking to issue a full or partial refund. The original invoice is preserved and an official Credit Note is generated.
            </p>
          </div>

          {refundSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{refundSuccessMsg}</span>
            </div>
          )}

          {refundErrorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{refundErrorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Booking Selector */}
            <div className="lg:col-span-6 space-y-4">
              <label className="block text-xs font-bold text-stone-800 uppercase">
                Step 1: Select Booking to Refund
              </label>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {bookings.length === 0 ? (
                  <p className="text-xs text-stone-500">No active bookings loaded.</p>
                ) : (
                  bookings
                    .filter((b) => b.paymentStatus === 'paid' || b.paymentStatus === 'cod')
                    .map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setSelectedBookingForRefund(b);
                          setRefundAmountInput(String(b.amount || 0));
                          setPaymentRefundId(`rfnd_${b.id.substring(0, 6)}`);
                        }}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          selectedBookingForRefund?.id === b.id
                            ? 'border-orange-600 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-xs'
                            : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-[11px] font-bold text-stone-700">#{b.id}</span>
                            <div className="font-bold text-stone-900 text-xs">{b.serviceName}</div>
                            <div className="text-[11px] text-stone-500">
                              {b.customerName} ({b.customerPhone})
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-sm text-stone-900">₹{b.amount}</span>
                            <span className="block text-[10px] font-bold text-emerald-700 uppercase">
                              {b.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Refund Parameters Form */}
            <div className="lg:col-span-6 bg-stone-50 p-6 rounded-3xl border border-stone-200 space-y-4">
              <label className="block text-xs font-bold text-stone-800 uppercase">
                Step 2: Refund &amp; Credit Note Parameters
              </label>

              {selectedBookingForRefund ? (
                <form onSubmit={handleProcessRefundSubmit} className="space-y-4 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
                    <div className="text-stone-500 text-[11px]">Selected Booking:</div>
                    <div className="font-bold text-stone-900 text-sm">
                      #{selectedBookingForRefund.id} - {selectedBookingForRefund.serviceName}
                    </div>
                    <div className="text-stone-600 font-mono">
                      Original Transaction Value: ₹{selectedBookingForRefund.amount}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Refund Amount (₹) - Supports Full or Partial
                    </label>
                    <input
                      type="number"
                      max={selectedBookingForRefund.amount}
                      min={1}
                      required
                      value={refundAmountInput}
                      onChange={(e) => setRefundAmountInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono font-black text-sm bg-white"
                    />
                    <span className="text-[10px] text-stone-500 mt-1 block">
                      Max refundable: ₹{selectedBookingForRefund.amount}
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Reason for Refund / Cancellation</label>
                    <select
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium bg-white"
                    >
                      <option value="Customer Cancellation & Quality Dispute">Customer Cancellation &amp; Quality Dispute</option>
                      <option value="Technician Non-Arrival or Delay">Technician Non-Arrival or Delay</option>
                      <option value="Service Rescheduled / Double Charged">Service Rescheduled / Double Charged</option>
                      <option value="Goodwill Customer Satisfaction Refund">Goodwill Customer Satisfaction Refund</option>
                      <option value="Mutual Cancellation by Admin">Mutual Cancellation by Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Payment Gateway / Cash Refund Reference ID</label>
                    <input
                      type="text"
                      required
                      value={paymentRefundId}
                      onChange={(e) => setPaymentRefundId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-xs bg-white"
                      placeholder="e.g. rfnd_razorpay_12345"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-amber-700 inline mr-1" />
                    Processing this refund will generate an official Credit Note (CN/2025-26/...) and reverse applicable reward points without deleting the original invoice.
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessingRefund}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {isProcessingRefund ? 'Processing Refund...' : 'Confirm Refund & Generate Credit Note'}
                  </button>
                </form>
              ) : (
                <div className="p-8 text-center text-stone-400">
                  Select a booking from the left list to proceed.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Financial Document Printable Preview Modal */}
      {selectedDocForPreview && (
        <FinancialDocumentModal
          document={selectedDocForPreview}
          onClose={() => setSelectedDocForPreview(null)}
        />
      )}
    </div>
  );
};
