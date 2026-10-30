import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Video,
  Sparkles,
  Shield,
  Zap,
  Users,
  CheckCircle2,
  ArrowRight,
  Monitor,
  MessageSquare,
  Lock,
  Calendar,
  ChevronDown,
  LogIn,
} from 'lucide-react';
import Button from '../components/common/Button';

const LandingPage = () => {
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();
  const features = [
    {
      icon: Video,
      title: 'Ultra-Low Latency Mesh Video',
      description:
        'Direct peer-to-peer WebRTC connections with dynamic camera, microphone track management and adaptive bitrate audio.',
      color: 'from-indigo-600 to-indigo-400',
    },
    {
      icon: Sparkles,
      title: 'OpenAI Meeting Intelligence',
      description:
        'Autonomous analysis of dialogue transcripts to extract executive summaries, key discussion topics, and explicit decisions.',
      color: 'from-purple-600 to-purple-400',
    },
    {
      icon: CheckCircle2,
      title: 'Automated Action-Item Tracking',
      description:
        'Tasks with detected owners and target dates automatically populated into workspace kanbans with direct status updates.',
      color: 'from-emerald-600 to-emerald-400',
    },
    {
      icon: Users,
      title: 'Collaborative Workspaces',
      description:
        'Organize remote departments, project pods, and stakeholders with role-based permissions and shared meeting histories.',
      color: 'from-sky-600 to-sky-400',
    },
    {
      icon: MessageSquare,
      title: 'In-Meeting Real-Time Chat',
      description:
        'Socket.io real-time chat with persistent MongoDB storage, system event logging, and multi-participant notifications.',
      color: 'from-amber-600 to-amber-400',
    },
    {
      icon: Shield,
      title: 'Enterprise RBAC & Security',
      description:
        'Protected by JWT tokens, bcrypt hash validation, helmet security headers, and granular endpoint rate limiting.',
      color: 'from-rose-600 to-rose-400',
    },
  ];

  const faqs = [
    {
      q: 'How does IntellMeet handle video conferencing and signaling?',
      a: 'IntellMeet uses native browser WebRTC for high-definition, low-latency audio/video media transmission and Socket.io for out-of-band signaling (SDP offer/answer exchange, ICE candidates, and room state).',
    },
    {
      q: 'How does AI meeting intelligence work?',
      a: 'Meeting transcripts are analyzed by backend services using OpenAI models (with fallback heuristic processing when no key is supplied) to generate concise summaries, decisions, and structured action items without inventing false details.',
    },
    {
      q: 'Can I invite teammates to custom workspaces?',
      a: 'Yes. Workspace owners and managers can add teammates by email, assign workspace roles (owner, manager, member), and associate meetings and action items directly to workspaces.',
    },
    {
      q: 'Can I test IntellMeet without external credentials?',
      a: 'Yes! The entire application runs out of the box with local MongoDB. For OpenAI features, an intelligent deterministic heuristic engine operates if OPENAI_API_KEY is not configured.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#0b0f19]/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between max-w-7xl w-full mx-auto">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Video className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight flex items-center gap-1.5">
            IntellMeet
            <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.2 rounded uppercase">
              AI
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm">
              Get Started Free
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-6 text-center max-w-5xl mx-auto overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-6">
          <Sparkles className="w-4 h-4" /> Next-Gen Enterprise Collaboration
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
          Where conversations instantly become{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            executable decisions.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 mt-6 max-w-3xl mx-auto leading-relaxed font-normal">
          The platform provides real-time video conferencing, live chat, screen sharing, AI-generated meeting summaries, automatic transcription, smart action item extraction, and collaborative team workspaces within a secure and scalable environment.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-9">
          <Link to="/register" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full shadow-xl shadow-indigo-600/30" icon={ArrowRight}>
              Start Free Trial
            </Button>
          </Link>
          <Link to="/login" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full">
              Sign In to Workspace
            </Button>
          </Link>
        </div>

        {/* Quick Join by Meeting Code Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (joinCode.trim()) navigate(`/room/${joinCode.trim()}`);
          }}
          className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto"
        >
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Have a meeting code? (e.g. MTG-123-456)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="md"
            className="w-full sm:w-auto shrink-0 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/20"
            icon={LogIn}
          >
            Join Meeting
          </Button>
        </form>

        {/* Product Preview Card */}
        <div className="mt-16 p-2 rounded-2xl bg-gradient-to-b from-indigo-500/20 to-transparent border border-slate-800 shadow-2xl">
          <div className="rounded-xl bg-[#111827] p-5 sm:p-8 border border-slate-800 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">
                  Sprint Alignment & Architecture Review &bull; Room active
                </span>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                Live WebRTC
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2">
                  <Sparkles className="w-4 h-4" /> AI Summary
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  "Team finalized the WebRTC STUN/TURN fallback matrix and approved rate limiting configuration for authentication endpoints."
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Extracted Action Items
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Deploy STUN configuration (Sarah)</li>
                  <li>Submit security headers PR (David)</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold mb-2">
                  <Users className="w-4 h-4" /> Team Presence
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>&bull; 4 participants active</p>
                  <p>&bull; End-to-end media encrypted</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 px-6 bg-slate-950/60 border-t border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Enterprise Collaboration Engineering
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Architected for high reliability, granular access control, and seamless remote teamwork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-1"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${f.color} flex items-center justify-center text-white mb-4 shadow-lg`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security & Reliability Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-left">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#111827] to-[#1e1b4b] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-md">
            <div className="inline-flex items-center gap-2 text-sky-400 text-xs font-semibold">
              <Lock className="w-4 h-4" /> Enterprise Security
            </div>
            <h3 className="text-2xl font-bold text-white">
              Built with security and privacy by design
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Passwords hashed with bcrypt, JWT token verification on all protected endpoints, Helmet HTTP security headers, CORS origin protection, and strict data isolation per workspace.
            </p>
          </div>

          <div className="shrink-0">
            <Link to="/register">
              <Button variant="primary" size="lg" icon={ArrowRight}>
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 max-w-4xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#111827] border border-slate-800/80"
            >
              <h4 className="text-sm font-semibold text-white">{faq.q}</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-10 px-6 bg-[#0b0f19]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-300">IntellMeet Platform</span>
            <span>&bull; &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-300">Sign In</Link>
            <Link to="/register" className="hover:text-slate-300">Register</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-300">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
