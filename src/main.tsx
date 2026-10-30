import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { AuthProvider } from './state/AuthProvider';
import { AppStoreProvider } from './state/AppStore';
import { AnnouncerProvider } from './state/Announcer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppStoreProvider>
        <AnnouncerProvider>
          <App />
        </AnnouncerProvider>
      </AppStoreProvider>
    </AuthProvider>
  </StrictMode>,
);
