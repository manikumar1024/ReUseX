import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Users, Package, TrendingUp, AlertTriangle, Leaf, BookOpen,
  Search, CheckCircle2, XCircle, Filter, Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const COLORS = ['#163C2A', '#2D6A4F', '#B7E35A', '#52796F', '#40916C', '#95D5B2'];

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'lab_manager', label: 'Lab Manager' },
  { value: 'club_org', label: 'Club / Org' },
  { value: 'department_admin', label: 'Department Admin' },
  { value: 'campus_admin', label: 'Campus Admin' },
];

export default function AdminDashboardPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'underutilized'>('analytics');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userPage, setUserPage] = useState(1);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.analytics().then((r) => r.data),
  });

  const { data: underutilized } = useQuery({
    queryKey: ['admin-underutilized'],
    queryFn: () => adminApi.underutilized().then((r) => r.data),
  });

  const { data: scoreData } = useQuery({
    queryKey: ['circularity-score'],
    queryFn: () => adminApi.circularityScore().then((r) => r.data),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', userSearch, userRoleFilter, userPage],
    queryFn: () =>
      adminApi.users({
        ...(userSearch && { search: userSearch }),
        ...(userRoleFilter && { role: userRoleFilter }),
        page: String(userPage),
        limit: '20',
      }).then((r) => r.data),
    enabled: activeTab === 'users',
  });

  const updateUserMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update user');
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <div className="h-8 w-1/3 bg-surface-card rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-surface-card rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const r = analytics?.resources || {};
  const l = analytics?.loans || {};
  const imp = analytics?.impact || {};
  const score = scoreData?.score || 0;
  const userList = usersData?.users || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-1">Campus Administration</h1>
          <p className="text-ink-muted text-sm">
            Institutional oversight, circularity analytics, and account role governance.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/app/purchase-check"
            className="px-4 py-2 bg-surface-card border border-border hover:bg-surface-alt text-ink text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            Run Purchase Check
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('analytics')}
          className={clsx(
            'pb-3 border-b-2 transition-colors',
            activeTab === 'analytics'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          Circularity & Analytics
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={clsx(
            'pb-3 border-b-2 transition-colors flex items-center gap-1.5',
            activeTab === 'users'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <span>User & Role Governance</span>
          {usersData?.total != null && (
            <span className="text-xs bg-surface-alt px-2 py-0.5 rounded-full text-ink-subtle">
              {usersData.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('underutilized')}
          className={clsx(
            'pb-3 border-b-2 transition-colors flex items-center gap-1.5',
            activeTab === 'underutilized'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <span>Underutilized Assets</span>
          {(underutilized?.resources?.length || 0) > 0 && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
              {underutilized.resources.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fade-in">
          {/* Circularity Score Card */}
          <div className="bg-surface-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center shadow-sm">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#E1E5DF" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r="34" fill="none" stroke="#163C2A" strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - score / 100)}
                  strokeLinecap="round" className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-ink">{score}</span>
                <span className="text-xs text-ink-subtle">/ 100</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Leaf size={20} className="text-emerald-600" />
                <h2 className="text-xl font-bold text-ink">Campus Circularity Score</h2>
              </div>
              <p className="text-ink-muted text-sm mb-4">{scoreData?.description}</p>
              <div className="flex flex-wrap gap-4 text-xs">
                {Object.entries(scoreData?.components || {}).map(([k, v]: [string, any]) => (
                  <div key={k} className="bg-surface-alt px-3 py-1.5 rounded-xl border border-border flex items-center gap-2">
                    <span className="text-ink-subtle capitalize font-medium">{k.replace(/_/g, ' ')}:</span>
                    <span className="font-bold text-ink">{v}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Package size={20} />, label: 'Total Catalogued', value: r.total || 0, sub: `${r.available || 0} currently available` },
              { icon: <BookOpen size={20} />, label: 'Total Loans', value: l.total_loans || 0, sub: `${l.completed || 0} loans completed` },
              { icon: <TrendingUp size={20} />, label: 'Savings Avoided', value: `₹${((imp.total_value_saved || 0) / 1000).toFixed(1)}K`, sub: 'Duplicate spending saved' },
              { icon: <Users size={20} />, label: 'Active Loans', value: l.active || 0, sub: `${l.overdue || 0} overdue items` },
            ].map((item) => (
              <div key={item.label} className="bg-surface-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="text-emerald-700 mb-2">{item.icon}</div>
                <div className="text-2xl font-bold text-ink mb-0.5">{item.value}</div>
                <div className="text-ink-muted text-xs font-semibold">{item.label}</div>
                <div className="text-ink-subtle text-xs mt-0.5">{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {analytics?.categories?.length > 0 && (
              <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-ink text-sm mb-4">Resources by Category</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.categories.slice(0, 8)}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#163C2A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {analytics?.departments?.length > 0 && (
              <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-ink text-sm mb-4">Resources by Department</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.departments.slice(0, 5)}
                        dataKey="resource_count"
                        nameKey="department"
                        cx="50%" cy="50%" outerRadius={70}
                        label={({ department, percent }: any) =>
                          `${department?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {analytics.departments.slice(0, 5).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Monthly trend */}
          {analytics?.monthly_trend?.length > 0 && (
            <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-ink text-sm mb-4">Monthly Exchange Trend</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthly_trend}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) =>
                        new Date(v).toLocaleString('default', { month: 'short' })
                      }
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER & ROLE GOVERNANCE */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-surface-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                type="search"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-xl text-xs text-ink focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={15} className="text-ink-subtle" />
              <select
                value={userRoleFilter}
                onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }}
                className="px-3 py-2 bg-surface border border-border rounded-xl text-xs text-ink focus:outline-none focus:border-emerald-600"
              >
                <option value="">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-surface-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-alt border-b border-border text-ink-subtle font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Reliability</th>
                    <th className="p-4">Items / Loans</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usersLoading && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-ink-subtle">
                        Loading campus users...
                      </td>
                    </tr>
                  )}

                  {!usersLoading && userList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-ink-subtle">
                        No users match the search criteria.
                      </td>
                    </tr>
                  )}

                  {!usersLoading && userList.map((u: any) => {
                    const isActive = u.is_active !== false;
                    return (
                      <tr key={u.id} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-ink text-sm">{u.name}</div>
                          <div className="text-ink-subtle">{u.email}</div>
                        </td>

                        <td className="p-4 text-ink-muted">
                          {u.department_name || '—'}
                        </td>

                        <td className="p-4">
                          <select
                            value={u.role}
                            onChange={(e) =>
                              updateUserMut.mutate({ id: u.id, data: { role: e.target.value } })
                            }
                            disabled={updateUserMut.isPending}
                            className="px-2.5 py-1 bg-surface border border-border rounded-lg text-xs font-semibold text-ink capitalize focus:outline-none focus:border-emerald-600"
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <Award size={13} className="text-amber-500" />
                            <span className="font-bold text-ink">{u.reliability_score || 100}%</span>
                          </div>
                        </td>

                        <td className="p-4 text-ink-muted">
                          <span>{u.resource_count || 0} listed</span>
                          <span className="mx-1">·</span>
                          <span>{u.total_loans || 0} loans</span>
                        </td>

                        <td className="p-4">
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            )}
                          >
                            {isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <button
                            onClick={() =>
                              updateUserMut.mutate({ id: u.id, data: { is_active: !isActive } })
                            }
                            disabled={updateUserMut.isPending}
                            className={clsx(
                              'px-3 py-1 rounded-lg text-xs font-semibold transition-colors border',
                              isActive
                                ? 'border-border text-ink-muted hover:text-rose-600 hover:border-rose-300'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            )}
                          >
                            {isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UNDERUTILIZED ASSETS */}
      {activeTab === 'underutilized' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <h2 className="text-lg font-bold text-ink">Underutilized Campus Resources</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              {underutilized?.resources?.length || 0} identified
            </span>
          </div>

          <p className="text-ink-muted text-xs">
            Resources with zero activity for over 60 days. Institutional circularity policies suggest reallocating these to high-demand departments.
          </p>

          <div className="space-y-3">
            {(underutilized?.resources || []).map((res: any) => (
              <div
                key={res.id}
                className="bg-surface-card border border-border border-l-4 border-l-amber-500 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-ink text-base">{res.title}</h3>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {res.department_name} · Owned by {res.owner_name}
                    </div>
                  </div>
                  <div className="text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-xl self-start sm:self-auto border border-amber-200">
                    {Math.round(res.idle_days)} days idle
                  </div>
                </div>

                {res.ai_insight && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                    <span>{res.ai_insight}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responsible AI note */}
      <div className="bg-surface-alt border border-border p-4 rounded-2xl text-xs text-ink-muted">
        <strong className="text-ink font-semibold">Responsible AI Governance:</strong> AI recommendations on this dashboard (underutilized assets, duplicate purchase alerts) are advisory only. All institutional resource transfers require authorized human approval.
      </div>
    </div>
  );
}
