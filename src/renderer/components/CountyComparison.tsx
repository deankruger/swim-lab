import React, { useState } from "react";
import { ComparisonResult, CountyTimesStore, SwimmerData } from "../../types";

interface CountyComparisonProps {
    swimmerData: SwimmerData;
    countyTimesStore: CountyTimesStore;
    onLoadCountyTimes: () => void;
    onClearOneCounty: (county: string) => void;
    onCountySelected: (county: string) => void;
    onComparisonChange?: (result: ComparisonResult | null) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const CountyComparison: React.FC<CountyComparisonProps> = ({
    swimmerData,
    countyTimesStore,
    onLoadCountyTimes,
    onClearOneCounty,
    onCountySelected,
    onComparisonChange,
    loading,
    setLoading,
    showToast
}) => {
    const [activeTab, setActiveTab] = useState<'times' | 'comparison' | 'rankings'>('times')

    const currentYear = new Date().getFullYear();
    const ageAtEndOfYear = swimmerData.birthYear 
        ? currentYear - parseInt(swimmerData.birthYear) : 'Unknown';

    return (
        <div className="tab-content active">
            {/* County files status */}
            
        </div>
    );
};

export default CountyComparison;