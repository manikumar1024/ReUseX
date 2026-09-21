import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { useAuthStore } from './store';
import AppLayout from './components/layout/AppLayout';

// Eager-loaded core pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';

// Lazy-loaded app pages for better performance
const SearchPage          = lazy(() => import('./pages/SearchPage'));
const ResourceDetailPage  = lazy(() => import('./pages/ResourceDetailPage'));
const PostNeedPage        = lazy(() => import('./pages/PostNeedPage'));
const ShareResourcePage   = lazy(() => import('./pages/ShareResourcePage'));
const MyLoansPage         = lazy(() => import('./pages/MyLoansPage'));
const MyResourcesPage     = lazy(() => import('./pages/MyResourcesPage'));
const ImpactPage          = lazy(() => import('./pages/ImpactPage'));
const ProjectPlannerPage  = lazy(() => import('./pages/ProjectPlannerPage'));
const AdminDashboardPage  = lazy(() => import('./pages/AdminDashboardPage'));
const PurchaseCheckPage   = lazy(() => import('./pages/PurchaseCheckPage'));
const KnowledgePage       = lazy(() => import('./pages/KnowledgePage'));
const NotificationsPage   = lazy(() => import('./pages/NotificationsPage'));
const ArchitecturePage    = lazy(() => import('./pages/ArchitecturePage'));
const ProfilePage         = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage        = lazy(() => import('./pages/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false
    }
  }
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!['campus_admin', 'department_admin'].includes(user?.role || '')) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-5 h-5 border-2 border-border border-t-brand rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="resources/:id" element={<ResourceDetailPage />} />
              <Route path="post-need" element={<PostNeedPage />} />
              <Route path="share" element={<ShareResourcePage />} />
              <Route path="loans" element={<MyLoansPage />} />
              <Route path="resources" element={<MyResourcesPage />} />
              <Route path="impact" element={<ImpactPage />} />
              <Route path="planner" element={<ProjectPlannerPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="purchase-check" element={<PurchaseCheckPage />} />
              <Route path="architecture" element={<ArchitecturePage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#17211B',
            color: '#F7F7F4',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 4px 12px rgba(23,33,27,0.15)',
          },
          success: { iconTheme: { primary: '#B7E35A', secondary: '#163C2A' } },
          error:   { iconTheme: { primary: '#C94A4A', secondary: '#F7F7F4' } },
        }}
      />
    </QueryClientProvider>
  );
}
