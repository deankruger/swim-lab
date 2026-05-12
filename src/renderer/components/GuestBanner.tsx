import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';

const GuestBanner: React.FC = () => {
    const { instance } = useMsal();
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="guest-banner" role="status">
            <span className="guest-banner-text">
                You're browsing as a guest — saved swimmers stay on this device only.{' '}
                <strong>Sign in</strong> to sync across devices.
            </span>
            <button
                type="button"
                className="guest-banner-signin"
                onClick={() => instance.loginRedirect(loginRequest)}
            >
                Sign In
            </button>
            <button
                type="button"
                className="guest-banner-dismiss"
                onClick={() => setDismissed(true)}
                aria-label="Dismiss banner"
            >
                ×
            </button>
        </div>
    );
};

export default GuestBanner;
