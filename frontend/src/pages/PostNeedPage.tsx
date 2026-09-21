import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { requirementApi, aiApi } from '../api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Sparkles, CheckCircle, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

function MatchScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? 'score-high' : score >= 70 ? 'score-medium' : 'score-low';
  return (
    <span className={clsx('score-badge', color)}>
      {score}% match
    </span>
  );
}

export default function PostNeedPage() {
  const [step, setStep] = useState<'input' | 'understanding' | 'matches'>('input');
  const [query, setQuery] = useState('');
  const [extraction, setExtraction] = useState<any>(null);
  const [_requirement, setRequirement] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);

  const extractMut = useMutation({
    mutationFn: (q: string) => aiApi.extractRequirement(q).then(r => r.data),
    onSuccess: (data) => {
      setExtraction(data.extraction);
      setStep('understanding');
    },
    onError: () => toast.error('Could not analyze your request. Please try again.')
  });

  const submitMut = useMutation({
    mutationFn: (q: string) => requirementApi.create({ raw_query: q }).then(r => r.data),
    onSuccess: (data) => {
      setRequirement(data.requirement);
      setMatches(data.matches || []);
      setStep('matches');
      if (data.matches?.length > 0) {
        toast.success(`Found ${data.matches.length} campus matches!`);
      } else {
        toast('No matches yet. You\'ll be notified when resources become available.', { icon: '🔔' });
      }
    },
    onError: () => toast.error('Failed to submit requirement')
  });

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 10) {
      toast.error('Please describe what you need in more detail');
      return;
    }
    extractMut.mutate(query);
  };

  const handleConfirm = () => {
    submitMut.mutate(query);
  };

  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-page font-bold text-brand mb-1">Post a Need</h1>
        <p className="text-ink-muted text-sm">Describe what you're looking for — AI will understand and find campus matches.</p>
      </div>

      {/* Step: Input */}
      {step === 'input' && (
        <div className="card p-8 animate-fade-in">
          <div className="flex items-center gap-2 text-ink-subtle text-sm mb-6">
            <Sparkles size={14} className="text-accent" />
            AI-powered requirement understanding
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xl font-semibold text-brand mb-3">
                What are you trying to find or build?
              </label>
              <textarea
                className="textarea h-32 text-base"
                placeholder="Example: I need a microcontroller with Wi-Fi for an IoT project for 2 weeks. Prefer something Arduino-compatible and low-cost."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              <div className="mt-1.5 text-xs text-ink-subtle">
                Be specific — mention type, features, duration, and purpose for best results.
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {[
                'I need a microcontroller with Wi-Fi for an IoT project for 10 days',
                'Looking for a DSLR camera for college fest this weekend',
                'Need Arduino kit for electronics lab assignment',
                'Oscilloscope for debugging circuit for 3 days',
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className="text-xs px-3 py-1.5 bg-surface-muted rounded-full text-ink-muted hover:text-brand hover:bg-surface border border-border transition-colors"
                >
                  {example.slice(0, 50)}…
                </button>
              ))}
            </div>

            <button type="submit" disabled={extractMut.isPending || !query.trim()}
              className="btn btn-accent py-3 px-8 text-base disabled:opacity-60">
              {extractMut.isPending ? (
                <><Loader2 size={18} className="animate-spin" /> Analyzing…</>
              ) : (
                <><Sparkles size={18} /> Analyze with AI</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Step: AI Understanding */}
      {step === 'understanding' && extraction && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-6">
            <div className="flex items-center gap-2 text-brand mb-4">
              <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                <Sparkles size={12} />
              </div>
              <span className="font-medium">AI understood your request as:</span>
            </div>

            <div className="bg-surface-muted rounded-xl p-4 border border-border mb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Category', value: extraction.category },
                  { label: 'Resource Type', value: extraction.resource_type },
                  { label: 'Purpose', value: extraction.purpose },
                  { label: 'Duration', value: extraction.duration_days ? `${extraction.duration_days} days` : 'Not specified' },
                  { label: 'Urgency', value: extraction.urgency },
                  { label: 'Budget', value: extraction.budget_preference || 'Not specified' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="text-ink-subtle text-xs">{item.label}</div>
                    <div className="text-brand font-medium capitalize mt-0.5">{item.value || '—'}</div>
                  </div>
                ))}
              </div>

              {extraction.functional_requirements?.length > 0 && (
                <div className="mt-3">
                  <div className="text-ink-subtle text-xs mb-1.5">Functional Requirements</div>
                  <div className="flex flex-wrap gap-1.5">
                    {extraction.functional_requirements.map((req: string) => (
                      <span key={req} className="flex items-center gap-1 px-2.5 py-1 bg-surface rounded-full text-xs text-brand border border-border">
                        <CheckCircle size={10} className="text-green-600" />
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 bg-brand/5 rounded-xl text-sm text-ink-muted mb-4">
              <AlertCircle size={14} className="text-brand flex-shrink-0 mt-0.5" />
              <span>AI-extracted understanding. You can correct any details by going back and rephrasing.</span>
            </div>

            <div className="text-sm text-ink-muted mb-4">
              <strong className="text-brand">Your query:</strong> &ldquo;{query}&rdquo;
            </div>

            <div className="flex gap-3">
              <button onClick={handleConfirm} disabled={submitMut.isPending} className="btn btn-primary py-2.5 px-6">
                {submitMut.isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Finding Matches…</>
                ) : (
                  <>Find Campus Matches <ArrowRight size={16} /></>
                )}
              </button>
              <button onClick={() => { setStep('input'); setExtraction(null); }} className="btn btn-ghost">
                Edit Query
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Matches */}
      {step === 'matches' && (
        <div className="space-y-5 animate-fade-in">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-brand mb-0.5">Requirement Posted</div>
                <div className="text-ink-muted text-sm">&ldquo;{query}&rdquo;</div>
              </div>
              <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
            </div>
          </div>

          {matches.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold text-brand mb-4">
                {matches.length} Campus Resource{matches.length !== 1 ? 's' : ''} Found
              </h2>
              <div className="space-y-4">
                {matches.map((match: any) => (
                  <div key={match.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <Link to={`/app/resources/${match.id}`} className="font-semibold text-brand hover:underline">
                        {match.title}
                      </Link>
                      <MatchScoreBadge score={match.score} />
                    </div>

                    {/* Score breakdown */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {Object.entries(match.score_breakdown || {}).slice(0, 3).map(([k, v]: [string, any]) => (
                        <div key={k} className="bg-surface-muted rounded-lg p-2 text-center">
                          <div className="text-sm font-semibold text-brand">{v}%</div>
                          <div className="text-[10px] text-ink-subtle capitalize">{k.replace(/_/g, ' ')}</div>
                        </div>
                      ))}
                    </div>

                    {/* Explanation */}
                    {match.explanation_points?.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {match.explanation_points.map((pt: string) => (
                          <div key={pt} className="flex items-start gap-2 text-sm text-ink-muted">
                            <CheckCircle size={13} className="text-green-600 flex-shrink-0 mt-0.5" />
                            {pt}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Limitations */}
                    {match.limitations?.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {match.limitations.map((lim: string) => (
                          <div key={lim} className="flex items-start gap-2 text-sm text-amber-600">
                            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                            {lim}
                          </div>
                        ))}
                      </div>
                    )}

                    <Link to={`/app/resources/${match.id}`} className="btn btn-primary text-sm">
                      View & Request <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="text-4xl mb-3">🔔</div>
              <h3 className="text-xl font-semibold text-brand mb-2">No exact matches yet</h3>
              <p className="text-ink-muted text-sm mb-4">
                Your requirement has been saved. You'll be notified when matching resources become available on campus.
              </p>
              <div className="flex justify-center gap-3">
                <Link to="/app/search" className="btn btn-outline">Browse All Resources</Link>
                <button onClick={() => { setStep('input'); setQuery(''); setExtraction(null); }} className="btn btn-ghost">
                  Post Another Need
                </button>
              </div>
            </div>
          )}

          <button onClick={() => { setStep('input'); setQuery(''); setExtraction(null); setMatches([]); }}
            className="btn btn-ghost">
            Post Another Need
          </button>
        </div>
      )}
    </div>
  );
}
