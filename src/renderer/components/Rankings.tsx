import React, { useState } from "react";
import { CountyTimesStore, SwimmerData } from "../../types";

interface RankingsProps {
    swimmerData: SwimmerData;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
    onRankingsSaved?: () => void;
}

const Rankings: React.FC<RankingsProps> = ({
    swimmerData,
    loading,    
    setLoading,
    showToast,
    onRankingsSaved,
}) => {
    const [activeTab, setActiveTab] = useState<'times' | 'comparison' | 'rankings'>('times')

    const currentYear = new Date().getFullYear();
    const ageAtEndOfYear = swimmerData.birthYear 
        ? currentYear - parseInt(swimmerData.birthYear) : 'Unknown';

    return (
        <div className="filter-section">
            
        </div>
    );
};

export default Rankings;