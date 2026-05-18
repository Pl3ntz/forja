import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router'
import { motion } from 'framer-motion'
import { AuthContext, useAuth, useAuthProvider } from './hooks/useAuth.js'
import Brand from './components/Brand.js'
import AppLayout from './layouts/AppLayout.js'
import AuthLayout from './layouts/AuthLayout.js'
import EditorLayout from './layouts/EditorLayout.js'
import HomePage from './pages/HomePage.js'
import LoginPage from './pages/LoginPage.js'
import RegisterPage from './pages/RegisterPage.js'
import ForgotPasswordPage from './pages/ForgotPasswordPage.js'
import DashboardPage from './pages/DashboardPage.js'
import EditorPage from './pages/EditorPage.js'
import CoverLetterEditorPage from './pages/CoverLetterEditorPage.js'
import SettingsPage from './pages/SettingsPage.js'
import AdminDashboardPage from './pages/AdminDashboardPage.js'
import AdminUsersPage from './pages/AdminUsersPage.js'
import AdminUserDetailPage from './pages/AdminUserDetailPage.js'
import NotFoundPage from './pages/NotFoundPage.js'
import AtsAnalysisPage from './pages/AtsAnalysisPage.js'
import AdminFeedbackPage from './pages/AdminFeedbackPage.js'
import SupportPage from './pages/SupportPage.js'

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth/login" replace />
  return <Outlet />
}

function RequireAdmin() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

function RedirectIfAuth() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-forge-950 flex flex-col items-center justify-center gap-4"
    >
      <Brand iconSize={48} textClassName="text-2xl" className="animate-pulse" />
      <div className="w-6 h-6 border-2 border-forge-600 border-t-ember-500 rounded-full animate-spin" />
    </motion.div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/analise-ats',
    element: <AtsAnalysisPage />,
  },
  {
    path: '/apoie',
    element: <SupportPage />,
  },
  {
    element: <RedirectIfAuth />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/auth/login', element: <LoginPage /> },
          { path: '/auth/register', element: <RegisterPage /> },
          { path: '/auth/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
      {
        element: <EditorLayout />,
        children: [
          { path: '/editor/:cvId', element: <EditorPage /> },
          { path: '/cover-letter/:coverLetterId', element: <CoverLetterEditorPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/admin', element: <AdminDashboardPage /> },
          { path: '/admin/users', element: <AdminUsersPage /> },
          { path: '/admin/users/:userId', element: <AdminUserDetailPage /> },
          { path: '/admin/feedback', element: <AdminFeedbackPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export function App() {
  const auth = useAuthProvider()

  return (
    <AuthContext value={auth}>
      <RouterProvider router={router} />
    </AuthContext>
  )
}
