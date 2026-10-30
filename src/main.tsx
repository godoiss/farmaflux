import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { AppStoreProvider } from './state/AppStore';
import { AnnouncerProvider } from './state/Announcer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStoreProvider>
      <AnnouncerProvider>
        <App />
      </AnnouncerProvider>
    </AppStoreProvider>
  </StrictMode>,
);
