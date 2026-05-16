import React, { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const PushSetup: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [supported, setSupported] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setSupported(false);
      return;
    }

    navigator.serviceWorker.getRegistration().then(r => {
      setEnabled(!!r && Notification.permission === 'granted');
    }).catch(() => {});
  }, []);

  const enablePush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notifications permission denied');
        return;
      }

      const reg = await navigator.serviceWorker.register('/service-worker.js');

      const resp = await fetch('/api/push/vapid-public-key');
      if (!resp.ok) throw new Error('Failed to get VAPID key');
      const { publicKey } = await resp.json();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      });

      setEnabled(true);
      alert('Subscribed to notifications');
    } catch (err) {
      console.error('Push subscription failed', err);
      alert('Failed to subscribe: ' + (err as Error).message);
    }
  };

  if (!supported) return null;

  return (
    <div className="push-setup">
      <label className={`push-toggle ${enabled ? 'push-toggle-active' : ''}`}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={enabled}
          onChange={() => {
            if (!enabled) enablePush();
          }}
          aria-checked={enabled}
          aria-label={enabled ? 'Notifications enabled' : 'Enable notifications'}
        />
        <span className="push-toggle-track">
          <span className="push-toggle-thumb" />
        </span>
        <span className="push-toggle-text">
          {enabled ? 'Notifications enabled' : 'Enable notifications'}
        </span>
      </label>
    </div>
  );
};

export default PushSetup;
