import React, { useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  Phone,
  MapPin,
  Receipt,
  QrCode,
  Tag,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { FinancialDocument } from '../../types/documents';

interface Props {
  document: FinancialDocument;
  onClose: () => void;
}

export const FinancialDocumentModal: React.FC<Props> = ({ document: doc, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const getDocTypeBadge = () => {
    switch (doc.documentType) {
      case 'TAX_INVOICE':
        return {
          title: 'TAX INVOICE (कर इनवॉइस)',
          color: 'bg-emerald-600 text-white',
          subtitle: 'Issued under Section 31 of CGST Act 2017',
        };
      case 'CREDIT_NOTE':
        return {
          title: 'CREDIT NOTE (क्रेडिट नोट)',
          color: 'bg-rose-600 text-white',
          subtitle: 'Issued under Section 34 of CGST Act 2017 against original invoice',
        };
      case 'DEBIT_NOTE':
        return {
          title: 'DEBIT NOTE (डेबिट नोट)',
          color: 'bg-amber-600 text-white',
          subtitle: 'Issued under Section 34 of CGST Act 2017 for supplementary charges',
        };
      case 'BILL_OF_SUPPLY':
        return {
          title: 'BILL OF SUPPLY (सप्लाई बिल)',
          color: 'bg-indigo-600 text-white',
          subtitle: 'Issued for composition or exempt supplies',
        };
      case 'RECEIPT':
      default:
        return {
          title: 'OFFICIAL PAYMENT RECEIPT (भुगतान रसीद)',
          color: 'bg-teal-600 text-white',
          subtitle: 'Official acknowledgment of payment received',
        };
    }
  };

  const badgeInfo = getDocTypeBadge();

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Floating Action Bar (hidden in print) */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${badgeInfo.color}`}>
              {doc.documentType.replace('_', ' ')}
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-amber-300">
              {doc.documentNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div ref={printRef} className="p-6 sm:p-10 overflow-y-auto text-stone-900 font-sans space-y-6 bg-white">
          {/* Header & Company Brand */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-stone-900 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-orange-600">
                  {doc.tradeName || 'HARDINKAAM'}
                </span>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                  by Deepak Buildcon
                </span>
              </div>
              <h2 className="text-sm font-bold text-stone-900">
                {doc.legalBusinessName || 'DEEPAK BUILDCON & HOME SERVICES PRIVATE LIMITED'}
              </h2>
              <p className="text-xs text-stone-600 max-w-md mt-0.5 leading-tight">
                {doc.supplierAddress?.street}, {doc.supplierAddress?.locality}, {doc.supplierAddress?.city},{' '}
                {doc.supplierAddress?.state} - {doc.supplierAddress?.pincode}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-700 mt-2 font-mono">
                <span>
                  <strong>GSTIN:</strong> {doc.supplierGstin}
                </span>
                <span>
                  <strong>PAN:</strong> {doc.supplierPan}
                </span>
                <span>
                  <strong>State:</strong> {doc.supplierState} ({doc.supplierStateCode})
                </span>
              </div>
            </div>

            {/* Document Title & Number Badge */}
            <div className="text-left sm:text-right bg-stone-50 p-4 rounded-2xl border border-stone-200 min-w-[240px]">
              <div className={`inline-block px-3 py-1 rounded-md text-xs font-black uppercase mb-1 ${badgeInfo.color}`}>
                {badgeInfo.title}
              </div>
              <p className="text-[10px] text-stone-500 mb-2">{badgeInfo.subtitle}</p>

              <div className="text-xs space-y-1">
                <div>
                  <span className="text-stone-500 text-[10px] uppercase">Document No:</span>{' '}
                  <strong className="font-mono text-sm text-stone-900 block sm:inline">{doc.documentNumber}</strong>
                </div>
                <div>
                  <span className="text-stone-500 text-[10px] uppercase">Date:</span>{' '}
                  <strong className="text-stone-800">
                    {new Date(doc.documentDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-500 text-[10px] uppercase">Financial Year:</span>{' '}
                  <strong className="text-stone-800">{doc.financialYear}</strong>
                </div>
                {doc.originalInvoiceNumber && (
                  <div className="pt-1.5 border-t border-dashed border-stone-300 text-rose-700">
                    <span className="text-[10px] uppercase font-bold block">Against Invoice:</span>
                    <strong className="font-mono text-xs">{doc.originalInvoiceNumber}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer & Place of Supply Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50/70 p-4 rounded-2xl border border-stone-200 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 block mb-1">
                Billed To (Customer Details)
              </span>
              <div className="font-bold text-sm text-stone-900">{doc.customer.name}</div>
              <div className="text-stone-600 mt-0.5">{doc.customer.phone}</div>
              <div className="text-stone-600 mt-0.5">{doc.customer.address}</div>
              <div className="text-stone-600">
                {doc.customer.city}, {doc.customer.state} - {doc.customer.pincode}
              </div>
              {doc.customer.customerGstin && (
                <div className="mt-1 text-emerald-800 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                  GSTIN: {doc.customer.customerGstin} (B2B Taxable Supply)
                </div>
              )}
            </div>

            <div className="space-y-1.5 md:border-l md:border-stone-200 md:pl-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 block mb-1">
                Place of Supply &amp; Fulfillment
              </span>
              <div>
                <span className="text-stone-500">Place of Supply (POS):</span>{' '}
                <strong className="text-stone-900">
                  {doc.placeOfSupplyState} (State Code: {doc.placeOfSupplyStateCode})
                </strong>
              </div>
              <div>
                <span className="text-stone-500">Nature of Supply:</span>{' '}
                <strong className={doc.isInterState ? 'text-amber-700' : 'text-emerald-700'}>
                  {doc.isInterState ? 'Inter-State (IGST Applicable)' : 'Intra-State (CGST + SGST Applicable)'}
                </strong>
              </div>
              <div>
                <span className="text-stone-500">Service Professional:</span>{' '}
                <strong className="text-stone-900">{doc.serviceMan?.name || 'Assigned Professional'}</strong>
              </div>
              <div>
                <span className="text-stone-500">Booking Ref:</span>{' '}
                <strong className="font-mono text-stone-900">#{doc.bookingId}</strong>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-900 text-white font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 rounded-l-xl">#</th>
                  <th className="py-2.5 px-3">Service Description</th>
                  <th className="py-2.5 px-3 text-center">SAC Code</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                  <th className="py-2.5 px-3 text-center">GST Rate</th>
                  {doc.isInterState ? (
                    <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                  ) : (
                    <>
                      <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                      <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-right rounded-r-xl">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {doc.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-stone-50">
                    <td className="py-3 px-3 font-mono text-stone-500">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-stone-900">
                      <div>{item.itemDescription}</div>
                      {item.discountAmount > 0 && (
                        <span className="text-[10px] text-emerald-700 block">
                          Includes Promo Discount: -₹{item.discountAmount}
                        </span>
                      )}
                      {item.rewardDiscountAmount > 0 && (
                        <span className="text-[10px] text-amber-700 font-bold block">
                          Includes Reward Points Deduction: -₹{item.rewardDiscountAmount}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-orange-600">{item.sacCode}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      ₹{item.taxableAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-stone-700">
                      {item.gstRatePercent}%
                    </td>
                    {doc.isInterState ? (
                      <td className="py-3 px-3 text-right font-mono text-amber-800 font-semibold">
                        ₹{item.igstAmount.toFixed(2)}
                      </td>
                    ) : (
                      <>
                        <td className="py-3 px-3 text-right font-mono text-emerald-800 font-semibold">
                          ₹{item.cgstAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-800 font-semibold">
                          ₹{item.sgstAmount.toFixed(2)}
                        </td>
                      </>
                    )}
                    <td className="py-3 px-3 text-right font-mono font-black text-stone-900">
                      ₹{item.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation & Amount in Words */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
            <div className="sm:col-span-7 space-y-3">
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-amber-900 block mb-0.5">
                  Amount Chargeable (in words):
                </span>
                <div className="font-bold text-stone-800 italic leading-snug">{doc.amountInWords}</div>
              </div>

              <div className="text-[11px] text-stone-500 space-y-1 font-mono">
                <div>
                  <strong>Payment Mode:</strong> {doc.paymentMethod.toUpperCase()} | <strong>Status:</strong>{' '}
                  {doc.paymentStatus.toUpperCase()}
                </div>
                {doc.paymentTransactionId && (
                  <div>
                    <strong>Ref / Txn ID:</strong> {doc.paymentTransactionId}
                  </div>
                )}
                <div className="text-[10px] text-stone-400 font-sans mt-2">
                  {doc.statutoryNotes}
                </div>
              </div>
            </div>

            <div className="sm:col-span-5 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between text-stone-600">
                <span>Total Taxable Amount:</span>
                <span className="font-mono font-bold">₹{doc.totalTaxableAmount.toFixed(2)}</span>
              </div>

              {doc.isInterState ? (
                <div className="flex justify-between text-amber-800 font-semibold">
                  <span>Integrated Tax (IGST):</span>
                  <span className="font-mono">₹{doc.totalIgstAmount.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>Central Tax (CGST):</span>
                    <span className="font-mono">₹{doc.totalCgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>State Tax (SGST):</span>
                    <span className="font-mono">₹{doc.totalSgstAmount.toFixed(2)}</span>
                  </div>
                </>
              )}

              {doc.totalCessAmount > 0 && (
                <div className="flex justify-between text-stone-700">
                  <span>Cess Amount:</span>
                  <span className="font-mono">₹{doc.totalCessAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-stone-900 pt-2 border-t-2 border-stone-300">
                <span>{doc.documentType === 'CREDIT_NOTE' ? 'Total Refund Credit:' : 'Total Invoice Value:'}</span>
                <span className="font-mono text-base text-orange-600">₹{doc.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Statutory Sign-off & Seal */}
          <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-end justify-between gap-4 text-xs">
            <div className="space-y-1 text-stone-500 text-[10px]">
              <div className="flex items-center gap-1.5 font-bold text-stone-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Computer Generated Official Statutory Tax Document</span>
              </div>
              <p>Subject to Bhopal, Madhya Pradesh Jurisdiction.</p>
              <p className="font-mono text-[9px] text-stone-400">
                Verification Hash: {doc.qrCodeVerificationPayload?.substring(0, 40)}...
              </p>
            </div>

            <div className="text-center sm:text-right">
              <span className="text-[10px] text-stone-500 font-bold block mb-8">
                For {doc.legalBusinessName || 'DEEPAK BUILDCON & SERVICES PVT LTD'}
              </span>
              <div className="inline-block border-t border-stone-400 pt-1 text-[11px] font-bold text-stone-800">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
