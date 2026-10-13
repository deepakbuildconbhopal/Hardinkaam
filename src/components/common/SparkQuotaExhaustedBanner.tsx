import React, { useEffect, useState } from 'react';
import { ShieldAlert, ExternalLink, X, Database, CheckCircle2 } from 'lucide-react';
import {
  isResourceExhausted,
  subscribeQuotaExhaustion,
  FIRESTORE_CONSOLE_UPGRADE_URL,
} from '../../utils/sparkQuotaGuard';

export const SparkQuotaExhaustedBanner: React.FC = () => {
  const [exhausted, setExhausted] = useState(isResourceExhausted());
  const [message, setMessage] = useState(
    'Free daily read limit (50,000 read units/day) has been reached on this database.'
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    return subscribeQuotaExhaustion((isExh, msg) => {
      setExhausted(isExh);
      if (msg) setMessage(msg);
      if (isExh) setDismissed(false); // un-dismiss if new exhaustion occurs
    });
  }, []);

  if (!exhausted || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <aside
      role="region"
      aria-label="Firestore Daily Quota Exceeded Notice"
      className="w-full z-50 bg-amber-950 text-amber-100 border-b border-amber-800 px-4 py-3 shadow-xl"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-900 rounded-xl text-amber-200 border border-amber-700 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5 text-amber-300" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-amber-200 uppercase tracking-wide text-xs bg-amber-900/90 px-2.5 py-0.5 rounded border border-amber-700">
                Firestore Free Tier Daily Read Quota Reached
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Production Data Secure & Intact
              </span>
              <span className="text-xs text-amber-300/80">• Cached Catalogue Active</span>
            </div>
            <p className="text-xs text-amber-100 leading-relaxed max-w-4xl">
              {message} Google Cloud Firebase server quotas reset daily at midnight Pacific Time. Local browser actions cannot clear cloud server limits.
              If you require uninterrupted higher throughput, upgrade the database plan in the Firebase Console.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <a
            href={FIRESTORE_CONSOLE_UPGRADE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-800 hover:bg-amber-700 text-amber-100 rounded-lg transition border border-amber-600 shadow-sm"
            title="Open Firebase Console to view quota or upgrade plan"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Firebase Console Upgrade</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-amber-900 rounded-lg text-amber-300 hover:text-amber-100 transition cursor-pointer"
            aria-label="Dismiss banner and view cached catalogue"
            title="Dismiss notice and view cached catalogue"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
