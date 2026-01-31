import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage'
import SignInPageDemo from './components/SignInDemo'
import Dashboard from './pages/Dashboard'
import { AuthProvider } from './lib/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<SignInPageDemo />} />
          <Route path="/Home" element={<HomePage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/* Redirect root: if authed -> dashboard, else -> Home */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {/* Catch all - redirect to /dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

