import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceApi } from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { MapPin, Star, Package, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [requestForm, setRequestForm] = useState({ notes: '', days: 7, show: false });

  const { data, isLoading, error } = useQuery({
    queryKey: ['resource', id],
    queryFn: () => resourceApi.get(id!).then(r => r.data)
  });

  const requestMut = useMutation({
    mutationFn: (vars: { notes: string; days: number }) => resourceApi.request(id!, {
      notes: vars.notes,
      requested_from: new Date().toISOString(),
      requested_until: new Date(Date.now() + vars.days * 86400000).toISOString(),
      quantity: 1
    }),
    onSuccess: () => {
      toast.success('Request submitted successfully!');
      qc.invalidateQueries({ queryKey: ['resource', id] });
      setRequestForm(f => ({ ...f, show: false }));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Request failed');
    }
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="skeleton h-8 w-1/2 rounded-lg" />
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-4 w-3/4 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data?.resource) {
    return (
      <div className="p-6 text-center py-20">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-brand mb-2">Resource not found</h2>
        <button onClick={() => navigate(-1)} className="btn btn-outline mt-4">Go back</button>
      </div>
    );
  }

  const r = data.resource;
  const isOwner = r.owner_id === user?.id;
  const canRequest = !isOwner && r.status === 'available' && r.available_quantity > 0;

  return (
    <div className="p-6 max-w-5xl animate-fade-in">
      <button onClick={() => navigate(-1)} className="btn btn-ghost mb-4 -ml-1">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Images + Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Image */}
          <div className="w-full h-64 bg-surface-muted rounded-2xl border border-border flex items-center justify-center overflow-hidden">
            {r.images?.[0]?.url ? (
              <img src={r.images[0].url} alt={r.title} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-2">📦</div>
                <div className="text-ink-subtle text-sm">No image</div>
              </div>
            )}
          </div>

          {/* Title & Status */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-page font-bold text-brand">{r.title}</h1>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`pill ${r.status === 'available' ? 'pill-available' : 'pill-borrowed'} text-sm`}>
                  {r.status}
                </span>
                <span className={`pill pill-${r.condition}`}>{r.condition}</span>
              </div>
            </div>

            <p className="text-ink-muted leading-relaxed mb-4">{r.description}</p>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Category', value: r.category_name },
                { label: 'Type', value: r.resource_type },
                { label: 'Mode', value: r.mode?.replace('_', ' ') },
                { label: 'Quantity available', value: `${r.available_quantity} of ${r.quantity}` },
                r.available_from && { label: 'Available from', value: new Date(r.available_from).toLocaleDateString() },
                r.available_until && { label: 'Available until', value: new Date(r.available_until).toLocaleDateString() },
                r.price && { label: 'Price', value: `₹${r.price}` },
              ].filter(Boolean).map((item: any) => (
                <div key={item.label} className="bg-surface-muted rounded-xl px-3 py-2">
                  <div className="text-ink-subtle text-xs">{item.label}</div>
                  <div className="text-brand font-medium capitalize mt-0.5">{item.value || '—'}</div>
                </div>
              ))}
            </div>

            {/* Specs */}
            {r.specifications && Object.keys(r.specifications).length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-ink-subtle uppercase tracking-wide font-medium mb-2">Specifications</div>
                <div className="space-y-1.5">
                  {Object.entries(r.specifications).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-sm">
                      <span className="text-ink-subtle min-w-28 flex-shrink-0">{k}</span>
                      <span className="text-brand">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {r.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {r.tags.map((tag: string) => (
                  <span key={tag} className="px-2.5 py-1 bg-surface-muted rounded-full text-xs text-ink-muted border border-border">{tag}</span>
                ))}
              </div>
            )}

            {r.is_hazardous && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-sm border border-amber-200">
                <AlertTriangle size={16} />
                <span>⚠️ This resource may require safety precautions. Handle with care.</span>
              </div>
            )}
          </div>

          {/* Reviews */}
          {r.recent_reviews?.length > 0 && (
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-brand mb-4">Reviews</h2>
              <div className="space-y-3">
                {r.recent_reviews.map((rev: any) => (
                  <div key={rev.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-surface-muted rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-ink-muted">{rev.reviewer_name?.[0]}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-brand">{rev.reviewer_name}</span>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={12} className={i < rev.rating ? 'text-amber-500 fill-amber-500' : 'text-border'} />
                          ))}
                        </div>
                      </div>
                      {rev.comment && <p className="text-ink-muted text-sm">{rev.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Owner + Request */}
        <div className="space-y-4">
          {/* Owner card */}
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-brand mb-3">Listed by</h2>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-surface-muted rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-brand font-semibold">{r.owner_name?.[0]}</span>
              </div>
              <div>
                <div className="font-medium text-brand text-sm">{r.owner_name}</div>
                <div className="text-ink-subtle text-xs">{r.department_name}</div>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              {r.owner_building && (
                <div className="flex items-center gap-2 text-ink-muted">
                  <MapPin size={12} className="flex-shrink-0" />
                  {r.owner_building}
                </div>
              )}
              <div className="flex items-center gap-2 text-ink-muted">
                <Star size={12} />
                Reliability: {r.reliability_score?.toFixed(1)}/5
              </div>
              <div className="flex items-center gap-2 text-ink-subtle">
                <Package size={12} />
                {r.borrow_count || 0} loans completed
              </div>
            </div>
          </div>

          {/* Location */}
          {(r.location || r.building) && (
            <div className="card-flat p-4">
              <div className="flex items-center gap-2 text-brand font-medium text-sm mb-1">
                <MapPin size={14} />
                Location
              </div>
              <div className="text-ink-muted text-sm">
                {[r.location, r.building].filter(Boolean).join(', ')}
              </div>
            </div>
          )}

          {/* Request button */}
          {canRequest && !requestForm.show && (
            <button
              onClick={() => setRequestForm(f => ({ ...f, show: true }))}
              className="btn btn-accent w-full justify-center py-3 text-base"
            >
              <CheckCircle size={18} />
              Request Resource
            </button>
          )}

          {isOwner && (
            <div className="card-flat p-4 text-center text-sm text-ink-muted">
              This is your listing
              <Link to="/app/resources" className="block mt-2 text-brand font-medium hover:underline">Manage my resources</Link>
            </div>
          )}

          {!canRequest && !isOwner && r.status !== 'available' && (
            <div className="card-flat p-4 text-center text-sm text-ink-muted">
              This resource is currently {r.status}.
              <Link to="/app/post-need" className="block mt-2 text-brand font-medium hover:underline">
                Post a Need instead
              </Link>
            </div>
          )}

          {/* Request form */}
          {requestForm.show && (
            <div className="card p-5 animate-fade-in">
              <h3 className="font-medium text-brand mb-4">Send Request</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Duration (days)</label>
                  <input type="number" className="input" min={1} max={90}
                    value={requestForm.days}
                    onChange={e => setRequestForm(f => ({ ...f, days: parseInt(e.target.value) || 1 }))} />
                </div>
                <div>
                  <label className="label">Message to owner (optional)</label>
                  <textarea className="textarea h-20"
                    placeholder="Explain your use case briefly…"
                    value={requestForm.notes}
                    onChange={e => setRequestForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => requestMut.mutate({ notes: requestForm.notes, days: requestForm.days })}
                    disabled={requestMut.isPending}
                    className="btn btn-primary flex-1 justify-center"
                  >
                    {requestMut.isPending ? 'Sending…' : 'Send Request'}
                  </button>
                  <button onClick={() => setRequestForm(f => ({ ...f, show: false }))} className="btn btn-outline">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
