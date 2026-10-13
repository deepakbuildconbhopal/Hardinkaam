import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Filter,
  UserCheck,
  Download,
  FileSpreadsheet,
  Video,
  MessageSquare,
  Receipt,
  Route,
  Navigation,
  X,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Banknote,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Booking, BookingStatus, ServiceMan } from '../../types';
import { generateWhatsAppVideoCallUrl } from '../../utils/whatsappVideoCall';
import { HardinkaamServiceBill } from '../common/HardinkaamServiceBill';
import { AdminBookingTrackingHistoryModal } from './AdminBookingTrackingHistoryModal';
import { AdminBookingUpiPaymentModal } from './AdminBookingUpiPaymentModal';
import { AdminCashTransactionModal } from './AdminCashTransactionModal';

interface Props {
  bookings: Booking[];
  serviceMen: ServiceMan[];
  onRefresh: () => void;
  onStartVideoCall?: (booking: Booking) => void;
  onSelectTab?: (tab: string) => void;
}

export const AdminBookingsManager: React.FC<Props> = ({
  bookings,
  serviceMen,
  onRefresh,
  onStartVideoCall,
  onSelectTab,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [reassignBooking, setReassignBooking] = useState<Booking | null>(null);
  const [selectedProId, setSelectedProId] = useState<string>('');
  const [viewingBillBooking, setViewingBillBooking] = useState<Booking | null>(null);
  const [viewingHistoryBooking, setViewingHistoryBooking] = useState<Booking | null>(null);
  const [upiPaymentBooking, setUpiPaymentBooking] = useState<Booking | null>(null);
  const [cashApprovalBooking, setCashApprovalBooking] = useState<Booking | null>(null);
  const [justPaidBookingId, setJustPaidBookingId] = useState<string | null>(null);

  // Spark Quota Optimization: Client-side pagination to render large lists efficiently
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const handleUpdateStatus = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status,
        updatedAt: new Date().toISOString(),
      });
      onRefresh();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleReassign = async () => {
    if (!reassignBooking || !selectedProId) return;
    const pro = serviceMen.find((p) => p.id === selectedProId);
    if (!pro) return;

    try {
      await updateDoc(doc(db, 'bookings', reassignBooking.id), {
        serviceManId: pro.id,
        serviceManName: pro.name,
        serviceManPhone: pro.phone,
        partnerId: pro.partnerId || '',
        updatedAt: new Date().toISOString(),
      });
      setReassignBooking(null);
      onRefresh();
    } catch (err) {
      console.error('Reassign failed:', err);
    }
  };

  const filtered = bookings.filter((b) => {
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch =
      !search ||
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      b.customerPhone.includes(search);
    return matchesStatus && matchesSearch;
  });

  // Spark Quota Optimization: Paginate filtered results
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleDownloadCSV = () => {
    if (filtered.length === 0) {
      alert('No bookings found matching current filters to export.');
      return;
    }

    const headers = [
      'Booking ID',
      'Created Timestamp',
      'Scheduled Date',
      'Scheduled Time',
      'Lifecycle Status',
      'Customer Name',
      'Customer Phone',
      'Service Name',
      'Category Name',
      'Assigned Technician',
      'Technician Phone',
      'Base Price (INR)',
      'GST Tax 18% (INR)',
      'Platform Fee 15% (INR)',
      'Total Amount (INR)',
      'Payment Status',
      'Payment Method',
      'Service Address',
      'City',
      'Pincode',
      'Cancellation Reason',
    ];

    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filtered.map((b) => {
      const basePrice = Math.round((b.amount || 0) / 1.18);
      const gst = Math.round((b.amount || 0) - basePrice);
      const platformFee = Math.round((b.amount || 0) * 0.15);

      return [
        escapeCSV(b.id),
        escapeCSV(b.createdAt || ''),
        escapeCSV(b.scheduledDate || ''),
        escapeCSV(b.scheduledTime || ''),
        escapeCSV(b.status.toUpperCase()),
        escapeCSV(b.customerName),
        escapeCSV(b.customerPhone),
        escapeCSV(b.serviceName),
        escapeCSV(b.categoryName),
        escapeCSV(b.serviceManName || 'Unassigned'),
        escapeCSV(b.serviceManPhone || 'N/A'),
        escapeCSV(basePrice),
        escapeCSV(gst),
        escapeCSV(platformFee),
        escapeCSV(b.amount || 0),
        escapeCSV(b.paymentStatus.toUpperCase()),
        escapeCSV(b.paymentMethod.toUpperCase()),
        escapeCSV(b.address),
        escapeCSV(b.city),
        escapeCSV(b.pincode),
        escapeCSV(b.cancellationReason || 'N/A'),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `HARDINKAAM_Financial_Audit_${filterStatus}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            All Platform Bookings ({bookings.length})
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Live dispatches, customer assignments, status overrides, and financial accounting
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-open-live-tracking-map"
            type="button"
            onClick={() => onSelectTab && onSelectTab('admin_live_tracking')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black transition-all shadow-md shadow-orange-900/20 cursor-pointer border border-amber-300 ring-2 ring-amber-400/40"
            title="सर्विसमैन लाइव लोकेशन व GPS ट्रैकिंग मैप"
          >
            <Navigation className="w-4 h-4 text-white animate-pulse" />
            <span>📡 सर्विसमैन लाइव ट्रैकिंग मैप</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
          </button>

          {/* Download Financial CSV Report Button */}
          <button
            id="btn-download-bookings-report"
            type="button"
            onClick={handleDownloadCSV}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md shadow-stone-900/20 cursor-pointer self-start sm:self-auto"
            title="Export bookings CSV for financial auditing"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download Report ({filtered.length})</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking ID, customer name, phone, or service..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white border border-stone-200 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 text-xs rounded-xl bg-white border border-stone-200 font-medium"
        >
          <option value="all">All Statuses ({bookings.length})</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="on_the_way">On The Way</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Booking</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Assigned Pro</th>
                <th className="py-3.5 px-4">Schedule</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    No bookings found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/50">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-stone-900 block">#{b.id}</span>
                      <span className="text-[11px] text-orange-600 font-semibold">{b.serviceName}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{b.customerName}</div>
                      <div className="text-stone-400 text-[11px]">{b.customerPhone}</div>
                      <div className="text-stone-500 text-[10px] truncate max-w-[150px]">{b.address}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-800">{b.serviceManName || 'Unassigned'}</div>
                      <div className="text-stone-400 text-[11px]">{b.serviceManPhone}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setReassignBooking(b);
                          setSelectedProId(b.serviceManId || '');
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline block mt-0.5"
                      >
                        Reassign Pro
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-stone-800 font-medium">{b.scheduledDate}</div>
                      <div className="text-stone-400 text-[10px]">{b.scheduledTime}</div>
                    </td>
                    <td className="py-3.5 px-4 relative">
                      {justPaidBookingId === b.id && (
                        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-lg animate-in zoom-in spin-in-12 duration-300 flex items-center justify-center z-10" title="Payment Verified & Marked as Paid!">
                          <CheckCircle2 className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      )}
                      {b.status === 'completed' ? (
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-stone-600 flex items-center justify-between gap-2">
                            <span className="text-stone-400">Service Charge:</span>
                            <span className="font-bold text-stone-800">
                              ₹{b.finalBill?.baseAmount ?? b.baseAmount ?? b.amount}
                            </span>
                          </div>
                          <div className="text-xs font-black text-stone-900 flex items-center justify-between gap-2">
                            <span className="text-stone-500 font-semibold">Total:</span>
                            <span>
                              ₹{b.finalBill?.finalAmount ?? b.finalAmount ?? b.amount}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <span className="text-[9px] text-stone-400 font-medium">Payment:</span>
                            <span
                              className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                                (b.finalBill?.paymentStatus || b.paymentStatus) === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : (b.finalBill?.paymentStatus || b.paymentStatus) === 'cod'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {b.finalBill?.paymentStatus || b.paymentStatus || 'unpaid'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-black text-stone-900">₹{b.amount}</div>
                          <span
                            className={`text-[9px] uppercase font-bold ${
                              b.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {b.paymentStatus}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Direct live tracking button for active dispatches */}
                        {['pending', 'accepted', 'on_the_way', 'in_progress', 'assigned', 'arrived'].includes(b.status) && (
                          <button
                            type="button"
                            onClick={() => onSelectTab && onSelectTab('admin_live_tracking')}
                            className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-black text-[11px] flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                            title="इस बुकिंग की सर्विसमैन लाइव GPS ट्रैकिंग देखें"
                          >
                            <Navigation className="w-3 h-3 animate-pulse" />
                            <span>लाइव ट्रैकिंग</span>
                          </button>
                        )}

                        {/* Phase 13: Admin view location tracking history */}
                        <button
                          type="button"
                          onClick={() => setViewingHistoryBooking(b)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer transition-colors"
                          title="लोकेशन ट्रैकिंग इतिहास देखें (View Location History)"
                        >
                          <Route className="w-3.5 h-3.5" />
                        </button>

                        {/* Cash Payment Verification & Approval Button */}
                        {b.cashPaymentStatus === 'pending_approval' && (
                          <button
                            type="button"
                            onClick={() => setCashApprovalBooking(b)}
                            className="px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                            title="नकद भुगतान सत्यापित व स्वीकृत करें"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>नकद अप्रूव</span>
                          </button>
                        )}

                        {/* Dynamic UPI QR Payment Verification Button */}
                        <button
                          type="button"
                          onClick={() => setUpiPaymentBooking(b)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                            b.paymentStatus === 'paid'
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                          }`}
                          title="Generate Dynamic UPI QR Code & Confirm Payment"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{b.paymentStatus === 'paid' ? 'Paid ✓' : 'UPI QR'}</span>
                        </button>

                        {/* WhatsApp Video Call & Room Launcher */}
                        <a
                          href={generateWhatsAppVideoCallUrl({
                            phone: b.customerPhone,
                            recipientName: b.customerName,
                            roomCode: 'DBC-' + b.id.slice(-6).toUpperCase(),
                            meetingUrl: `${window.location.origin}/#call-DBC-${b.id.slice(-6).toUpperCase()}`,
                            hostName: 'दीपक बिल्डकॉन एडमिन',
                            purpose: `${b.serviceName} के लिए लाइव वीडियो सहायता`,
                            bookingId: b.id,
                          })}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            if (onStartVideoCall) onStartVideoCall(b);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-pointer transition-colors"
                          title="WhatsApp पर वीडियो कॉल आमंत्रण भेजें व रूम खोलें"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20" />
                        </a>

                        {onStartVideoCall && (
                          <button
                            type="button"
                            onClick={() => onStartVideoCall(b)}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer transition-colors"
                            title="ग्राहक के साथ लाइव वीडियो निरीक्षण (Live Video Inspection)"
                          >
                            <Video className="w-3.5 h-3.5 text-teal-600" />
                          </button>
                        )}
                        <select
                          value={b.status}
                          onChange={(e) => handleUpdateStatus(b.id, e.target.value as BookingStatus)}
                          className="p-1 text-[11px] rounded-lg border border-stone-200 bg-stone-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="accepted">Accepted</option>
                          <option value="on_the_way">On The Way</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Spark Quota Optimization: Pagination Bar */}
        {filtered.length > 0 && (
          <div className="px-6 py-4 bg-stone-50/80 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <span>Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length} bookings</span>
              <span className="text-stone-300">|</span>
              <label className="flex items-center gap-1">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-stone-200 rounded-md px-1.5 py-0.5 text-xs text-stone-700"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-stone-700 px-2">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reassign Modal */}
      {reassignBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-stone-200">
            <h3 className="font-bold text-base text-stone-900 mb-1">Reassign Booking #{reassignBooking.id}</h3>
            <p className="text-xs text-stone-500 mb-4">
              Select technician to take over <strong>{reassignBooking.serviceName}</strong>:
            </p>

            <div className="space-y-3">
              <select
                value={selectedProId}
                onChange={(e) => setSelectedProId(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200"
              >
                <option value="">Select Technician</option>
                {serviceMen.map((pro) => (
                  <option key={pro.id} value={pro.id}>
                    {pro.name} ({pro.categoryNames.join(', ')}) • {pro.rating}★
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignBooking(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReassign}
                  disabled={!selectedProId}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Confirm Reassign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hardinkaam Service Bill Modal for Admin */}
      {viewingBillBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-2xl w-full my-8 relative">
            <button
              onClick={() => setViewingBillBooking(null)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800"
              title="Close Bill"
            >
              <X className="w-4 h-4" />
            </button>
            <HardinkaamServiceBill
              bill={viewingBillBooking.finalBill}
              booking={viewingBillBooking}
            />
          </div>
        </div>
      )}

      {/* Phase 13: Admin Booking Tracking History Modal */}
      <AdminBookingTrackingHistoryModal
        booking={viewingHistoryBooking}
        isOpen={!!viewingHistoryBooking}
        onClose={() => setViewingHistoryBooking(null)}
      />

      {/* Dynamic UPI QR Payment Modal */}
      <AdminBookingUpiPaymentModal
        booking={upiPaymentBooking}
        isOpen={!!upiPaymentBooking}
        onClose={() => setUpiPaymentBooking(null)}
        onSuccess={(id) => {
          setJustPaidBookingId(id);
          setTimeout(() => setJustPaidBookingId(null), 3500);
          onRefresh();
        }}
      />

      {/* Admin Cash Transaction Modal */}
      {cashApprovalBooking && (
        <AdminCashTransactionModal
          booking={cashApprovalBooking}
          isOpen={Boolean(cashApprovalBooking)}
          onClose={() => setCashApprovalBooking(null)}
          onSuccess={() => {
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
