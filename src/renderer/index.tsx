import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import { MsalProvider } from '@azure/msal-react';
import { msalInstance, initializeMsal } from '../msalInstance';

const container = document.getElementById('root');
if (!container) {
    throw new Error('Root element not found');    
}

async finction bootstrap() {
    await initializeMsal();
    const root = createRoot(container);
    root.render(
        <MsalProvider instance={msalInstance}>
            <React.StrictMode>
                <App />
            </React.StrictMode>
        </MsalProvider>
    );
}

bootstrap();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/service-worker.js', { updateViaCache: 'none' })
            .catch((err) => {
                console.warn('SW registration failed:', err);
            });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}
