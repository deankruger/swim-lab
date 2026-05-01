import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faSpinner } from '@fortawesome/free-solid-svg-icons';

interface Props {
    pullDistance: number;
    refreshing: boolean;
    threshold: number;
}

const PullToRefreshIndicator: React.FC<Props> = ({ pullDistance, refreshing, threshold }) => {
    if (pullDistance === 0 && !refreshing) return null;

    const triggered = pullDistance >= threshold;

    return (
        <div
            className="ptr-indicator"
            style={{
                transform: `translate3d(0, ${pullDistance}px, 0)`,
                opacity: Math.min(1, pullDistance / threshold)
            }}
            aria-hidden
        >
            <div className={`ptr-icon${refreshing ? ' refreshing' : ''}${triggered ? ' triggered' : ''}`}>
                {refreshing ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                    <FontAwesomeIcon icon={faArrowDown} />
                )}
            </div>
        </div>
    );
};

export default PullToRefreshIndicator;
