import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Recycle, Search, TrendingUp, CheckCircle, Cpu } from 'lucide-react';
import { useAuthStore } from '../store';
import { statsApi } from '../api';

const STEPS = [
  {
    n: '01',
    title: 'Discover',
    desc: 'Search campus resources using natural language. AI understands what you need — not just keywords.',
    icon: <Search size={18} />,
  },
  {
    n: '02',
    title: 'Borrow',
    desc: 'Request a resource from its owner. Approve, schedule pickup, and verify with a QR code.',
    icon: <Recycle size={18} />,
  },
  {
    n: '03',
    title: 'Return',
    desc: 'Return on time. Scan QR to confirm. Build reputation and earn trust within the campus network.',
    icon: <CheckCircle size={18} />,
  },
  {
    n: '04',
    title: 'Impact',
    desc: 'Track money saved, CO₂ avoided, and purchases eliminated. Campus sustainability in action.',
    icon: <TrendingUp size={18} />,
  },
];

const EXAMPLES = [
  {
    query: '"I need a Wi-Fi microcontroller for an IoT project for 10 days"',
    results: ['ESP32 DevKit — 97% match', 'NodeMCU — 91%', 'Raspberry Pi Pico W — 84%'],
  },
  {
    query: '"Find sensors for smart agriculture project"',
    results: ['Soil Moisture Sensor — 95%', 'DHT22 Temperature — 91%', 'ESP32 — 88%'],
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const { data: statsData } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => statsApi.platform().then((r) => r.data),
    staleTime: 60000,
  });

  const stats = [
    {
      value: statsData?.total_resources != null ? `${statsData.total_resources}` : '—',
      label: 'Resources listed'
    },
    {
      value: statsData?.completed_loans != null ? `${statsData.completed_loans}` : '—',
      label: 'Loans completed'
    },
    {
      value: statsData?.total_savings_inr != null ? `₹${Number(statsData.total_savings_inr).toLocaleString()}` : '—',
      label: 'Value saved'
    },
    {
      value: statsData?.total_users != null ? `${statsData.total_users}` : 'AI-Ready',
      label: 'Campus peers registered'
    },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-canvas/90 backdrop-blur border-b border-border/60">
        <div className="max-w-content mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand rounded flex items-center justify-center">
              <span className="text-accent font-bold text-[10px] leading-none">RX</span>
            </div>
            <span className="font-semibold text-ink text-[15px] tracking-tight">ReUseX</span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-[13.5px] font-medium text-ink-muted">
            <a href="#how" className="hover:text-ink transition-colors">How it works</a>
            <a href="#ai" className="hover:text-ink transition-colors">AI Matching</a>
            <a href="#impact" className="hover:text-ink transition-colors">Impact</a>
            <Link to="/app/architecture" className="hover:text-ink transition-colors">Architecture</Link>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button onClick={() => navigate('/app')} className="btn-primary">
                Open App <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-[13.5px]">Sign in</Link>
                <Link to="/register" className="btn-primary text-[13.5px]">
                  Get started <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="max-w-content mx-auto px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-soft border border-success/20 rounded-full text-[12px] font-medium text-success mb-6">
            <span className="w-1.5 h-1.5 bg-success rounded-full" />
            Campus circular economy · AI-powered
          </div>

          <h1 className="text-hero font-semibold text-ink leading-[1.07] tracking-tight mb-6 text-balance">
            Your campus already has{' '}
            <span className="text-brand">what you need.</span>
          </h1>

          <p className="text-lead text-ink-muted max-w-xl mb-8 leading-relaxed">
            ReUseX connects students, faculty, departments and campus organizations with
            resources that are already available — intelligently matched with AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to={isAuthenticated ? '/app/search' : '/register'}
              className="btn-primary btn-lg gap-2"
            >
              Explore resources <ArrowRight size={16} />
            </Link>
            <a href="#how" className="btn-outline btn-lg">
              How ReUseX works
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-x-8 gap-y-3 mt-12 pt-8 border-t border-border">
            {stats.map(s => (
              <div key={s.label}>
                <div className="text-xl font-semibold text-ink tracking-tight">{s.value}</div>
                <div className="text-xs text-ink-subtle mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────── */}
      <section id="how" className="bg-surface border-y border-border py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="mb-12">
            <div className="text-[11px] uppercase tracking-widest font-semibold text-ink-subtle mb-2">
              The platform
            </div>
            <h2 className="text-hero-sm font-semibold text-ink tracking-tight">
              Discover → Borrow → Return → Reuse
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(step => (
              <div key={step.n} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-surface-muted rounded-lg flex items-center justify-center text-ink-muted flex-shrink-0">
                    {step.icon}
                  </div>
                  <span className="text-[11px] font-mono text-ink-subtle">{step.n}</span>
                </div>
                <h3 className="text-[15px] font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Matching ─────────────────────────────────── */}
      <section id="ai" className="py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-[11px] uppercase tracking-widest font-semibold text-ink-subtle mb-2">
                AI Intelligence
              </div>
              <h2 className="text-hero-sm font-semibold text-ink tracking-tight mb-4">
                Natural language.<br />Semantic matching.
              </h2>
              <p className="text-ink-muted leading-relaxed mb-6">
                Describe what you need in plain language. ReUseX understands your context,
                technical requirements, and duration — then semantically matches it against
                campus inventory using vector search.
              </p>
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={14} className="text-brand" />
                <span className="text-sm font-medium text-ink">Every recommendation is explained</span>
              </div>
              <p className="text-sm text-ink-muted">
                You'll see exactly why a resource was recommended — functional compatibility,
                availability, location, condition, and owner reliability.
              </p>
            </div>

            <div className="space-y-4">
              {EXAMPLES.map((ex, i) => (
                <div key={i} className="card p-5">
                  <div className="text-[11px] text-ink-subtle font-medium mb-2">Query</div>
                  <div className="text-sm text-ink italic mb-4">{ex.query}</div>
                  <div className="text-[11px] text-ink-subtle font-medium mb-2">Matches</div>
                  <div className="space-y-1.5">
                    {ex.results.map(r => (
                      <div key={r} className="flex items-center gap-2 text-sm">
                        <CheckCircle size={12} className="text-success flex-shrink-0" />
                        <span className="text-ink">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Impact ──────────────────────────────────────── */}
      <section id="impact" className="bg-brand py-20">
        <div className="max-w-content mx-auto px-6">
          <div className="text-[11px] uppercase tracking-widest font-semibold text-white/40 mb-2">
            Sustainability
          </div>
          <h2 className="text-hero-sm font-semibold text-white tracking-tight mb-4">
            Every reuse is a win.
          </h2>
          <p className="text-white/60 max-w-lg mb-10 leading-relaxed">
            ReUseX tracks the financial and environmental value of every resource exchange.
            Impact figures are estimates — clearly labeled throughout.
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { value: 'Savings', desc: 'Estimated value of purchases avoided across campus' },
              { value: 'CO₂', desc: 'Estimated carbon impact avoided through resource reuse' },
              { value: 'Circularity', desc: 'Campus resource reuse rate tracked in real time' },
            ].map(item => (
              <div key={item.value} className="border border-white/10 rounded-xl p-5">
                <div className="text-section font-semibold text-white mb-2">{item.value}</div>
                <div className="text-sm text-white/50 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="py-20 border-b border-border">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-2xl">
            <h2 className="text-hero-sm font-semibold text-ink tracking-tight mb-3">
              Reuse what already exists.
            </h2>
            <p className="text-ink-muted mb-6 leading-relaxed">
              Join the campus resource network. Find what you need, share what you don't,
              and contribute to a smarter, more sustainable campus.
            </p>
            <div className="flex gap-3">
              <Link to="/register" className="btn-primary btn-lg">
                Join ReUseX <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-outline btn-lg">Sign in</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="py-8">
        <div className="max-w-content mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-brand rounded flex items-center justify-center">
              <span className="text-accent font-bold text-[9px] leading-none">RX</span>
            </div>
            <span className="text-sm font-medium text-ink">ReUseX</span>
            <span className="text-ink-subtle text-sm">— A smarter campus resource network.</span>
          </div>
          <div className="text-ink-subtle text-xs">Impact figures are estimates only.</div>
        </div>
      </footer>
    </div>
  );
}
