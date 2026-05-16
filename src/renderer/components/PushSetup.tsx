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
        className="btn-clear btn-ghost push-button"
        onClick={() => { if (!enabled) enablePush(); }}
        disabled={enabled}
        aria-pressed={enabled}
        aria-label={enabled ? 'Notifications enabled' : 'Enable notifications'}
        title={enabled ? 'Notifications enabled' : 'Enable notifications'}
        style={{ color: enabled ? 'var(--success)' : 'var(--gray-500)' }}
      >
        <FontAwesomeIcon icon={enabled ? faBell : faBellSlash} />
      </button>
    </div>
  );
};

export default PushSetup;
