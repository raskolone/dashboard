/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppStore } from './store/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Calendar } from './pages/Calendar';
import { Habits } from './pages/Habits';
import { Notes } from './pages/Notes';
import { Assistant } from './pages/Assistant';
import { Login } from './pages/Login';
import { SettingsPage } from './pages/Settings';

function AppRouter() {
  const { user, isAuthLoading } = useAppStore();

  if (isAuthLoading) {
    return <div className="min-h-screen bg-[#07090b] flex items-center justify-center"><div className="text-[#4ade80] animate-pulse">Ładowanie profilu...</div></div>;
  }

  return (
    <Router>
      <Routes>
        {user ? (
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="habits" element={<Habits />} />
            <Route path="knowledge" element={<Notes />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}



