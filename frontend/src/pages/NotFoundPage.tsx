import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-[120px] font-bold text-border leading-none mb-4">404</div>
        <h1 className="text-section font-bold text-brand mb-3">Page not found</h1>
        <p className="text-ink-muted mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex justify-center gap-3">
          <Link to="/" className="btn btn-primary"><Home size={16} /> Home</Link>
          <Link to="/app/search" className="btn btn-outline"><Search size={16} /> Find Resources</Link>
        </div>
      </div>
    </div>
  );
}
