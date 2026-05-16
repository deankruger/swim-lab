import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOut, faSignIn } from '@fortawesome/free-solid-svg-icons';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import ThemeSelector from './ThemeSelector';
import PushSetup from './PushSetup';

interface ProfileSettingsProps {
    className?: string;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ className = '' }) => {
    const { instance, accounts } = useMsal();
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isSignedIn = accounts.length > 0;

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleSignIn = () => {
        instance.loginRedirect(loginRequest);
    };

    const handleSignOut = () => {
        instance.logoutRedirect();
    };

    return (
        <div className={`profile-settings ${className}`} ref={wrapperRef}>
            <button
                type="button"
                className="btn-ghost profile-settings-trigger"
                onClick={() => setOpen(o => !o)}
                aria-label="Profile and settings"
                aria-expanded={open}
                title="Profile & Settings"
                style={{ color: 'var(--primary)' }}
            >
                <FontAwesomeIcon icon={faUser} />
            </button>

            {open && (
                <div className="profile-settings-popover" role="menu">
                    <div className="profile-settings-header">
                        {isSignedIn ? (
                            <div className="profile-info">
                                <FontAwesomeIcon icon={faUser} className="profile-icon" />
                                <div className="profile-text">
                                    <div className="profile-name">{accounts[0].name}</div>
                                    <div className="profile-status">Signed in</div>
                                </div>
                            </div>
                        ) : (
                            <div className="profile-info">
                                <FontAwesomeIcon icon={faUser} className="profile-icon" />
                                <div className="profile-text">
                                    <div className="profile-status">Not signed in</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="profile-settings-divider" />

                    <div className="profile-settings-section">
                        <label className="profile-settings-label">Theme</label>
                        <ThemeSelector />
                    </div>

                    <div className="profile-settings-section">
                        <label className="profile-settings-label">Notifications</label>
                        <PushSetup />
                    </div>

                    <div className="profile-settings-divider" />

                    <button
                        type="button"
                        role="menuitem"
                        className="profile-settings-action"
                        onClick={() => {
                            if (isSignedIn) {
                                handleSignOut();
                            } else {
                                handleSignIn();
                            }
                            setOpen(false);
                        }}
                    >
                        <FontAwesomeIcon icon={isSignedIn ? faSignOut : faSignIn} />
                        <span>{isSignedIn ? 'Sign Out' : 'Sign In'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfileSettings;
