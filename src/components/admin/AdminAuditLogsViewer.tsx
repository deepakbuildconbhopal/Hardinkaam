import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Building2,
  FileArchive,
  UserCheck,
  Sliders,
  Download,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { AuditLogEntry, subscribeAuditLogs } from '../../services/auditService';

export const AdminAuditLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = subscribeAuditLogs((fetchedLogs) => {
      setLogs(fetchedLogs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        log.action.toLowerCase().includes(q) ||
        log.actorEmail?.toLowerCase().includes(q) ||
        log.targetDistrictName?.toLowerCase().includes(q) ||
        log.targetDistrictId?.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'DISTRICT_ACTIVATION':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">🏢 जिला सक्रियण</span>;
      case 'DISTRICT_ZIP_IMPORT':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-100 text-orange-800">📦 ZIP एसेट आयात</span>;
      case 'FRANCHISE_PARTNER_CREATE':
      case 'FRANCHISE_PARTNER_ASSIGN':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">👤 पार्टनर असाइन</span>;
      case 'FRANCHISE_PARTNER_STATUS_CHANGE':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">🔄 स्थिति परिवर्तन</span>;
      case 'DISTRICT_SETTINGS_CHANGE':
      case 'DISTRICT_SETTINGS_UPDATE':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">⚙️ सेटिंग्स बदलाव</span>;
      case 'REPORT_DOWNLOAD':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-100 text-teal-800">📊 रिपोर्ट डाउनलोड</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-stone-100 text-stone-800">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>प्रशासनिक सुरक्षा ऑडिट ट्रेल (Security Audit Trail)</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black">
              लाइव एडमिनिस्ट्रेटिव ऑडिट लॉग्स
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
              जिला सक्रियण, ZIP एसेट इम्पोर्ट, पार्टनर असाइनमेंट, सेटिंग्स परिवर्तन व रिपोर्ट डाउनलोड्स का 100% अपरिवर्तनीय रिकॉर्ड।
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/20 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>शून्य क्रेडेंशियल लीकेज: पासवर्ड व सीक्रेट्स स्वत: एन्क्रिप्टेड/रेडैक्टेड</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
          >
            <option value="all">सभी क्रियाएं (All Actions)</option>
            <option value="DISTRICT_ACTIVATION">🏢 जिला सक्रियण (District Activation)</option>
            <option value="DISTRICT_ZIP_IMPORT">📦 ZIP एसेट आयात (ZIP Import)</option>
            <option value="FRANCHISE_PARTNER_ASSIGN">👤 पार्टनर असाइन (Partner Assign)</option>
            <option value="FRANCHISE_PARTNER_CREATE">➕ नया पार्टनर (Partner Create)</option>
            <option value="DISTRICT_SETTINGS_CHANGE">⚙️ सेटिंग्स बदलाव (Settings Change)</option>
            <option value="REPORT_DOWNLOAD">📊 रिपोर्ट डाउनलोड (Report Download)</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ईमेल, जिला, एक्शन खोजें..."
              className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold"
            />
          </div>
        </div>

        <div className="text-xs font-bold text-stone-500">
          कुल ऑडिट रिकॉर्ड: {filteredLogs.length}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-100/80 text-stone-600 font-bold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">समय (Timestamp)</th>
                <th className="py-3 px-4">क्रिया (Action)</th>
                <th className="py-3 px-4">प्रशासक (Actor)</th>
                <th className="py-3 px-4">लक्षित जिला/पार्टनर</th>
                <th className="py-3 px-4">विवरण (Audit Details)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-stone-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                    <span>ऑडिट रिकॉर्ड लोड हो रहे हैं...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-stone-400 font-medium">
                    कोई ऑडिट लॉग उपलब्ध नहीं है।
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 text-stone-500 whitespace-nowrap font-mono text-[11px]">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('hi-IN') : 'N/A'}
                    </td>
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{log.actorEmail}</div>
                      <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                        {log.actorRole || 'admin'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {log.targetDistrictName || log.targetDistrictId || log.targetPartnerId || log.target || '—'}
                    </td>
                    <td className="py-3 px-4 text-stone-700 max-w-md">
                      <div>{log.details}</div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-1 font-mono text-[10px] text-stone-500 bg-stone-100 p-1 rounded-md overflow-x-auto">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
