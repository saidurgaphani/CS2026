import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignInPageDemo from './components/SignInDemo';
import Dashboard from './pages/Dashboard';
import { AuthProvider } from './lib/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import InsightsVault from './pages/InsightsVault';
import DataChat from './pages/DataChat';

import { ThemeProvider } from './lib/ThemeContext';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="insightra-theme">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<SignInPageDemo />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/insights"
              element={
                <ProtectedRoute>
                  <InsightsVault />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <DataChat />
                </ProtectedRoute>
              }
            />
            {/* Catch all - redirect to root Landing Page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
