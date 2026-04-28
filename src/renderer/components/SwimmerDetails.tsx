import React, { useState } from "react";
import { ComparisonResult, CountyTimesStore, SwimmerData } from "../../types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faClose, faFileExcel, faFloppyDisk, faRotate } from "@fortawesome/free-solid-svg-icons";
import PersonalBests from "./PersonalBests";
import CountyComparison from "./CountyComparison";
import Rankings from "./Rankings";

interface SwimmerDetailsProps {
    swimmerData: SwimmerData;
    countyTimesStore: CountyTimesStore;
    activeStandards: string[];
    onActiveStandardsChange: (active: string[]) => void;
    activeTab: 'times' | 'comparison' | 'rankings';
    onActiveTabChange: (tab: 'times' | 'comparison' | 'rankings') => void;
    onSave: () => void;
    onExport: () => void;
    onClear: () => void;
    onRefresh: () => void;
    onLoadCountyTimes: () => void;
    onClearOneCounty: (county: string) => void;
    onCountySelected: (county: string) => void;
    onComparisonChange?: (result: ComparisonResult | null) => void;
    onRankingsSaved?: () => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const SwimmerDetails: React.FC<SwimmerDetailsProps> = ({
    swimmerData,
    countyTimesStore,
    activeStandards,
    onActiveStandardsChange,
    activeTab,
    onActiveTabChange,
    onSave,
    onExport,
    onClear,
    onRefresh,
    onLoadCountyTimes,
    onClearOneCounty,
    onCountySelected,
    onComparisonChange,
    onRankingsSaved,
    loading,
    setLoading,
    showToast
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const currentYear = new Date().getFullYear();
    const ageAtEndOfYear = swimmerData.birthYear ? currentYear - parseInt(swimmerData.birthYear) : 'Unknown';

    return (
        <section className="details-section card">
            <div className="section-header">
                <h2>{swimmerData.name}</h2>
                <button className="btn-ghost section-toggle" onClick={() => setIsCollapsed(c => !c)} aria-label="Toggle section">
                    <FontAwesomeIcon icon={faChevronDown} className={`chevron-icon${!isCollapsed ? ' expanded' : ''}`} />
                </button>                
            </div>            
            {!isCollapsed && <>
            <div className="action-buttons">
                <button onClick={onRefresh} className="btn-refresh btn-ghost" disabled={loading} title="Refresh times from website" style={{ color: 'var(--info)' }}><FontAwesomeIcon icon={faRotate} /></button>
                <button onClick={onSave} className="btn-save btn-ghost" disabled={loading} title="Save swimmer" style={{ color: 'var(--success)' }}><FontAwesomeIcon icon={faFloppyDisk} /></button>
                <button onClick={onExport} className="btn-export btn-ghost" disabled={loading} title="Export to Excel" style={{ color: 'var(--warning)' }}><FontAwesomeIcon icon={faFileExcel} /></button>
                <button onClick={onClear} className="btn-clear btn-ghost" disabled={loading} title="Clear swimmer" style={{ color: 'var(--danger)' }}><FontAwesomeIcon icon={faClose} /></button>
            </div>
            <div className="swimmer-info">
                <p><strong>Name:</strong> {swimmerData.name}</p>
                <p><strong>Gender:</strong> {swimmerData.gender || 'Unknown'} (Age at Dec 31, {currentYear}: {ageAtEndOfYear})</p>
                <p><strong>Born:</strong> {swimmerData.birthYear || 'Unknown'}</p>
                <p><strong>Tiref:</strong> {swimmerData.tiref} </p>
                <p><strong>Total Events:</strong> {swimmerData.times.length}</p>
            </div>
            <div className="tabs">
                <button className={`tab-btn ${activeTab === 'times' ? 'active' : ''}`} onClick={() => onActiveTabChange('times')}>Personal Bests</button>
                <button className={`tab-btn ${activeTab === 'comparison' ? 'active' : ''}`} onClick={() => onActiveTabChange('comparison')}>Standards</button>
                <button className={`tab-btn ${activeTab === 'rankings' ? 'active' : ''}`} onClick={() => onActiveTabChange('rankings')}>Rankings</button>
            </div>
            {activeTab === 'times' && <PersonalBests times={swimmerData.times} />}
            {activeTab === 'comparison' && (
                <CountyComparison 
                    swimmerData={swimmerData} 
                    countyTimesStore={countyTimesStore}
                    activeStandards={activeStandards}
                    onActiveStandardsChange={onActiveStandardsChange}
                    onLoadCountyTimes={onLoadCountyTimes}
                    onClearOneCounty={onClearOneCounty}
                    onCountySelected={onCountySelected}
                    onComparisonChange={onComparisonChange}
                    loading={loading}
                    setLoading={setLoading}
                    showToast={showToast}
                />
            )}
            {activeTab === 'rankings' && (
                <Rankings 
                    swimmerData={swimmerData} 
                    loading={loading}
                    setLoading={setLoading}
                    showToast={showToast}
                    onRankingsSaved={onRankingsSaved}
                />
            )}            
        </>}            
        </section>
    );
};

export default SwimmerDetails;
