import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import usePush from '../hooks/usePush';

const DISMISS_KEY = 'swim-lab:push-banner-dismissed';

const NotificationBanner: React.FC = () => {
  const { supported, enabled, checking, enablePush } = usePush();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === 'true'; } catch { return false; }
  });

  const handleEnable = async () => {
    const success = await enablePush();
    if (success) {
      setDismissed(true);
      try { localStorage.setItem(DISMISS_KEY, 'true'); } catch {}
    }
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, 'true'); } catch {}
    setDismissed(true);
  };

  if (!supported || checking || enabled || dismissed) return null;

  return (
    <div className="notification-banner" role="status">
      <span className="notification-banner-text">
        <FontAwesomeIcon icon={faBell} style={{ marginRight: '0.5rem' }} />
        Get alerts when your saved swimmers post new times.{' '}
        <strong>Enable notifications</strong> to get started.
      </span>
      <button
        type="button"
        className="notification-banner-enable"
        onClick={handleEnable}
      >
        Enable
      </button>
      <button
        type="button"
        className="notification-banner-dismiss"
        onClick={dismiss}
        aria-label="Dismiss banner"
      >
        ×
      </button>
    </div>
  );
};

export default NotificationBanner;
