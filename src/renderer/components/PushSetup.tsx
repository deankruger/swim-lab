import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faBellSlash } from '@fortawesome/free-solid-svg-icons';
import usePush from '../hooks/usePush';

const PushSetup: React.FC = () => {
  const { supported, enabled, checking, enablePush } = usePush();

  if (!supported || checking) return null;

  return (
    <div className="push-setup">
      <button
        className="btn-ghost push-button"
        onClick={() => { if (!enabled) enablePush(); }}
        disabled={enabled}
        aria-pressed={enabled}
        aria-label={enabled ? 'Notifications enabled' : 'Enable notifications'}
        title={enabled ? 'Notifications enabled' : 'Enable notifications'}
        style={{ color: enabled ? 'var(--success)' : 'var(--gray-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <FontAwesomeIcon icon={enabled ? faBell : faBellSlash} />
      </button>
      <span className="push-status" style={{ fontSize: '0.9rem', color: enabled ? 'var(--success)' : 'var(--gray-600)' }}>
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  );
};

export default PushSetup;
