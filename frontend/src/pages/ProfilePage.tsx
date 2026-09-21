import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi, resourceApi, loanApi } from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import {
  User, Mail, Building2, MapPin, Phone, Shield, Award,
  CheckCircle2, Package, Layers, Edit3, Save, RefreshCw
} from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  name: string;
  role: string;
  department_id?: string;
  department_name?: string;
  bio?: string;
  contact_number?: string;
  building?: string;
  room_number?: string;
  reliability_score?: number;
  total_loans?: number;
  successful_returns?: number;
  created_at?: string;
}

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    contact_number: '',
    building: '',
    room_number: ''
  });

  const { data, refetch } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await authApi.me();
      return res.data.user as ProfileData;
    }
  });

  const { data: myResourcesData } = useQuery({
    queryKey: ['my-resources-count'],
    queryFn: async () => {
      const res = await resourceApi.listMine({ limit: '1' });
      return res.data.total || 0;
    }
  });

  const { data: myLoansData } = useQuery({
    queryKey: ['my-loans-count'],
    queryFn: async () => {
      const res = await loanApi.list();
      return (res.data.loans || []).length;
    }
  });

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        bio: data.bio || '',
        contact_number: data.contact_number || '',
        building: data.building || '',
        room_number: data.room_number || ''
      });
    }
  }, [data]);

  const updateMut = useMutation({
    mutationFn: (updates: Record<string, unknown>) => authApi.updateMe(updates),
    onSuccess: (res) => {
      const updated = res.data.user;
      updateUser({
        name: updated.name,
        role: updated.role,
        department_id: updated.department_id
      });
      setIsEditing(false);
      refetch();
      toast.success('Profile updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    updateMut.mutate(formData);
  };

  const profile = data || authUser;
  const reliability = Number(data?.reliability_score ?? 100);

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Header Profile Card */}
      <div className="bg-surface-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-3xl font-bold flex-shrink-0 shadow-md">
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-ink">{profile?.name}</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 capitalize">
                  {profile?.role?.replace(/_/g, ' ')}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 size={13} /> Verified
                </span>
              </div>
              <p className="text-ink-muted text-sm flex items-center gap-1.5 mb-2">
                <Mail size={14} /> {profile?.email}
              </p>
              {data?.department_name && (
                <p className="text-ink-subtle text-xs flex items-center gap-1.5">
                  <Building2 size={13} /> Department: {data.department_name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-white hover:bg-surface-alt text-ink text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                <Edit3 size={15} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-white hover:bg-surface-alt text-ink-muted text-sm font-medium rounded-xl transition-colors"
              >
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-ink-subtle mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Reliability Score</span>
            <Award size={18} className="text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-ink mb-1">{reliability}%</div>
          <div className="w-full bg-surface-alt rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(reliability, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-surface-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-ink-subtle mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resources Listed</span>
            <Package size={18} className="text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-ink">{myResourcesData ?? 0}</div>
          <span className="text-xs text-ink-subtle">Shared on ReuseX</span>
        </div>

        <div className="bg-surface-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-ink-subtle mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Loans</span>
            <Layers size={18} className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-ink">{data?.total_loans || myLoansData || 0}</div>
          <span className="text-xs text-ink-subtle">Transactions engaged</span>
        </div>

        <div className="bg-surface-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-ink-subtle mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Successful Returns</span>
            <Shield size={18} className="text-emerald-700" />
          </div>
          <div className="text-3xl font-bold text-ink">{data?.successful_returns || 0}</div>
          <span className="text-xs text-ink-subtle">Timely handovers</span>
        </div>
      </div>

      {/* Details & Edit Form */}
      <div className="bg-surface-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-ink mb-6 flex items-center gap-2">
          <User size={18} /> Profile Information
        </h2>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  Campus Building
                </label>
                <input
                  type="text"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  placeholder="e.g. Science Complex, Engineering Hall"
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  Room / Office Number
                </label>
                <input
                  type="text"
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  placeholder="e.g. Room 304, Lab B"
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                Bio / About Me
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                placeholder="Share a short bio, research interest, or what items you usually share/need..."
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={updateMut.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
              >
                {updateMut.isPending ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 border border-border bg-white hover:bg-surface-alt text-ink-muted text-sm font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider block mb-1">
                  Full Name
                </span>
                <p className="text-ink font-medium">{profile?.name || 'Not provided'}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider block mb-1">
                  Email Address
                </span>
                <p className="text-ink font-medium">{profile?.email}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider block mb-1">
                  Contact Phone
                </span>
                <p className="text-ink font-medium flex items-center gap-1.5">
                  <Phone size={14} className="text-ink-subtle" />
                  {data?.contact_number || 'Not set (visible during active handovers)'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider block mb-1">
                  Campus Location
                </span>
                <p className="text-ink font-medium flex items-center gap-1.5">
                  <MapPin size={14} className="text-ink-subtle" />
                  {data?.building ? `${data.building}${data.room_number ? `, Room ${data.room_number}` : ''}` : 'Not set'}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider block mb-1">
                  Bio / Notes
                </span>
                <p className="text-ink leading-relaxed">
                  {data?.bio || 'No bio provided yet.'}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider block mb-1">
                  Account Role
                </span>
                <p className="text-ink capitalize">
                  {profile?.role?.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
