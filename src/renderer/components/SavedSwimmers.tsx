import React from "react";
import { SwimmerData } from "../../types";

interface SavedSwimmersProps {
    swimmers: SwimmerData[];
    onLoad: (swimmers: SwimmerData) => void;
    onDelete: (tiref: string) => void;
    onRefreshAll: () => void;    
    onCompare: (swimmers: SwimmerData[]) => void;
    onUpdateTags: (tiref: string, tags: string[]) => void;
}

const SavedSwimmers: React.FC<SavedSwimmersProps> = ({
    swimmers,
    onLoad,
    onDelete,
    onRefreshAll,
    onCompare,
    onUpdateTags
}) => {    
    return (
        <section className="comparison-section-card">            
            
        </section>
    );
};

export default SavedSwimmers;