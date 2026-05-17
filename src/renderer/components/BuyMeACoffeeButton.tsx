import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faTimes } from '@fortawesome/free-solid-svg-icons';

interface BuyMeACoffeeButtonProps {
    className?: string;
}

const BuyMeACoffeeButton: React.FC<BuyMeACoffeeButtonProps> = () => {
    const [showModal, setShowModal] = useState(false);

    const handleOpenModal = () => setShowModal(true);
    const handleCloseModal = () => setShowModal(false);

    const handleDonate = () => {
        window.open('https://buymeacoffee.com/swimlab', '_blank');
        handleCloseModal();
    };

    return (
        <div>
            <button
                type="button"
                className="btn-ghost profile-settings-trigger"
                aria-label="Buy me a coffee"
                title="Buy me a coffee"
                style={{ color: 'var(--primary-light)' }}
                onClick={handleOpenModal}
            >
                <FontAwesomeIcon icon={faHeart} />
            </button>

            {showModal && (
                <div style={styles.modalOverlay} onClick={handleCloseModal}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                <FontAwesomeIcon icon={faHeart} style={{ marginRight: '8px' }} />
                                Support Swim Lab
                            </h2>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                style={styles.closeButton}
                                aria-label="Close"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <p style={styles.message}>
                                If you find Swim Lab helpful, consider buying me a coffee to support ongoing development and improvements!
                            </p>
                            <p style={styles.submessage}>
                                Your support helps keep this platform free and ad-free for everyone.
                            </p>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                style={styles.cancelButton}
                            >
                                Maybe Later
                            </button>
                            <button
                                type="button"
                                onClick={handleDonate}
                                style={styles.donateButton}
                            >
                                <FontAwesomeIcon icon={faHeart} style={{ marginRight: '8px' }} />
                                Buy Me A Coffee
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'var(--bg-secondary, #fff)',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        maxWidth: '400px',
        width: '90%',
        animation: 'slideIn 0.3s ease-out',
        color: 'var(--text-primary, #000)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid var(--border-color, #eee)',
    },
    modalTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: 'bold',
        color: 'var(--text-primary, #000)',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '20px',
        cursor: 'pointer',
        color: 'var(--text-secondary, #666)',
        padding: '4px 8px',
    },
    modalBody: {
        padding: '16px',
    },
    message: {
        margin: '0 0 12px 0',
        fontSize: '14px',
        lineHeight: '1.6',
        color: 'var(--text-primary, #000)',
    },
    submessage: {
        margin: 0,
        fontSize: '12px',
        lineHeight: '1.5',
        color: 'var(--text-secondary, #666)',
    },
    modalFooter: {
        display: 'flex',
        gap: '8px',
        padding: '16px',
        borderTop: '1px solid var(--border-color, #eee)',
        justifyContent: 'flex-end',
    },
    cancelButton: {
        padding: '8px 16px',
        border: '1px solid var(--border-color, #ccc)',
        borderRadius: '4px',
        backgroundColor: 'transparent',
        color: 'var(--text-primary, #000)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
    },
    donateButton: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: 'var(--danger, #ff6b6b)',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
    },
};

export default BuyMeACoffeeButton;
