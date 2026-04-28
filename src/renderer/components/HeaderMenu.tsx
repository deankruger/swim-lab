import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical, faCircleInfo, faEnvelope } from '@fortawesome/free-solid-svg-icons';

interface HeaderMenuProps {
    onSelect: (page: 'about' | 'contact') => void;
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({ onSelect }) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

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

    const choose = (page: 'about' | 'contact') => {
        onSelect(page);
        setOpen(false);
    };

    return (
        <div className="header-menu" ref={wrapperRef}>
            <button
                type="button"
                className="btn-ghost header-menu-trigger"
                onClick={() => setOpen(o => !o)}
                aria-label="More menu"
                aria-expanded={open}
                style={{ color: 'var(--primary)' }}
            >
                <FontAwesomeIcon icon={faEllipsisVertical} />
            </button>
            {open && (
                <div className="header-menu-popover" role="menu">
                    <button type="button" role="menuitem" className="header-menu-item" onClick={() => choose('about')}>
                        <FontAwesomeIcon icon={faCircleInfo} />
                        <span>About</span>
                    </button>
                    <button type="button" role="menuitem" className="header-menu-item" onClick={() => choose('contact')}>
                        <FontAwesomeIcon icon={faEnvelope} />
                        <span>Contact</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default HeaderMenu;
