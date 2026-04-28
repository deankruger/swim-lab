import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

const DISMISS_KEY = 'pwa-install-dismissed-until';
const DISMISS_DAYS = 14;

const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;

const isIOSSafari = () => {
    const ua = navigator.userAgent;
    const iOSDevice =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    return iOSDevice && isSafari;
};

const isDismissed = () => {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return until > Date.now();
};

const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    useEffect(() => {
        if (isStandalone() || isDismissed()) return;

        const onBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setVisible(true);
        };

        const onInstalled = () => {
            setVisible(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);

        if (isIOSSafari()) {
            setVisible(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            setDeferredPrompt(null);
            if (choice.outcome === 'accepted') {
                setVisible(false);
            }
        } else {
            setShowInstructions(true);
        }
    };

    const handleDismiss = () => {
        const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
        localStorage.setItem(DISMISS_KEY, String(until));
        setVisible(false);
        setShowInstructions(false);
    };

    if (!visible) return null;

    return (
        <>
            <div className="install-prompt" role="dialog" aria-label="Install Swim Lab">
                <span className="install-prompt-text">Install Swim Lab for quick access</span>
                <button className="install-prompt-btn" onClick={handleInstall}>
                    Install
                </button>
                <button
                    className="install-prompt-close"
                    onClick={handleDismiss}
                    aria-label="Dismiss install prompt"
                >
                    ×
                </button>
            </div>

            {showInstructions && (
                <div
                    className="install-prompt-modal"
                    onClick={() => setShowInstructions(false)}
                >
                    <div
                        className="install-prompt-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>Add Swim Lab to Home Screen</h3>
                        <ol>
                            <li>
                                Tap the <strong>Share</strong> button at the bottom of Safari
                            </li>
                            <li>
                                Scroll and tap <strong>Add to Home Screen</strong>
                            </li>
                            <li>
                                Tap <strong>Add</strong> to confirm
                            </li>
                        </ol>
                        <button
                            className="install-prompt-btn install-prompt-btn-block"
                            onClick={() => setShowInstructions(false)}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default InstallPrompt;
