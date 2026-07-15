import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
import { PublicSearch } from './pages/PublicSearch';
import { Dashboard } from './pages/Dashboard';
import { Computadores } from './pages/Computadores';
import { OrdensServico } from './pages/OrdensServico';
import { Tecnicos } from './pages/Tecnicos';
import { Wifi } from './pages/Wifi';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Search Screen */}
          <Route path="/consulta" element={<PublicSearch />} />
          
          {/* Login Screen */}
          <Route path="/login" element={<Login />} />

          {/* Protected Administrative Screens */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/computadores" element={<Computadores />} />
              <Route path="/ordens" element={<OrdensServico />} />
              <Route path="/wifi" element={<Wifi />} />
              
              {/* Admin Only Screens */}
              <Route element={<ProtectedRoute requireAdmin />}>
                <Route path="/tecnicos" element={<Tecnicos />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
