import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  TrendingUp,
  Award,
  Star,
  CheckCircle2,
  Shield,
  Fuel,
  RefreshCw,
  Trophy,
  Medal,
  Flame
} from 'lucide-react';

const DriverPerformance = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/performance/leaderboard');
      setLeaderboard(res.data);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold flex items-center justify-center text-sm shadow-lg shadow-amber-500/20">
          🥇 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-8 h-8 rounded-xl bg-slate-300/20 border border-slate-300/40 text-slate-200 font-bold flex items-center justify-center text-sm">
          🥈 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-8 h-8 rounded-xl bg-amber-700/20 border border-amber-700/40 text-amber-500 font-bold flex items-center justify-center text-sm">
          🥉 3
        </span>
      );
    }
    return (
      <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-sm">
        #{rank}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
            <TrendingUp className="w-3.5 h-3.5" /> Safety & Compliance Leaderboard
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" /> Driver Performance Scorecards & Ranking
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Multi-factor scoring algorithm evaluating on-time deliveries (40%), road safety (30%), and eco fuel efficiency (30%).
          </p>
        </div>

        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Leaderboard
        </button>
      </div>

      {/* Leaderboard Cards */}
      <div className="space-y-4">
        {leaderboard.map((d) => (
          <div
            key={d.driver_id}
            className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition-all ${
              d.rank === 1
                ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/5 via-slate-900 to-slate-900'
                : 'border-slate-800'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Driver Identity */}
              <div className="flex items-center gap-4">
                {getRankBadge(d.rank)}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{d.full_name}</h3>
                    <span className="text-xs text-amber-400 font-semibold flex items-center gap-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> {d.rating}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {d.tier}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {d.license_number} • {d.total_trips} Deliveries Completed • {d.experience_years} Years Experience
                  </div>
                </div>
              </div>

              {/* Performance Score Pillar */}
              <div className="flex items-center gap-6 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 self-start md:self-auto">
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">AI Composite</div>
                  <div className="text-2xl font-black text-white">{d.composite_score}</div>
                  <div className="text-[10px] font-bold text-blue-400">Grade {d.grade}</div>
                </div>

                <div className="h-8 w-px bg-slate-800"></div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> On-Time:
                    </span>
                    <span className="font-bold text-emerald-400">{d.on_time_rate_pct}%</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-blue-400" /> Safety:
                    </span>
                    <span className="font-bold text-blue-400">{d.safety_score}%</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-amber-400" /> Eco Fuel:
                    </span>
                    <span className="font-bold text-amber-400">{d.fuel_efficiency_score}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DriverPerformance;
