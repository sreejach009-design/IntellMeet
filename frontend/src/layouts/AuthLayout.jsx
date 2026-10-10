import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Video, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import Toast from '../components/common/Toast';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-[#0b0f19] flex">
      {/* Left Form Panel */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Video className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight flex items-center gap-1.5">
              IntellMeet
              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-md uppercase">
                AI
              </span>
            </span>
          </Link>

          <Outlet />
        </div>

        <div className="pt-8 text-center text-xs text-slate-500 border-t border-slate-800/60 mt-12">
          &copy; {new Date().getFullYear()} IntellMeet Inc. Enterprise Collaboration & Meeting Intelligence.
        </div>
      </div>

      {/* Right Brand Showcase Panel */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#1e1b4b] border-l border-slate-800 p-16 items-center justify-center overflow-hidden">
        {/* Glow circles */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-lg space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            Autonomous Meeting Intelligence
          </div>

          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Elevate every conversation into actionable enterprise outcomes.
          </h2>

          <div className="space-y-4 text-slate-300 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Crystal-clear WebRTC video conferencing with low latency mesh signaling.</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <span>OpenAI transcript intelligence extracting executive summaries & explicit decisions.</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <span>Automated action-item tracking with assignees, due dates, and workspaces.</span>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <span>Enterprise role-based permissions and secure credential tokenization.</span>
            </div>
          </div>
        </div>
      </div>

      <Toast />
    </div>
  );
};

export default AuthLayout;
