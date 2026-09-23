import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { initTelegram } from './utils/telegram';
import './index.scss';

// Inside Telegram the SDK must be ready before the first render; elsewhere this resolves at once.
initTelegram().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Toaster position="bottom-right" />
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
});
