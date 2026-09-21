import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ragApi } from '../api';
import toast from 'react-hot-toast';
import { MessageSquare, Book, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const SAMPLE_QUESTIONS = [
  'What is the borrowing period for laboratory equipment?',
  'How do I request a resource on ReUseX?',
  'What happens if a borrowed item is damaged?',
  'Can I use laboratory equipment for commercial projects?',
  'What is the campus policy on resource reuse priority?',
  'How are purchase requests handled if campus resources exist?'
];

export default function KnowledgePage() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<Array<{ q: string; a: any }>>([]);

  const queryMut = useMutation({
    mutationFn: (q: string) => ragApi.query(q).then(r => r.data),
    onSuccess: (data, vars) => {
      setHistory(h => [...h, { q: vars, a: data }]);
      setQuestion('');
    },
    onError: () => toast.error('Failed to query knowledge base')
  });

  const handleAsk = (q?: string) => {
    const text = q || question;
    if (!text.trim()) return;
    queryMut.mutate(text);
  };

  const confidenceLabel = (c: string) => {
    switch (c) {
      case 'high': return { label: 'High confidence', icon: <CheckCircle size={14} className="text-green-600" /> };
      case 'medium': return { label: 'Based on campus documents', icon: <CheckCircle size={14} className="text-amber-500" /> };
      case 'not_found': return { label: 'Not found in knowledge base', icon: <AlertCircle size={14} className="text-ink-subtle" /> };
      default: return { label: 'Low confidence', icon: <AlertCircle size={14} className="text-amber-500" /> };
    }
  };

  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-page font-bold text-brand mb-1">Campus Knowledge Base</h1>
        <p className="text-ink-muted text-sm">
          Ask questions about campus policies, borrowing rules, and sustainability guidelines.
          Answers are generated from official campus documents using AI (RAG).
        </p>
      </div>

      {/* RAG explanation */}
      <div className="card-flat p-4 flex items-start gap-3 mb-6">
        <Book size={16} className="text-brand flex-shrink-0 mt-0.5" />
        <div className="text-sm text-ink-muted">
          <strong className="text-brand">Retrieval-Augmented Generation:</strong> Your question is matched against
          official campus policy documents. The AI generates answers grounded in those documents only.
          If information isn't found, the system will tell you rather than guess.
        </div>
      </div>

      {/* Sample questions */}
      {history.length === 0 && (
        <div className="mb-6">
          <div className="text-xs text-ink-subtle uppercase tracking-wide font-medium mb-3">Try asking:</div>
          <div className="space-y-2">
            {SAMPLE_QUESTIONS.map((q) => (
              <button key={q} onClick={() => handleAsk(q)}
                className="w-full text-left px-4 py-3 bg-surface-muted rounded-xl text-sm text-ink-muted hover:text-brand hover:bg-surface border border-border transition-colors flex items-center justify-between gap-2">
                <span>{q}</span>
                <MessageSquare size={14} className="flex-shrink-0 text-ink-subtle" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation history */}
      {history.length > 0 && (
        <div className="space-y-6 mb-6">
          {history.map((item, i) => (
            <div key={i} className="space-y-3">
              {/* Question */}
              <div className="flex justify-end">
                <div className="max-w-lg bg-brand text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
                  {item.q}
                </div>
              </div>

              {/* Answer */}
              <div className="flex justify-start">
                <div className="max-w-2xl card p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs text-ink-subtle">
                    {confidenceLabel(item.a.confidence).icon}
                    {confidenceLabel(item.a.confidence).label}
                  </div>
                  <p className="text-ink-muted text-sm leading-relaxed whitespace-pre-line">{item.a.answer}</p>

                  {item.a.sources?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="text-xs text-ink-subtle mb-1.5 font-medium">Sources:</div>
                      {item.a.sources.map((source: any, j: number) => (
                        <div key={j} className="flex items-start gap-2 text-xs text-ink-subtle">
                          <Book size={10} className="mt-0.5 flex-shrink-0" />
                          <span className="font-medium text-brand">{source.title}</span>
                          {source.excerpt && <span className="ml-1">— {source.excerpt.substring(0, 80)}…</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-ink-subtle italic">
                    {item.a.responsible_ai_note}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-4">
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Ask about campus policies, borrowing rules…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAsk()}
          />
          <button
            onClick={() => handleAsk()}
            disabled={queryMut.isPending || !question.trim()}
            className="btn btn-primary px-5 disabled:opacity-60"
          >
            {queryMut.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Ask'}
          </button>
        </div>
        {history.length > 0 && (
          <button onClick={() => setHistory([])} className="btn btn-ghost text-xs mt-2">Clear conversation</button>
        )}
      </div>
    </div>
  );
}
