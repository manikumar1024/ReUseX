import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { resourceApi, impactApi, loanApi } from '../api';
import { useAuthStore } from '../store';
import {
  Package, TrendingUp, BookOpen, Plus, Search, ArrowRight,
  Clock, Leaf, ArrowUpRight
} from 'lucide-react';

function StatCard({
  icon, label, value, sub, to
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  to?: string;
}) {
  const content = (
    <div className="bg-surface-card border border-border rounded-2xl p-5 hover:border-border-hover transition-all shadow-sm flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-700 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-ink mb-0.5">{value}</div>
        <div className="text-sm text-ink-muted font-medium truncate">{label}</div>
        {sub && <div className="text-xs text-ink-subtle mt-0.5 truncate">{sub}</div>}
      </div>
      {to && (
        <ArrowUpRight size={16} className="text-ink-subtle flex-shrink-0 mt-1" />
      )}
    </div>
  );

  if (to) {
    return <Link to={to} className="block group">{content}</Link>;
  }
  return content;
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: impactData } = useQuery({
    queryKey: ['impact-campus'],
    queryFn: () => impactApi.campus().then((r) => r.data)
  });

  const { data: myImpact } = useQuery({
    queryKey: ['impact-personal'],
    queryFn: () => impactApi.personal().then((r) => r.data)
  });

  const { data: recentResources } = useQuery({
    queryKey: ['resources-recent'],
    queryFn: () => resourceApi.list({ limit: '6', sort: 'created_at' }).then((r) => r.data)
  });

  const { data: allLoansData } = useQuery({
    queryKey: ['loans-dashboard-all'],
    queryFn: () => loanApi.list('all').then((r) => r.data)
  });

  const { data: myResourcesData } = useQuery({
    queryKey: ['my-resources-summary'],
    queryFn: () => resourceApi.listMine({ limit: '1' }).then((r) => r.data)
  });
  const loans = allLoansData?.loans || [];
  const activeLoans = loans.filter((l: any) => l.status === 'active').length;
  const pendingLoans = loans.filter((l: any) => l.status === 'requested').length;
  const myResourcesCount = myResourcesData?.total || 0;
  const saved = myImpact?.personal_impact?.value_saved_inr || 0;
  const co2Avoided = (myImpact?.personal_impact?.co2_kg_avoided || 0).toFixed(1);

  // Check if current user has action items (requests awaiting their approval as owner)
  const pendingRequestsToApprove = loans.filter(
    (l: any) => l.status === 'requested' && l.owner_id === user?.id
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            Good to see you, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            Campus circular exchange overview & active transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/app/post-need"
            className="px-4 py-2 bg-white border border-border hover:bg-surface-alt text-ink text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            Post a Need
          </Link>
          <Link
            to="/app/share"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            + Share Resource
          </Link>
        </div>
      </div>

      {/* Action alert if user has pending requests to approve */}
      {pendingRequestsToApprove.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 font-bold">
              !
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Action required: {pendingRequestsToApprove.length} pending borrow {pendingRequestsToApprove.length === 1 ? 'request' : 'requests'}
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Peers have requested to borrow items you listed. Review and approve them.
              </p>
            </div>
          </div>
          <Link
            to="/app/loans"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
          >
            Review Requests
          </Link>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen size={20} />}
          label="Active Loans"
          value={activeLoans}
          sub={pendingLoans > 0 ? `${pendingLoans} pending request${pendingLoans > 1 ? 's' : ''}` : 'In your possession'}
          to="/app/loans"
        />
        <StatCard
          icon={<Package size={20} />}
          label="My Listed Items"
          value={myResourcesCount}
          sub="Listed in catalogue"
          to="/app/resources"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Value Saved"
          value={`₹${Math.round(saved).toLocaleString()}`}
          sub="Estimated personal savings"
          to="/app/impact"
        />
        <StatCard
          icon={<Leaf size={20} />}
          label="CO₂ Avoided"
          value={`${co2Avoided} kg`}
          sub="Estimated emissions cut"
          to="/app/impact"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-ink mb-4">Quick Workflows</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            to="/app/post-need"
            className="bg-surface-card border border-border rounded-2xl p-5 hover:border-border-hover transition-all group shadow-sm"
          >
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3 text-emerald-700">
              <Search size={20} />
            </div>
            <h3 className="font-bold text-ink mb-1 group-hover:text-emerald-700 transition-colors">
              Post a Need
            </h3>
            <p className="text-ink-muted text-xs leading-relaxed">
              Describe the item or lab gear you need. AI will match available campus items.
            </p>
          </Link>

          <Link
            to="/app/share"
            className="bg-surface-card border border-border rounded-2xl p-5 hover:border-border-hover transition-all group shadow-sm"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3 text-blue-700">
              <Package size={20} />
            </div>
            <h3 className="font-bold text-ink mb-1 group-hover:text-blue-700 transition-colors">
              Share a Resource
            </h3>
            <p className="text-ink-muted text-xs leading-relaxed">
              Put idle lab equipment, books, or components to use for other students & departments.
            </p>
          </Link>

          <Link
            to="/app/planner"
            className="bg-surface-card border border-border rounded-2xl p-5 hover:border-border-hover transition-all group shadow-sm"
          >
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3 text-purple-700">
              <Plus size={20} />
            </div>
            <h3 className="font-bold text-ink mb-1 group-hover:text-purple-700 transition-colors">
              Project Component Planner
            </h3>
            <p className="text-ink-muted text-xs leading-relaxed">
              Enter your project brief; our AI will generate a Bill of Materials and find them locally.
            </p>
          </Link>
        </div>
      </div>

      {/* Campus Impact Summary Card */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold">Campus-Wide Circularity Impact</h2>
            <p className="text-white/70 text-xs mt-0.5">Real verified data from campus exchange ledger</p>
          </div>
          <Link
            to="/app/impact"
            className="text-emerald-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            Full Analytics <ArrowRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-3xl font-bold">{impactData?.summary?.total_resources ?? '0'}</div>
            <div className="text-white/60 text-xs mt-1">Resources Catalogued</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{impactData?.summary?.resources_reused ?? '0'}</div>
            <div className="text-white/60 text-xs mt-1">Items Reused / Borrowed</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{impactData?.summary?.loans_completed ?? '0'}</div>
            <div className="text-white/60 text-xs mt-1">Completed Loans</div>
          </div>
          <div>
            <div className="text-3xl font-bold">
              ₹{Number(impactData?.summary?.total_value_saved_inr || 0).toLocaleString()}
            </div>
            <div className="text-white/60 text-xs mt-1">Community Savings</div>
          </div>
        </div>
      </div>

      {/* Recently Listed Resources */}
      {recentResources?.resources?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Recently Listed on Campus</h2>
              <p className="text-ink-muted text-xs">Fresh items made available by peers and labs</p>
            </div>
            <Link
              to="/app/search"
              className="text-emerald-700 hover:text-emerald-800 text-xs font-semibold flex items-center gap-1"
            >
              Browse all items <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentResources.resources.slice(0, 6).map((r: any) => (
              <Link
                to={`/app/resources/${r.id}`}
                key={r.id}
                className="bg-surface-card border border-border rounded-2xl p-4 hover:border-border-hover transition-all shadow-sm block group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-ink text-sm leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors">
                    {r.title}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${
                      r.status === 'available'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-subtle mb-3">
                  <span className="flex items-center gap-1 truncate font-medium">
                    <Clock size={11} />
                    {r.category_name || r.category_slug || 'General'}
                  </span>
                  <span>{r.location || r.building || 'Campus'}</span>
                </div>
                <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-ink-muted">
                  <span className="capitalize font-medium">{r.mode?.replace(/_/g, ' ')}</span>
                  <span>Condition: <strong className="font-normal capitalize text-ink">{r.condition}</strong></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
