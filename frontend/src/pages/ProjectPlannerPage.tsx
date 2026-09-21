import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../api';
import toast from 'react-hot-toast';
import { Sparkles, CheckCircle, X, Loader2, TrendingUp, Package, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProjectPlannerPage() {
  const [project, setProject] = useState('');
  const [result, setResult] = useState<any>(null);

  const planMut = useMutation({
    mutationFn: (desc: string) => aiApi.projectPlan(desc).then(r => r.data),
    onSuccess: (data) => {
      setResult(data);
      toast.success('Project plan generated!');
    },
    onError: () => toast.error('Could not generate plan. Try again.')
  });

  const examples = [
    'Smart irrigation system for rooftop garden',
    'Autonomous obstacle-avoiding robot',
    'Weather station with display and data logging',
    'Smart door lock system with RFID',
    'Line-following robot',
    'Home automation system with voice control'
  ];

  return (
    <div className="p-6 max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-page font-bold text-brand mb-1">AI Project Planner</h1>
        <p className="text-ink-muted text-sm">
          Tell the AI what you're building. It will generate a component list and find what's already on campus.
        </p>
      </div>

      {/* Input */}
      {!result && (
        <div className="card p-8 animate-fade-in">
          <div className="flex items-center gap-2 text-ink-subtle text-sm mb-5">
            <Sparkles size={14} className="text-accent" />
            Powered by AI — campus resource awareness
          </div>

          <label className="block text-xl font-semibold text-brand mb-3">
            What are you building?
          </label>
          <textarea
            className="textarea h-24 text-base mb-4"
            placeholder="e.g. Smart irrigation system using IoT sensors and ESP32"
            value={project}
            onChange={e => setProject(e.target.value)}
            autoFocus
          />

          <div className="mb-5">
            <div className="text-xs text-ink-subtle mb-2 uppercase tracking-wide">Examples:</div>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button key={ex} onClick={() => setProject(ex)}
                  className="text-xs px-3 py-1.5 bg-surface-muted rounded-full text-ink-muted hover:text-brand hover:bg-surface border border-border transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => planMut.mutate(project)}
            disabled={planMut.isPending || !project.trim()}
            className="btn btn-accent py-3 px-8 text-base disabled:opacity-60"
          >
            {planMut.isPending ? (
              <><Loader2 size={18} className="animate-spin" /> Planning…</>
            ) : (
              <><Sparkles size={18} /> Generate Project Plan</>
            )}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-5 animate-fade-in">
          {/* Summary */}
          <div className="bg-brand rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-accent/70 text-xs uppercase tracking-widest mb-1">Project Plan</div>
                <h2 className="text-2xl font-bold">{result.plan.project_name}</h2>
              </div>
              <button onClick={() => { setResult(null); setProject(''); }} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Components', value: result.plan.components.length },
                { label: 'On Campus', value: result.summary.available_on_campus },
                { label: 'Match Coverage', value: `${result.summary.match_coverage_percent}%` },
                { label: 'Est. Savings', value: `₹${result.summary.estimated_savings_inr.toLocaleString()}` },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-2xl font-bold">{item.value}</div>
                  <div className="text-white/50 text-xs mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>Campus Resource Coverage</span>
                <span>{result.summary.match_coverage_percent}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-1000"
                  style={{ width: `${result.summary.match_coverage_percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Component list */}
          <div>
            <h3 className="text-xl font-semibold text-brand mb-4">Component Checklist</h3>
            <div className="space-y-3">
              {result.plan.components.map((comp: any) => (
                <div key={comp.name} className={`card p-4 border-l-4 ${
                  comp.available_on_campus ? 'border-l-green-500' :
                  comp.priority === 'required' ? 'border-l-amber-400' :
                  'border-l-border'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        comp.available_on_campus ? 'bg-green-50 text-green-600' : 'bg-surface-muted text-ink-subtle'
                      }`}>
                        {comp.available_on_campus ? <CheckCircle size={14} /> : <X size={12} />}
                      </div>
                      <div>
                        <div className="font-medium text-brand">{comp.name}
                          <span className="ml-2 text-xs text-ink-subtle">×{comp.quantity}</span>
                        </div>
                        <div className="text-ink-muted text-sm mt-0.5">{comp.purpose}</div>
                        {comp.alternatives?.length > 0 && (
                          <div className="text-ink-subtle text-xs mt-1">
                            Alternatives: {comp.alternatives.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`pill ${comp.priority === 'required' ? 'bg-brand/10 text-brand' : 'bg-surface-muted text-ink-subtle border border-border'}`}>
                        {comp.priority}
                      </span>
                      {comp.available_on_campus && (
                        <span className="text-xs text-green-700 font-medium">{comp.campus_matches.length} on campus</span>
                      )}
                    </div>
                  </div>

                  {/* Campus matches */}
                  {comp.campus_matches?.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {comp.campus_matches.slice(0, 2).map((m: any) => (
                        <Link key={m.id} to={`/app/resources/${m.id}`}
                          className="flex items-center justify-between px-3 py-2 bg-surface-muted rounded-xl text-sm hover:bg-surface transition-colors">
                          <span className="text-brand font-medium truncate">{m.title}</span>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-ink-subtle text-xs">{m.location || m.building || 'On campus'}</span>
                            <ArrowRight size={12} className="text-ink-subtle" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Impact note */}
          <div className="card-flat p-4 flex items-center gap-3">
            <TrendingUp size={18} className="text-green-600 flex-shrink-0" />
            <div className="text-sm text-ink-muted">
              <strong className="text-brand">Estimated impact:</strong> Avoiding {result.summary.available_on_campus} purchases
              could save approximately <strong className="text-green-700">₹{result.summary.estimated_savings_inr.toLocaleString()}</strong>.
              <span className="text-ink-subtle"> (Estimate only — actual prices may vary)</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link to="/app/post-need" className="btn btn-primary">
              <Package size={16} /> Post a Need for Missing Items
            </Link>
            <button onClick={() => { setResult(null); setProject(''); }} className="btn btn-ghost">
              Plan Another Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
