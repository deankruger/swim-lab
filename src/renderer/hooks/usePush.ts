import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '../../api/authedFetch';

function urlBase64ToUint8Array(base64String: string) {
  const cleaned = base64String.replace(/[^A-Za-z0-9\-_]/g, '');
  const padding = '='.repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function usePush() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setSupported(false);
      setChecking(false);
      return;
    }

    navigator.serviceWorker.getRegistration().then(async r => {
      if (r && Notification.permission === 'granted') {
        const sub = await r.pushManager.getSubscription();
        setEnabled(!!sub);
      } else {
        setEnabled(false);
      }
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  const enablePush = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notifications permission denied');
        return false;
      }

      const reg = await navigator.serviceWorker.register('/service-worker.js');

      const resp = await fetch('/api/push/vapid-public-key');
      if (!resp.ok) throw new Error('Failed to get VAPID key');
      const { publicKey } = await resp.json();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      const subscribeResp = await authedFetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      });
      if (!subscribeResp.ok) {
        const errorBody = await subscribeResp.json().catch(() => null);
        const serverMessage = errorBody && typeof errorBody.error === 'string'
          ? errorBody.error
          : subscribeResp.statusText || 'Failed to register subscription';
        throw new Error(serverMessage);
      }

      setEnabled(true);
      return true;
    } catch (err) {
      console.error('Push subscription failed', err);
      alert('Failed to subscribe: ' + (err as Error).message);
      return false;
    }
  }, []);

  return { supported, enabled, checking, enablePush, setEnabled } as const;
}
