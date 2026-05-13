import React from "react";

const OfflineBanner: React.FC = () => (
    <div className="offline-banner" role="status">
        <span className="offline-banner-text">
            Offline — showing your saved data. Changes will not sync until you reconnect.
        </span>
    </div>
);

export default OfflineBanner;
