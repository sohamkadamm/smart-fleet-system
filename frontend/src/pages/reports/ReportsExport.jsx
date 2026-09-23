import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  FileText,
  Truck,
  UserCheck,
  MapPin,
  Fuel,
  Wrench,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

const ReportsExport = () => {
  const [reports, setReports] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const reportIcons = {
    vehicles: Truck,
    drivers: UserCheck,
    trips: MapPin,
    fuel: Fuel,
    maintenance: Wrench,
    executive_monthly: TrendingUp,
  };

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await apiClient.get('/reports/summary');
        setReports(res.data.available_reports);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSummary();
  }, []);

  const handleDownloadCSV = async (reportId, title) => {
    setDownloadingId(reportId);
    setSuccessMsg(null);
    try {
      const response = await apiClient.get(`/reports/export/csv`, {
        params: { report_type: reportId },
        responseType: 'blob',
      });

      // Trigger browser file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smart_fleet_${reportId}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg(`Successfully generated and downloaded ${title}.`);
    } catch (err) {
      console.error('Failed to download report', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
          <FileSpreadsheet className="w-3.5 h-3.5" /> Compliance & Operational Export
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Reports & Data Export Center</h1>
        <p className="text-sm text-slate-400 mt-1">
          Generate, audit, and download comprehensive CSV/JSON data reports across all operational fleet modules.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Reports Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((r) => {
          const Icon = reportIcons[r.id] || FileText;
          const isDownloading = downloadingId === r.id;

          return (
            <div
              key={r.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {r.format}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1.5">{r.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-emerald-400 font-medium">✓ Ready for Export</span>

                <button
                  onClick={() => handleDownloadCSV(r.id, r.title)}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloading ? 'Generating...' : 'Download CSV'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsExport;
