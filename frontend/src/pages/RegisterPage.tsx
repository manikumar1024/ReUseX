import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { ArrowRight, Eye, EyeOff, Recycle } from 'lucide-react';

// Roles that can be self-registered (matches backend restriction)
const ROLES = [
  { value: 'student',     label: 'Student' },
  { value: 'faculty',     label: 'Faculty' },
  { value: 'lab_manager', label: 'Lab Manager' },
  { value: 'club_org',    label: 'Club / Organization' },
];

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex">
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
            Join your campus<br />resource network.
          </h2>
          <p className="text-white/50 leading-relaxed text-sm">
            Share what you have. Borrow what you need.
            Build a more sustainable campus — together.
          </p>
        </div>
        <p className="text-white/20 text-xs">Impact figures are estimates only.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
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

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'student', building: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (form.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters.');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword: _, ...submitData } = form;
      const res = await authApi.register({
        ...submitData,
        name: submitData.name.trim(),
        email: submitData.email.trim().toLowerCase(),
        building: submitData.building.trim() || undefined,
      });
      setAuth(res.data.user, res.data.token);
      toast.success('Welcome to ReUseX!');
      navigate('/app');
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg === 'Email already registered') {
        toast.error('An account with this email already exists.');
      } else if (err.response?.data?.details) {
        // Zod validation details
        toast.error(err.response.data.details[0]?.message || 'Please check your input.');
      } else {
        toast.error(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = !form.confirmPassword || form.password === form.confirmPassword;

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">Create account</h1>
      <p className="text-sm text-ink-muted mb-7">Join your campus resource network.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" type="text" className="input" placeholder="Your name"
            value={form.name} onChange={e => set('name', e.target.value)} required autoFocus />
        </div>

        <div>
          <label className="label" htmlFor="reg-email">Email address</label>
          <input id="reg-email" type="email" className="input" placeholder="you@campus.edu"
            value={form.email} onChange={e => set('email', e.target.value)} required />
        </div>

        <div>
          <label className="label" htmlFor="role">Role</label>
          <select id="role" className="input" value={form.role} onChange={e => set('role', e.target.value)}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="building">
            Building / Block <span className="text-ink-subtle font-normal">(optional)</span>
          </label>
          <input id="building" type="text" className="input" placeholder="e.g. Electronics Block"
            value={form.building} onChange={e => set('building', e.target.value)} />
        </div>

        <div>
          <label className="label" htmlFor="reg-password">Password</label>
          <div className="relative">
            <input id="reg-password" type={showPw ? 'text' : 'password'} className="input pr-10"
              placeholder="Min 8 characters"
              value={form.password} onChange={e => set('password', e.target.value)}
              required minLength={8} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted"
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password"
            type={showPw ? 'text' : 'password'}
            className={`input ${!passwordsMatch ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
            placeholder="Re-enter password"
            value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
            required autoComplete="new-password" />
          {!passwordsMatch && (
            <p className="text-xs text-danger mt-1">Passwords do not match.</p>
          )}
        </div>

        <button type="submit" disabled={loading || !passwordsMatch}
          className="btn-primary w-full justify-center py-2.5 disabled:opacity-60">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating account…
            </span>
          ) : (
            <span className="flex items-center gap-2">Create account <ArrowRight size={14} /></span>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-brand font-medium hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
