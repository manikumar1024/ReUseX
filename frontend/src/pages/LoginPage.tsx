import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, Recycle } from 'lucide-react';

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-brand p-12">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-brand font-bold text-sm leading-none">RX</span>
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">ReUseX</span>
        </div>

        <div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
            <Recycle size={24} className="text-accent" />
          </div>
          <h2 className="text-3xl font-semibold text-white leading-tight mb-4">
            Give unused things<br />a second life.
          </h2>
          <p className="text-white/50 leading-relaxed text-sm">
            Campus resource sharing made intelligent. Borrow, lend and donate
            within your campus community — powered by AI matching.
          </p>
        </div>

        <p className="text-white/20 text-xs">
          Impact figures are estimates only.
        </p>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center">
              <span className="text-accent font-bold text-xs leading-none">RX</span>
            </div>
            <Link to="/" className="font-semibold text-ink text-[15px] tracking-tight">ReUseX</Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const res = await authApi.login(email.trim(), password);
      setAuth(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name.split(' ')[0]}!`);
      navigate('/app');
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg === 'Invalid email or password') {
        toast.error('Email or password is incorrect.');
      } else if (err.response?.status === 429) {
        toast.error('Too many attempts. Please wait a moment.');
      } else {
        toast.error(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">Welcome back</h1>
      <p className="text-sm text-ink-muted mb-7">Sign in to your campus resource network.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email address</label>
          <input
            id="email" type="email" className="input" autoComplete="email"
            placeholder="you@campus.edu" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password" type={showPw ? 'text' : 'password'} className="input pr-10"
              placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
            />
            <button
              type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <button
          type="submit" disabled={loading}
          className="btn-primary w-full justify-center py-2.5 disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-2">Sign in <ArrowRight size={14} /></span>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand font-medium hover:underline">Create account</Link>
      </p>
    </AuthShell>
  );
}
