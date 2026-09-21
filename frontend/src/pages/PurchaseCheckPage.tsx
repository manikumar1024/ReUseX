import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { purchaseApi } from '../api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function PurchaseCheckPage() {
  const [form, setForm] = useState({ item_name: '', description: '', quantity: 1, estimated_cost: '', purpose: '' });
  const [result, setResult] = useState<any>(null);

  const checkMut = useMutation({
    mutationFn: () => purchaseApi.check({
      item_name: form.item_name,
      description: form.description,
      quantity: form.quantity,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : undefined,
      purpose: form.purpose
    }).then(r => r.data),
    onSuccess: (data) => {
      setResult(data);
      if (data.alternatives_found > 0) {
        toast(`Found ${data.alternatives_found} campus alternative(s)!`, { icon: '⚠️' });
      } else {
        toast.success('Campus check complete — no exact matches found');
      }
    },
    onError: () => toast.error('Check failed. Please try again.')
  });

  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-page font-bold text-brand mb-1">Purchase Check</h1>
        <p className="text-ink-muted text-sm">
          Before raising a purchase request, check if the campus already has suitable resources.
          This is a key feature for sustainable procurement.
        </p>
      </div>

      {/* Policy note */}
      <div className="card-flat p-4 flex items-start gap-3 mb-6">
        <Shield size={16} className="text-brand flex-shrink-0 mt-0.5" />
        <div className="text-sm text-ink-muted">
          <strong className="text-brand">Campus Policy:</strong> All purchase requests must include
          a campus resource check. If suitable alternatives exist, departments must attempt to borrow/transfer
          before purchasing.
        </div>
      </div>

      {!result ? (
        <div className="card p-6 space-y-4">
          <h2 className="font-medium text-brand">What do you want to purchase?</h2>

          <div>
            <label className="label" htmlFor="item-name">Item Name *</label>
            <input id="item-name" type="text" className="input"
              placeholder="e.g. Digital oscilloscope, Arduino kit, Projector"
              value={form.item_name}
              onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
          </div>

          <div>
            <label className="label" htmlFor="desc">Description</label>
            <textarea id="desc" className="textarea h-20"
              placeholder="Specifications, requirements, intended use…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="qty">Quantity</label>
              <input id="qty" type="number" className="input" min={1} value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <label className="label" htmlFor="cost">Estimated Cost (₹)</label>
              <input id="cost" type="number" className="input" placeholder="e.g. 5000"
                value={form.estimated_cost}
                onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="purpose">Purpose</label>
            <input id="purpose" type="text" className="input"
              placeholder="e.g. Final year lab project, Department equipment"
              value={form.purpose}
              onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
          </div>

          <button
            onClick={() => checkMut.mutate()}
            disabled={checkMut.isPending || !form.item_name.trim()}
            className="btn btn-accent w-full justify-center py-3 text-base disabled:opacity-60"
          >
            {checkMut.isPending ? (
              <><Loader2 size={18} className="animate-spin" /> Checking Campus Resources…</>
            ) : (
              <><Shield size={18} /> Check Campus Resources First</>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-5 animate-fade-in">
          {/* Result header */}
          <div className={`card p-5 border-l-4 ${result.alternatives_found > 0 ? 'border-l-amber-400' : 'border-l-green-500'}`}>
            <div className="flex items-start gap-3">
              {result.alternatives_found > 0
                ? <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                : <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              }
              <div>
                <div className="font-medium text-brand mb-1">
                  {result.alternatives_found > 0
                    ? `${result.alternatives_found} Campus Resource(s) Found`
                    : 'No Existing Campus Resources Found'}
                </div>
                <p className="text-ink-muted text-sm">{result.recommendation}</p>
              </div>
            </div>

            {result.potential_savings > 0 && (
              <div className="mt-3 p-3 bg-green-50 rounded-xl text-sm text-green-700 font-medium border border-green-200">
                💰 Potential savings: ₹{result.potential_savings.toLocaleString()}
              </div>
            )}
          </div>

          {/* Alternatives */}
          {result.alternatives?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-brand mb-3">Existing Campus Resources</h3>
              <div className="space-y-3">
                {result.alternatives.map((alt: any) => (
                  <div key={alt.resource_id} className="card p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <Link to={`/app/resources/${alt.resource_id}`} className="font-medium text-brand hover:underline">
                        {alt.title}
                      </Link>
                      <span className="pill bg-accent/20 text-brand text-xs">
                        {alt.compatibility_percent}% compatible
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
                      <span>Owner: {alt.owner_name}</span>
                      <span>Department: {alt.department_name || '—'}</span>
                      <span>Condition: {alt.condition}</span>
                      <span>Status: {alt.status}</span>
                      {alt.location && <span>Location: {alt.location}</span>}
                    </div>
                    <div className="mt-3">
                      <Link to={`/app/resources/${alt.resource_id}`} className="btn btn-outline text-xs py-1.5 px-3">
                        View & Request <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setResult(null); setForm({ item_name: '', description: '', quantity: 1, estimated_cost: '', purpose: '' }); }}
              className="btn btn-ghost">Check Another Item</button>
          </div>
        </div>
      )}
    </div>
  );
}
