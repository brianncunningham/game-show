import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import './App.css';
import GameAdminPage from './pages/GameAdminPage';
import HostPage from './pages/HostPage';
import ShowPage from './pages/ShowPage';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#56d7ff' },
    secondary: { main: '#ffb14a' },
    background: {
      default: '#070d1f',
      paper: '#0b1228',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/show" replace />} />
          <Route path="/gameadmin" element={<GameAdminPage />} />
          <Route path="/host" element={<HostPage />} />
          <Route path="/show" element={<ShowPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
