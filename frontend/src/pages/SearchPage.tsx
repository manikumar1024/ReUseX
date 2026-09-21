import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi, resourceApi } from '../api';
import {
  Search, Filter, MapPin, Star, CheckCircle, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

const DEFAULT_CATEGORIES = [
  { slug: '', label: 'All' },
  { slug: 'electronics', label: 'Electronics' },
  { slug: 'computing', label: 'Computing' },
  { slug: 'books', label: 'Books' },
  { slug: 'laboratory', label: 'Laboratory' },
  { slug: 'furniture', label: 'Furniture' },
  { slug: 'sports', label: 'Sports' },
  { slug: 'tools', label: 'Tools' },
  { slug: 'events', label: 'Events' },
];

const MODES = [
  { value: '', label: 'Any mode' },
  { value: 'borrow', label: 'Borrow' },
  { value: 'give', label: 'Free Give' },
  { value: 'exchange', label: 'Exchange' },
  { value: 'low_cost_sale', label: 'Low-cost Sale' },
];

const CONDITIONS = [
  { value: '', label: 'Any condition' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

function MatchScore({ score }: { score: number }) {
  const color = score >= 85 ? '#163C2A' : score >= 70 ? '#D4890A' : '#7A9487';
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="#E1E5DF" strokeWidth="4" />
        <circle
          cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState('');
  const [condition, setCondition] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const PAGE_SIZE = 12;

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1); // reset to page 1 on query change
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Fetch live categories from backend
  const { data: catData } = useQuery({
    queryKey: ['resource-categories-list'],
    queryFn: async () => {
      try {
        const res = await resourceApi.categories();
        return res.data?.categories || [];
      } catch {
        return [];
      }
    }
  });

  const categories = catData && catData.length > 0
    ? [{ slug: '', label: 'All' }, ...catData.map((c: any) => ({ slug: c.slug, label: c.name }))]
    : DEFAULT_CATEGORIES;

  const { data: searchData, isLoading, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery, category, mode, condition, page],
    queryFn: () =>
      searchApi.search(debouncedQuery, {
        ...(category && { category }),
        ...(mode && { mode }),
        ...(condition && { condition }),
        page: String(page),
        limit: String(PAGE_SIZE),
      }).then((r) => r.data),
    staleTime: 20000,
  });

  const results = searchData?.results || [];
  const total = searchData?.total || results.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handleCategoryChange = (slug: string) => {
    setCategory(slug);
    setPage(1);
  };

  const handleModeChange = (val: string) => {
    setMode(val);
    setPage(1);
  };

  const handleConditionChange = (val: string) => {
    setCondition(val);
    setPage(1);
  };

  const SAMPLE_QUERIES = [
    'Wi-Fi microcontroller for IoT project',
    'Oscilloscope for physics lab',
    'DSLR camera for campus event',
    'Calculus textbook 8th edition',
    'Soldering iron kit',
    'HDMI monitor for demo',
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Search header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-1">Discover Campus Resources</h1>
        <p className="text-ink-muted text-sm">
          Natural semantic search powered by AI — find lab equipment, electronics, and books near you.
        </p>
      </div>

      {/* Search input bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            ref={inputRef}
            type="search"
            className="w-full pl-11 pr-10 py-3 bg-surface-card border border-border rounded-xl text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-sm"
            placeholder="Search items, specs, or projects (e.g. &quot;Wi-Fi microcontroller for IoT experiment&quot;)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search resources"
            autoFocus
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setDebouncedQuery(''); setPage(1); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-3 border rounded-xl text-sm font-medium transition-colors shadow-sm',
            showFilters || category || mode || condition
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-white border-border text-ink hover:bg-surface-alt'
          )}
        >
          <Filter size={16} />
          <span>Filters</span>
          {(category || mode || condition) && (
            <span className="w-2 h-2 bg-emerald-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Filters Tray */}
      {showFilters && (
        <div className="p-4 bg-surface-card rounded-2xl border border-border space-y-4 shadow-sm animate-fade-in">
          <div>
            <div className="text-xs text-ink-subtle mb-2 font-semibold uppercase tracking-wider">
              Category
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c: any) => (
                <button
                  key={c.slug}
                  onClick={() => handleCategoryChange(c.slug)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    category === c.slug
                      ? 'bg-emerald-700 text-white'
                      : 'bg-surface-alt text-ink-muted hover:bg-surface hover:text-ink border border-border'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2 border-t border-border">
            <div>
              <label className="block text-xs text-ink-subtle mb-1 font-semibold uppercase tracking-wider">
                Mode
              </label>
              <select
                value={mode}
                onChange={(e) => handleModeChange(e.target.value)}
                className="px-3 py-1.5 bg-surface border border-border rounded-xl text-xs text-ink focus:outline-none focus:border-emerald-600"
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-ink-subtle mb-1 font-semibold uppercase tracking-wider">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => handleConditionChange(e.target.value)}
                className="px-3 py-1.5 bg-surface border border-border rounded-xl text-xs text-ink focus:outline-none focus:border-emerald-600"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {(category || mode || condition) && (
              <button
                onClick={() => { setCategory(''); setMode(''); setCondition(''); setPage(1); }}
                className="self-end text-xs text-rose-600 hover:text-rose-700 font-medium py-1.5"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Suggested Queries */}
      {!query && !isLoading && (
        <div>
          <div className="text-xs text-ink-subtle mb-2 uppercase tracking-wider font-semibold">
            Common searches:
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); setPage(1); }}
                className="px-3 py-1.5 bg-surface-card rounded-full text-xs text-ink-muted hover:text-emerald-700 hover:border-emerald-300 border border-border transition-colors shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {(isLoading || isFetching) && (
        <div className="flex items-center gap-2 text-ink-muted text-sm py-4">
          <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
          <span>Searching campus inventory...</span>
        </div>
      )}

      {/* Results Section */}
      {!isLoading && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-ink-muted">
            <span>
              Showing <strong className="text-ink">{results.length}</strong> items
              {total > results.length ? ` (of ${total} total)` : ''}
              {debouncedQuery && <span> for &ldquo;{debouncedQuery}&rdquo;</span>}
            </span>
            {totalPages > 1 && (
              <span className="text-xs text-ink-subtle">
                Page {page} of {totalPages}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {results.map((resource: any) => (
              <ResourceResultCard key={resource.id} resource={resource} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-border">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-sm font-medium bg-surface-card hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && page > 3) {
                    pageNum = page - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={clsx(
                        'w-8 h-8 rounded-xl text-xs font-semibold transition-colors',
                        page === pageNum
                          ? 'bg-emerald-700 text-white'
                          : 'bg-surface-card text-ink-muted hover:bg-surface-alt border border-border'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-sm font-medium bg-surface-card hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && debouncedQuery && results.length === 0 && (
        <div className="bg-surface-card border border-border rounded-2xl p-12 text-center max-w-md mx-auto my-8 shadow-sm">
          <div className="w-16 h-16 bg-surface-alt text-ink-subtle rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search size={28} />
          </div>
          <h3 className="text-lg font-bold text-ink mb-1">No matching items found</h3>
          <p className="text-ink-muted text-xs mb-6 leading-relaxed">
            We couldn't find items matching &ldquo;{debouncedQuery}&rdquo;. Try broadening your keywords, or post a request so peers are notified when it becomes available.
          </p>
          <Link
            to="/app/post-need"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Post a Need Instead
          </Link>
        </div>
      )}
    </div>
  );
}

function ResourceResultCard({ resource }: { resource: any }) {
  const hasScore = resource.semantic_score && resource.semantic_score > 0;
  const displayScore = hasScore ? Math.round(resource.semantic_score * 100) : 0;

  return (
    <Link
      to={`/app/resources/${resource.id}`}
      className="bg-surface-card border border-border hover:border-border-hover rounded-2xl p-5 flex gap-4 transition-all shadow-sm block group"
    >
      <div className="w-20 h-20 bg-surface-alt rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-border">
        {resource.primary_image ? (
          <img src={resource.primary_image} alt={resource.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">{getCategoryEmoji(resource.category_slug)}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-bold text-ink text-base leading-tight group-hover:text-emerald-700 transition-colors truncate">
            {resource.title}
          </h3>
          <div className="flex-shrink-0 flex items-center gap-2">
            {hasScore && displayScore > 50 && <MatchScore score={displayScore} />}
          </div>
        </div>

        <p className="text-ink-muted text-xs line-clamp-2 mb-3">
          {resource.description}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full font-semibold ${
            resource.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {resource.status}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-surface-alt text-ink font-medium capitalize">
            {resource.condition}
          </span>
          <span className="text-ink-subtle capitalize">
            {resource.mode?.replace(/_/g, ' ')}
          </span>
          {(resource.location || resource.building) && (
            <span className="flex items-center gap-1 text-ink-subtle">
              <MapPin size={12} />
              {resource.location || resource.building}
            </span>
          )}
          {resource.owner_name && (
            <span className="flex items-center gap-1 text-ink-subtle">
              <Star size={12} className="text-amber-500" />
              {resource.owner_name} {resource.department_name ? `· ${resource.department_name}` : ''}
            </span>
          )}
        </div>

        {hasScore && displayScore >= 70 && (
          <div className="mt-2.5 text-xs text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle size={13} />
            <span>Semantically matched to your query</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function getCategoryEmoji(slug: string): string {
  const map: Record<string, string> = {
    electronics: '🔌',
    computing: '💻',
    books: '📚',
    laboratory: '🔬',
    furniture: '🪑',
    sports: '⚽',
    tools: '🔧',
    events: '🎤',
    other: '📦',
  };
  return map[slug] || '📦';
}
