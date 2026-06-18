/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Calendar } from './pages/Calendar';
import { Habits } from './pages/Habits';
import { Notes } from './pages/Notes';
import { Assistant } from './pages/Assistant';

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="habits" element={<Habits />} />
            <Route path="knowledge" element={<Notes />} />
            <Route path="assistant" element={<Assistant />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}



