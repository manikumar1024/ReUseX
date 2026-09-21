import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceApi } from '../api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, ToggleLeft, ToggleRight, Trash2, Plus, AlertCircle, Package } from 'lucide-react';

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  condition: string;
  status: string;
  location?: string;
  building?: string;
  mode: string;
  price?: number;
  available_quantity: number;
  quantity: number;
  borrow_count: number;
  view_count: number;
  created_at: string;
  category_name?: string;
  category_slug?: string;
  primary_image?: string;
  pending_requests?: number;
}

export default function MyResourcesPage() {
  const qc = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      resourceApi.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-resources'] });
      toast.success('Resource updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update resource');
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => resourceApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-resources'] });
      setDeleteConfirmId(null);
      toast.success('Resource removed successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to remove resource');
    }
  });

  const { data: myData, isLoading, error } = useQuery({
    queryKey: ['my-resources'],
    queryFn: async () => {
      const res = await resourceApi.listMine({ limit: '50' });
      return res.data;
    }
  });

  const resources: ResourceItem[] = myData?.resources || [];

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-1">My Resources</h1>
          <p className="text-ink-muted text-sm">
            Manage your listed items, update availability, and track borrow requests.
          </p>
        </div>
        <Link
          to="/app/share"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Share New Resource</span>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-surface-card rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 flex items-center gap-3">
          <AlertCircle size={20} className="flex-shrink-0" />
          <p className="text-sm">Failed to load your resources. Please check your connection and try again.</p>
        </div>
      )}

      {!isLoading && !error && resources.length === 0 && (
        <div className="bg-surface-card border border-border rounded-2xl p-12 text-center max-w-md mx-auto my-8 shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={32} />
          </div>
          <h3 className="text-xl font-bold text-ink mb-2">No listed resources yet</h3>
          <p className="text-ink-muted text-sm mb-6 leading-relaxed">
            You haven't listed any equipment, components, or books yet. Put idle campus items to use by sharing them.
          </p>
          <Link
            to="/app/share"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-colors"
          >
            <Plus size={16} />
            <span>List Your First Item</span>
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {resources.map((r) => {
          const isDeleting = deleteConfirmId === r.id;
          const isAvailable = r.status === 'available';

          return (
            <div
              key={r.id}
              className="bg-surface-card border border-border rounded-2xl p-5 hover:border-border-hover transition-all shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {r.primary_image ? (
                    <img
                      src={r.primary_image}
                      alt={r.title}
                      className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-surface-alt border border-border flex items-center justify-center text-ink-subtle flex-shrink-0">
                      <Package size={24} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Link
                        to={`/app/resources/${r.id}`}
                        className="font-bold text-ink hover:text-emerald-600 transition-colors truncate text-base"
                      >
                        {r.title}
                      </Link>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isAvailable ? 'Available' : r.status}
                      </span>
                      {Number(r.pending_requests || 0) > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                          {r.pending_requests} pending {Number(r.pending_requests) === 1 ? 'request' : 'requests'}
                        </span>
                      )}
                    </div>

                    <p className="text-ink-muted text-sm line-clamp-1 mb-2">
                      {r.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-subtle">
                      {r.category_name && (
                        <span className="font-medium text-ink-muted">{r.category_name}</span>
                      )}
                      <span className="capitalize">{r.mode?.replace(/_/g, ' ')}</span>
                      <span>Condition: <strong className="capitalize font-normal text-ink-muted">{r.condition}</strong></span>
                      <span>Qty: {r.available_quantity}/{r.quantity}</span>
                      <span>{r.borrow_count || 0} loans</span>
                      <span>{r.view_count || 0} views</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <Link
                    to={`/app/resources/${r.id}`}
                    className="p-2 text-ink-subtle hover:text-ink hover:bg-surface-alt rounded-xl transition-colors"
                    title="View public page"
                  >
                    <Eye size={18} />
                  </Link>

                  <button
                    onClick={() => {
                      const newStatus = isAvailable ? 'unavailable' : 'available';
                      updateMut.mutate({ id: r.id, updates: { status: newStatus } });
                    }}
                    disabled={updateMut.isPending}
                    className={`p-2 rounded-xl transition-colors ${
                      isAvailable
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-ink-subtle hover:bg-surface-alt'
                    }`}
                    title={isAvailable ? 'Click to mark Unavailable' : 'Click to mark Available'}
                  >
                    {isAvailable ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>

                  {isDeleting ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1.5 rounded-xl">
                      <span className="text-xs text-rose-700 font-medium px-1">Delete?</span>
                      <button
                        onClick={() => deleteMut.mutate(r.id)}
                        disabled={deleteMut.isPending}
                        className="px-2 py-0.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-0.5 bg-white border border-border text-ink rounded-lg text-xs hover:bg-surface-alt transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(r.id)}
                      className="p-2 text-ink-subtle hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Remove resource"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
