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
  Flame,
  Lightbulb,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck
} from 'lucide-react';

const DriverPerformance = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDriverId, setExpandedDriverId] = useState(null);

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
        <span className="w-9 h-9 rounded-xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-bold flex items-center justify-center text-sm shadow-lg shadow-amber-500/30">
          🥇 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-9 h-9 rounded-xl bg-slate-300/20 border-2 border-slate-300 text-slate-200 font-bold flex items-center justify-center text-sm">
          🥈 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-9 h-9 rounded-xl bg-amber-700/20 border-2 border-amber-600 text-amber-400 font-bold flex items-center justify-center text-sm">
          🥉 3
        </span>
      );
    }
    return (
      <span className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-xs">
        #{rank}
      </span>
    );
  };

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
            <TrendingUp className="w-3.5 h-3.5" /> Safety & Compliance Analytics
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" /> Driver Performance Scorecards & Ranking
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            4-Factor Academic Performance Model: On-Time SLA (35%), Telematics Safety (25%), Eco Fuel (25%), and Experience (15%).
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

      {/* Top 3 Podium Showcase */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
          {/* 2nd Place (Silver) */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 shadow-xl text-center space-y-3 order-2 md:order-1 relative overflow-hidden">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-300/10 border-2 border-slate-300 flex items-center justify-center text-xl shadow-lg">
              🥈
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">2nd Place • Rank #2</span>
              <h3 className="text-base font-bold text-white mt-0.5">{top3[1].full_name}</h3>
              <span className="text-[11px] font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 inline-block mt-1">
                {top3[1].badge}
              </span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Composite Rating</span>
              <span className="text-2xl font-black text-slate-200">{top3[1].composite_score}</span>
              <span className="text-xs text-slate-400 block mt-0.5">Grade {top3[1].grade}</span>
            </div>
          </div>

          {/* 1st Place (Gold - Elevated) */}
          <div className="bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-900 border-2 border-amber-400/60 rounded-2xl p-6 shadow-2xl text-center space-y-3 order-1 md:order-2 relative overflow-hidden md:-translate-y-2 ring-4 ring-amber-400/10">
            <div className="absolute top-2 right-3 flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
              <Sparkles className="w-3 h-3" /> Fleet Champion
            </div>
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/30 animate-pulse">
              🥇
            </div>
            <div>
              <span className="text-xs text-amber-400 font-mono font-bold">1st Place • Fleet Lead</span>
              <h3 className="text-lg font-black text-white mt-0.5">{top3[0].full_name}</h3>
              <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40 inline-block mt-1">
                {top3[0].badge}
              </span>
            </div>
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-amber-400/30">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Composite Rating</span>
              <span className="text-3xl font-black text-amber-300">{top3[0].composite_score}</span>
              <span className="text-xs font-bold text-emerald-400 block mt-0.5">Grade {top3[0].grade} • Top 1%</span>
            </div>
          </div>

          {/* 3rd Place (Bronze) */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 shadow-xl text-center space-y-3 order-3 md:order-3 relative overflow-hidden">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-700/10 border-2 border-amber-600 flex items-center justify-center text-xl shadow-lg">
              🥉
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">3rd Place • Rank #3</span>
              <h3 className="text-base font-bold text-white mt-0.5">{top3[2].full_name}</h3>
              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 inline-block mt-1">
                {top3[2].badge}
              </span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Composite Rating</span>
              <span className="text-2xl font-black text-amber-500">{top3[2].composite_score}</span>
              <span className="text-xs text-slate-400 block mt-0.5">Grade {top3[2].grade}</span>
            </div>
          </div>
        </div>
      )}

      {/* Complete Leaderboard Cards with Multi-Metric Breakdown */}
      <div className="space-y-4">
        {leaderboard.map((d) => {
          const isExpanded = expandedDriverId === d.driver_id;
          return (
            <div
              key={d.driver_id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition-all space-y-4 ${
                d.rank === 1
                  ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/5 via-slate-900 to-slate-900'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Driver Identity */}
                <div className="flex items-center gap-4">
                  {getRankBadge(d.rank)}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white">{d.full_name}</h3>
                      <span className="text-xs text-amber-400 font-semibold flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400" /> {d.rating}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {d.tier}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {d.badge}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {d.license_number} • {d.total_trips} Deliveries Completed • {d.experience_years} Years Heavy Vehicle Experience
                    </div>
                  </div>
                </div>

                {/* Performance Pillars */}
                <div className="flex items-center gap-6 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 self-start lg:self-auto">
                  <div className="text-center min-w-[70px]">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Composite</div>
                    <div className="text-2xl font-black text-white">{d.composite_score}</div>
                    <div className="text-[10px] font-bold text-blue-400">Grade {d.grade}</div>
                  </div>

                  <div className="h-8 w-px bg-slate-800"></div>

                  <div className="grid grid-cols-3 gap-4 text-xs text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">On-Time (35%)</span>
                      <span className="font-bold text-emerald-400">{d.on_time_rate_pct}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Safety (25%)</span>
                      <span className="font-bold text-blue-400">{d.safety_score}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Eco Fuel (25%)</span>
                      <span className="font-bold text-amber-400">{d.fuel_efficiency_score}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedDriverId(isExpanded ? null : d.driver_id)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title={isExpanded ? 'Collapse details' : 'View coaching scorecard'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expandable Actionable Coaching & Strengths Card */}
              {isExpanded && (
                <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in duration-300">
                  {/* Actionable Coaching Tips */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-amber-500/20 space-y-2">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-400" /> Actionable Driving Coaching
                    </span>
                    {d.coaching_tips?.map((tip, i) => (
                      <p key={i} className="text-slate-300 leading-relaxed pl-2 border-l-2 border-amber-400/40">
                        {tip}
                      </p>
                    ))}
                  </div>

                  {/* Identified Strengths */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-500/20 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-400" /> Evaluated Core Strengths
                    </span>
                    {d.strengths && d.strengths.length > 0 ? (
                      d.strengths.map((st, i) => (
                        <p key={i} className="text-slate-300 leading-relaxed pl-2 border-l-2 border-emerald-400/40">
                          {st}
                        </p>
                      ))
                    ) : (
                      <p className="text-slate-400 leading-relaxed">
                        Consistent participation across regional delivery dispatches.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DriverPerformance;
