import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loanApi } from '../api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { CheckCircle, X, Clock, ArrowRight, QrCode } from 'lucide-react';
import clsx from 'clsx';

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-blue-50 text-blue-700',
  approved: 'bg-accent/20 text-brand',
  active: 'bg-green-50 text-green-700',
  returned: 'bg-brand/10 text-brand',
  overdue: 'bg-red-50 text-red-700',
  rejected: 'bg-border text-ink-subtle',
  cancelled: 'bg-border text-ink-subtle'
};

export default function MyLoansPage() {
  const [view, setView] = useState<'borrowing' | 'lending'>('borrowing');
  const [actionLoanId, setActionLoanId] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState('');
  const [qrType, setQrType] = useState<'handover' | 'return' | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['loans', view],
    queryFn: () => loanApi.list(view).then(r => r.data)
  });

  const loans = data?.loans || [];

  const approveMut = useMutation({
    mutationFn: (id: string) => loanApi.update(id, 'approve'),
    onSuccess: () => { toast.success('Request approved!'); qc.invalidateQueries({ queryKey: ['loans'] }); }
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => loanApi.update(id, 'reject'),
    onSuccess: () => { toast.success('Request rejected'); qc.invalidateQueries({ queryKey: ['loans'] }); }
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => loanApi.update(id, 'cancel'),
    onSuccess: () => { toast.success('Request cancelled'); qc.invalidateQueries({ queryKey: ['loans'] }); }
  });

  const handoverMut = useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) => loanApi.handover(id, code),
    onSuccess: () => {
      toast.success('Handover verified! Loan is now active.');
      setActionLoanId(null); setQrInput(''); setQrType(null);
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Invalid QR code')
  });

  const returnMut = useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) => loanApi.return(id, code),
    onSuccess: () => {
      toast.success('Return confirmed! Impact recorded.');
      setActionLoanId(null); setQrInput(''); setQrType(null);
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Invalid QR code')
  });

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-page font-bold text-brand mb-1">My Loans</h1>
        <p className="text-ink-muted text-sm">Manage your borrowing and lending activity.</p>
      </div>

      {/* Toggle */}
      <div className="flex gap-1 bg-surface-muted rounded-xl p-1 mb-6 w-fit">
        {(['borrowing', 'lending'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
              view === v ? 'bg-surface text-brand shadow-sm' : 'text-ink-muted hover:text-brand')}>
            {v}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      )}

      {!isLoading && loans.length === 0 && (
        <div className="empty-state">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-brand mb-2">No {view} activity yet</h3>
          <p className="text-ink-muted text-sm mb-5">
            {view === 'borrowing' ? 'Browse resources and send a request.' : 'Share resources to see lending activity.'}
          </p>
          <Link to={view === 'borrowing' ? '/app/search' : '/app/share'} className="btn btn-accent">
            {view === 'borrowing' ? 'Find Resources' : 'Share a Resource'}
          </Link>
        </div>
      )}

      {/* QR Modal */}
      {actionLoanId && qrType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setActionLoanId(null); setQrType(null); }}>
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-brand mb-2">
              {qrType === 'handover' ? '📦 Verify Handover' : '✅ Verify Return'}
            </h3>
            <p className="text-ink-muted text-sm mb-4">
              {qrType === 'handover'
                ? 'Scan the handover QR code, or paste the code manually:'
                : 'Scan the return QR code, or paste the code manually:'}
            </p>
            <div className="flex items-center gap-2 mb-2">
              <QrCode size={16} className="text-ink-subtle" />
              <input type="text" className="input flex-1 text-sm" placeholder="Paste QR code here…"
                value={qrInput} onChange={e => setQrInput(e.target.value)} autoFocus />
            </div>
            <p className="text-xs text-ink-subtle mb-4">In production, scan with your camera or use the QR from the approval notification.</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!qrInput.trim()) { toast.error('Please enter the QR code'); return; }
                  if (qrType === 'handover') handoverMut.mutate({ id: actionLoanId, code: qrInput.trim() });
                  else returnMut.mutate({ id: actionLoanId, code: qrInput.trim() });
                }}
                disabled={handoverMut.isPending || returnMut.isPending}
                className="btn btn-primary flex-1 justify-center"
              >
                {(handoverMut.isPending || returnMut.isPending) ? 'Verifying…' : 'Verify'}
              </button>
              <button onClick={() => { setActionLoanId(null); setQrType(null); setQrInput(''); }} className="btn btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loans.map((loan: any) => (
          <div key={loan.id} className="card p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <Link to={`/app/resources/${loan.resource_id}`} className="font-semibold text-brand hover:underline">
                  {loan.resource_title}
                </Link>
                <div className="text-ink-muted text-sm mt-0.5">
                  {view === 'borrowing' ? `Owner: ${loan.owner_name}` : `Borrower: ${loan.borrower_name}`}
                </div>
              </div>
              <span className={clsx('pill flex-shrink-0', STATUS_COLORS[loan.status] || 'bg-surface-muted')}>
                {loan.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-ink-subtle mb-4">
              {loan.requested_from && (
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(loan.requested_from).toLocaleDateString()} — {loan.requested_until ? new Date(loan.requested_until).toLocaleDateString() : '?'}
                </span>
              )}
              <span className="flex items-center gap-1">Qty: {loan.quantity}</span>
              {loan.location && <span>{loan.location}</span>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {/* Lending actions */}
              {view === 'lending' && loan.status === 'requested' && (
                <>
                  <button onClick={() => approveMut.mutate(loan.id)} disabled={approveMut.isPending}
                    className="btn btn-primary text-xs py-1.5 px-3">
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button onClick={() => rejectMut.mutate(loan.id)} disabled={rejectMut.isPending}
                    className="btn btn-outline text-xs py-1.5 px-3">
                    <X size={14} /> Reject
                  </button>
                </>
              )}

              {/* Handover QR verification */}
              {loan.status === 'approved' && (
                <button
                  onClick={() => { setActionLoanId(loan.id); setQrType('handover'); }}
                  className="btn btn-accent text-xs py-1.5 px-3"
                >
                  <QrCode size={14} /> Verify Handover
                </button>
              )}

              {/* Return QR verification */}
              {loan.status === 'active' && view === 'borrowing' && (
                <button
                  onClick={() => { setActionLoanId(loan.id); setQrType('return'); }}
                  className="btn btn-primary text-xs py-1.5 px-3"
                >
                  <ArrowRight size={14} /> Return Resource
                </button>
              )}

              {/* Cancel */}
              {view === 'borrowing' && ['requested', 'approved'].includes(loan.status) && (
                <button onClick={() => cancelMut.mutate(loan.id)} className="btn btn-ghost text-xs py-1.5 px-3 text-red-600 hover:text-red-700">
                  Cancel Request
                </button>
              )}

              {/* View detail */}
              <Link to={`/app/resources/${loan.resource_id}`} className="btn btn-ghost text-xs py-1.5 px-3">
                View Resource <ArrowRight size={12} />
              </Link>
            </div>

            {/* QR code info */}
            {loan.status === 'approved' && loan.qr_handover_code && (
              <div className="mt-3 p-2.5 bg-accent/10 rounded-xl text-xs text-brand">
                <strong>Handover code:</strong> <code className="font-mono">{loan.qr_handover_code}</code>
                <div className="text-ink-muted mt-0.5">Share this with the other party for handover verification.</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
