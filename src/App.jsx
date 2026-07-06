import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import Layout from './components/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import TodayPage from './pages/TodayPage.jsx'
import IdeasPage from './pages/IdeasPage.jsx'
import GoalsPage from './pages/GoalsPage.jsx'
import GoalDetailPage from './pages/GoalDetailPage.jsx'
import SprintPage from './pages/SprintPage.jsx'
import HabitsPage from './pages/HabitsPage.jsx'
import StatsPage from './pages/StatsPage.jsx'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="spinner-center">Der Wald erwacht …</div>
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <ToastProvider>
      <Layout>
        <Routes>
        {/* "Heute" ist der Standard-Startbildschirm */}
        <Route path="/" element={<TodayPage />} />
        <Route path="/ideen" element={<IdeasPage />} />
        <Route path="/ziele" element={<GoalsPage />} />
        <Route path="/ziele/:goalId" element={<GoalDetailPage />} />
        <Route path="/sprint" element={<SprintPage />} />
        <Route path="/gewohnheiten" element={<HabitsPage />} />
        <Route path="/erfolge" element={<StatsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ToastProvider>
  )
}
