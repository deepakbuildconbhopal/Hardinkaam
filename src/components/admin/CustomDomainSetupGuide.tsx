import React, { useState } from 'react';
import {
  Globe,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Server,
  KeyRound,
  ArrowRight,
  Info,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface Props {
  className?: string;
}

export const CustomDomainSetupGuide: React.FC<Props> = ({ className = '' }) => {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const domain = 'edusuper.in';
  const projectId = 'hardinkaam-5cc6a';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const dnsRecords = [
    {
      type: 'A Record (Root Domain)',
      host: '@ (या edusuper.in)',
      value: '199.36.158.100',
      purpose: 'Firebase Hosting Primary IP',
    },
    {
      type: 'A Record (Root Domain 2)',
      host: '@ (या edusuper.in)',
      value: '199.36.158.100',
      purpose: 'Firebase Hosting Redundant IP',
    },
    {
      type: 'CNAME Record (Subdomain)',
      host: 'www',
      value: 'hardinkaam-5cc6a.web.app.',
      purpose: 'WWW to Root Forwarding',
    },
  ];

  return (
    <div className={`bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-orange-100 text-orange-600 flex-shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-stone-900 tracking-tight">
                कस्टम डोमेन सेटअप: <span className="text-orange-600">{domain}</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                DNS गाइड
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              अपने डोमेन प्रदाता (GoDaddy, Hostinger, Namecheap, Cloudflare) में DNS रिकॉर्ड्स जोड़ें।
            </p>
          </div>
        </div>

        <a
          href={`https://console.firebase.google.com/project/${projectId}/hosting/sites`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <span>Firebase Hosting Console</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 3 Simple Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
          <div className="w-6 h-6 rounded-full bg-stone-900 text-white text-xs font-black flex items-center justify-center mb-2">
            1
          </div>
          <h3 className="text-xs font-bold text-stone-900 mb-1">Firebase में डोमेन जोड़ें</h3>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            Firebase Console में जाएं $\rightarrow$ <strong>Hosting</strong> पर क्लिक करें $\rightarrow$ <strong>Add custom domain</strong> दबाकर <code>{domain}</code> और <code>www.{domain}</code> दर्ज करें।
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
          <div className="w-6 h-6 rounded-full bg-stone-900 text-white text-xs font-black flex items-center justify-center mb-2">
            2
          </div>
          <h3 className="text-xs font-bold text-stone-900 mb-1">DNS रिकॉर्ड्स अपडेट करें</h3>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            GoDaddy / Hostinger के DNS Management में जाकर नीचे दिए गए <strong>A Records</strong> और <strong>CNAME Record</strong> सेव करें।
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
          <div className="w-6 h-6 rounded-full bg-stone-900 text-white text-xs font-black flex items-center justify-center mb-2">
            3
          </div>
          <h3 className="text-xs font-bold text-stone-900 mb-1">SSL सर्टिफिकेट व ऑथ</h3>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            Google 1–2 घंटे में मुफ्त SSL जारी करेगा। साथ ही Firebase Auth के <strong>Authorized Domains</strong> में <code>{domain}</code> स्वतः जुड़ जाएगा।
          </p>
        </div>
      </div>

      {/* DNS Configuration Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-stone-500" />
            <span>DNS Management में दर्ज करने हेतु रिकॉर्ड्स (Required DNS Records)</span>
          </h3>
          <span className="text-[11px] text-stone-400">TTL: Automatic / 3600</span>
        </div>

        <div className="overflow-x-auto border border-stone-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Host / Name</th>
                <th className="py-2.5 px-3">Value / Points to</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
              {dnsRecords.map((rec, i) => {
                const id = `rec_${i}`;
                const isCopied = copiedIndex === id;
                return (
                  <tr key={i} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-bold text-stone-800">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700">
                        {rec.type.split(' ')[0]}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-stone-700 font-semibold">{rec.host}</td>
                    <td className="py-2.5 px-3 text-stone-900 font-bold break-all">{rec.value}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(rec.value, id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-sans font-semibold transition-colors cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-stone-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Firebase Auth Whitelist Note */}
      <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start gap-3">
        <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 space-y-1">
          <p className="font-bold">महत्वपूर्ण: Firebase Authentication Authorized Domains</p>
          <p className="text-[11px] text-amber-900/90 leading-relaxed">
            जब आप <code>{domain}</code> को कनेक्ट कर लें, तो सुनिश्चित करें कि Firebase Console $\rightarrow$ <strong>Authentication</strong> $\rightarrow$ <strong>Settings</strong> $\rightarrow$ <strong>Authorized Domains</strong> में <code>{domain}</code> और <code>www.{domain}</code> लिस्टेड हों, ताकि Google Sign-in और Phone OTP लॉगिन ठीक से काम करें।
          </p>
        </div>
      </div>

      {/* Google AdSense Status Note */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-950 space-y-1">
          <p className="font-bold">Google AdSense सक्रियता (Publisher: ca-pub-6427755582290432)</p>
          <p className="text-[11px] text-emerald-900 leading-relaxed">
            AdSense कोड व <code>ads.txt</code> को आपके पब्लिशर ID <code>ca-pub-6427755582290432</code> के साथ जोड़ दिया गया है। जैसे ही आपका डोमेन <code>{domain}</code> लाइव होगा, Google AdSense आपके डोमेन को सत्यापित कर विज्ञापन प्रदर्शित करना शुरू कर देगा।
          </p>
        </div>
      </div>

      {/* Live Check Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
        <div className="flex items-center gap-2 text-stone-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>सफल DNS प्रोपेगेशन के बाद आपका ऐप <strong>https://{domain}</strong> पर लाइव लोड होगा।</span>
        </div>
        <a
          href={`https://dnschecker.org/#A/${domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold"
        >
          <span>DNS प्रोपेगेशन चेक करें (DNSChecker.org)</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
