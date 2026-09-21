import { useQuery } from '@tanstack/react-query';
import { impactApi } from '../api';
import { Leaf, TrendingUp, Recycle, Users, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ImpactPage() {
  const { data: campus } = useQuery({
    queryKey: ['impact-campus'],
    queryFn: () => impactApi.campus().then(r => r.data)
  });

  const { data: personal } = useQuery({
    queryKey: ['impact-personal'],
    queryFn: () => impactApi.personal().then(r => r.data)
  });

  const { data: trendData } = useQuery({
    queryKey: ['impact-trend'],
    queryFn: () => impactApi.trend().then(r => r.data)
  });

  const s = campus?.summary;
  const p = personal?.personal_impact;

  const trendChart = (trendData?.trend || []).map((t: any) => ({
    month: new Date(t.month).toLocaleString('default', { month: 'short' }),
    events: parseInt(t.events || 0),
    saved: parseFloat(t.value_saved || 0)
  }));

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-page font-bold text-brand mb-1">Sustainability Impact</h1>
        <p className="text-ink-muted text-sm">
          Estimated impact of campus resource reuse. Values are estimates — not scientifically precise.
          <span className="ml-1 text-ink-subtle italic">Clearly labeled as estimates throughout.</span>
        </p>
      </div>

      {/* Campus stats */}
      <div>
        <h2 className="text-xl font-semibold text-brand mb-4 flex items-center gap-2">
          <BarChart2 size={20} /> Campus-wide Impact
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <TrendingUp size={20} />, label: 'Estimated Savings', value: `₹${((s?.total_value_saved_inr || 0)/1000).toFixed(1)}K`, sub: 'vs. new purchases (est.)' },
            { icon: <Recycle size={20} />, label: 'Resources Reused', value: s?.resources_reused || 0, sub: 'unique items' },
            { icon: <Leaf size={20} />, label: 'CO₂ Avoided (est.)', value: `${(s?.total_co2_kg_avoided || 0).toFixed(1)}kg`, sub: 'estimated only' },
            { icon: <Users size={20} />, label: 'Loans Completed', value: s?.loans_completed || 0, sub: 'successful exchanges' },
          ].map((item) => (
            <div key={item.label} className="card p-5">
              <div className="flex items-center gap-2 text-brand mb-3">{item.icon}</div>
              <div className="text-2xl font-bold text-brand">{item.value}</div>
              <div className="text-ink-muted text-sm font-medium">{item.label}</div>
              <div className="text-ink-subtle text-xs mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend chart */}
      {trendChart.length > 0 && (
        <div className="card p-6">
          <h3 className="font-medium text-brand mb-4">Reuse Activity (Last 6 Months)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChart}>
                <defs>
                  <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#163C2A" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#163C2A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any, n: any) => [n === 'saved' ? `₹${v}` : v, n === 'saved' ? 'Est. Savings' : 'Reuse Events']} />
                <Area type="monotone" dataKey="events" stroke="#163C2A" fill="url(#colorSaved)" name="events" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Personal impact */}
      {p && (
        <div>
          <h2 className="text-xl font-semibold text-brand mb-4">Your Personal Impact</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Value Saved (est.)', value: `₹${Math.round(p.value_saved_inr || 0).toLocaleString()}` },
              { label: 'Resources Borrowed', value: p.successful_borrows || 0 },
              { label: 'Users You Helped', value: p.users_helped || 0 },
              { label: 'CO₂ Avoided (est.)', value: `${(p.co2_kg_avoided || 0).toFixed(2)}kg` },
              { label: 'Unique Resources', value: p.unique_resources_reused || 0 },
              { label: 'Reuse Events', value: p.reuse_events || 0 },
            ].map((item) => (
              <div key={item.label} className="card-flat p-4">
                <div className="text-xl font-bold text-brand">{item.value}</div>
                <div className="text-ink-muted text-sm mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="p-4 bg-surface-muted rounded-2xl border border-border text-sm text-ink-muted">
        <strong className="text-brand">Responsible AI Transparency:</strong> Environmental impact figures (CO₂, material savings)
        are rough estimates based on typical resource cost and carbon factor proxies. They are intended to illustrate
        sustainability progress — not to serve as scientifically verified measurements. Financial savings are estimated
        based on resource value and borrowing patterns.
      </div>
    </div>
  );
}
