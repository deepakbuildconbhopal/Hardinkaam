import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { workAndJobsService } from '../../services/workAndJobsService';
import { SocialNetworkConfig } from '../../types/workAndJobs';

export const AdminSocialNetworksManager: React.FC = () => {
  const { addToast } = useToast();
  const [networks, setNetworks] = useState<SocialNetworkConfig[]>([]);

  useEffect(() => {
    loadNetworks();
  }, []);

  const loadNetworks = async () => {
    try {
      const all = await workAndJobsService.getSocialNetworks();
      setNetworks(all);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggle = async (net: SocialNetworkConfig) => {
    try {
      await workAndJobsService.updateSocialNetwork(net.id, { enabled: !net.enabled });
      addToast(`Updated social network status`, 'success');
      loadNetworks();
    } catch (e) {
      addToast('Failed to update', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-stone-900">Social Networks Connection Center</h2>
        <p className="text-stone-500 text-sm">Configure and monitor social channels for job postings and marketing campaigns.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {networks.map((net) => (
          <div key={net.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex items-center justify-between">
            <div>
              <span className="bg-stone-100 text-stone-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                {net.platform}
              </span>
              <h3 className="font-bold text-stone-900 text-lg mt-3">{net.accountName}</h3>
              <a href={net.pageUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                {net.pageUrl}
              </a>
              <span className={`inline-block mt-3 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                net.connectedStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {net.connectedStatus}
              </span>
            </div>
            <div>
              <button
                onClick={() => handleToggle(net)}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow transition ${
                  net.enabled ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {net.enabled ? 'Disable ✕' : 'Enable ✓'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
