import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faStopwatch,
    faMedal,
    faRankingStar,
    faXmark,
    faMagnifyingGlass,
    faBookmark
} from '@fortawesome/free-solid-svg-icons';

export type SwimmerTab = 'times' | 'comparison' | 'rankings';

interface BottomNavProps {
    swimmerLoaded: boolean;
    activeTab: SwimmerTab;
    onActiveTabChange: (tab: SwimmerTab) => void;
    onCloseSwimmer: () => void;
    onJumpToSearch: () => void;
    onJumpToSaved: () => void;
}

interface ItemProps {
    label: string;
    icon: typeof faStopwatch;
    active?: boolean;
    onClick: () => void;
    ariaCurrent?: boolean;
}

const NavItem: React.FC<ItemProps> = ({ label, icon, active, onClick, ariaCurrent }) => (
    <button
        type="button"
        className={`bottom-nav-item${active ? ' active' : ''}`}
        onClick={onClick}
        aria-current={ariaCurrent ? 'page' : undefined}
    >
        <FontAwesomeIcon icon={icon} className="bottom-nav-icon" />
        <span className="bottom-nav-label">{label}</span>
    </button>
);

const BottomNav: React.FC<BottomNavProps> = ({
    swimmerLoaded,
    activeTab,
    onActiveTabChange,
    onCloseSwimmer,
    onJumpToSearch,
    onJumpToSaved
}) => (
    <nav className="bottom-nav" role="navigation" aria-label="Primary">
        {swimmerLoaded ? (
            <>
                <NavItem
                    label="Bests"
                    icon={faStopwatch}
                    active={activeTab === 'times'}
                    ariaCurrent={activeTab === 'times'}
                    onClick={() => onActiveTabChange('times')}
                />
                <NavItem
                    label="Standards"
                    icon={faMedal}
                    active={activeTab === 'comparison'}
                    ariaCurrent={activeTab === 'comparison'}
                    onClick={() => onActiveTabChange('comparison')}
                />
                <NavItem
                    label="Rankings"
                    icon={faRankingStar}
                    active={activeTab === 'rankings'}
                    ariaCurrent={activeTab === 'rankings'}
                    onClick={() => onActiveTabChange('rankings')}
                />
                <NavItem label="Close" icon={faXmark} onClick={onCloseSwimmer} />
            </>
        ) : (
            <>
                <NavItem label="Search" icon={faMagnifyingGlass} onClick={onJumpToSearch} />
                <NavItem label="Saved" icon={faBookmark} onClick={onJumpToSaved} />
            </>
        )}
    </nav>
);

export default BottomNav;
