import React, { useState } from "react";
import { ComparisonResult, CountyTimesStore, SwimmerData } from "../../types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faClose, faFileExcel, faFloppyDisk, faBookmark, faRotate, faUser, faBirthdayCake, faList, faVenusMars, faLocation, faMapPin, faCalendar, faPerson, faLocationPin, faHashtag, faTags } from "@fortawesome/free-solid-svg-icons";
import PersonalBests from "./PersonalBests";
import CountyComparison from "./CountyComparison";
import Rankings from "./Rankings";

interface SwimmerDetailsProps {
    swimmerData: SwimmerData;
    countyTimesStore: CountyTimesStore;
    activeStandards: string[];
    onActiveStandardsChange: (active: string[]) => void;
    selectedStrokes: string[];
    onSelectedStrokesChange: (strokes: string[]) => void;
    selectedDistances: string[];
    onSelectedDistancesChange: (distances: string[]) => void;
    activeTab: 'times' | 'comparison' | 'rankings';
    onActiveTabChange: (tab: 'times' | 'comparison' | 'rankings') => void;
    onSave: () => void;
    onExport: () => void;
    onClear: () => void;
    onRefresh: () => void;
    isSaved: boolean;
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
    selectedStrokes,
    onSelectedStrokesChange,
    selectedDistances,
    onSelectedDistancesChange,
    activeTab,
    onActiveTabChange,
    onSave,
    onExport,
    onClear,
    onRefresh,
    isSaved,
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
                <small> 
                    <div>{swimmerData.gender} • {ageAtEndOfYear} at 31 Dec, {currentYear}</div>
                </small>
                <button className="btn-ghost section-toggle" onClick={() => setIsCollapsed(c => !c)} aria-label="Toggle section">
                    <FontAwesomeIcon icon={faChevronDown} className={`chevron-icon${!isCollapsed ? ' expanded' : ''}`} />
                </button>                
            </div>            
            {!isCollapsed && <>
            <div className="action-buttons">
                <button
                    onClick={onSave}
                    className={`btn-save-prominent${isSaved ? ' is-saved' : ''}`}
                    disabled={loading}
                    title={isSaved ? 'Update saved swimmer' : 'Save swimmer'}
                >
                    <FontAwesomeIcon icon={isSaved ? faBookmark : faFloppyDisk} />
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>
                <button onClick={onRefresh} className="btn-refresh btn-ghost" disabled={loading} title="Refresh times from website" style={{ color: 'var(--info)' }}><FontAwesomeIcon icon={faRotate} /></button>
                <button onClick={onExport} className="btn-export btn-ghost" disabled={loading} title="Export to Excel" style={{ color: 'var(--warning)' }}><FontAwesomeIcon icon={faFileExcel} /></button>
                <button onClick={onClear} className="btn-clear btn-ghost" disabled={loading} title="Close swimmer" style={{ color: 'var(--danger)' }}><FontAwesomeIcon icon={faClose} /></button>
            </div>
            <div className="swimmer-info">
                <p><strong><FontAwesomeIcon icon={faUser} /> ASA Number:</strong> {swimmerData.tiref} </p>
                <p><strong><FontAwesomeIcon icon={faLocationPin} /> Club:</strong> {swimmerData.club || 'Unknown'}</p>
                {(swimmerData.tags && swimmerData.tags.length > 0) && (
                    <p><strong><FontAwesomeIcon icon={faTags} /> Tags:</strong> {swimmerData.tags.join(', ')}</p>
                )}                
            </div>
            <div className="tabs">
                <button className={`tab-btn ${activeTab === 'times' ? 'active' : ''}`} onClick={() => onActiveTabChange('times')}>Personal Bests</button>
                <button className={`tab-btn ${activeTab === 'comparison' ? 'active' : ''}`} onClick={() => onActiveTabChange('comparison')}>Standards</button>
                <button className={`tab-btn ${activeTab === 'rankings' ? 'active' : ''}`} onClick={() => onActiveTabChange('rankings')}>Rankings</button>
            </div>
            {activeTab === 'times' && <PersonalBests times={swimmerData.times} selectedStrokes={selectedStrokes} onSelectedStrokesChange={onSelectedStrokesChange} selectedDistances={selectedDistances} onSelectedDistancesChange={onSelectedDistancesChange} />}
            {activeTab === 'comparison' && (
                <CountyComparison 
                    swimmerData={swimmerData} 
                    countyTimesStore={countyTimesStore}
                    activeStandards={activeStandards}
                    onActiveStandardsChange={onActiveStandardsChange}
                    selectedStrokes={selectedStrokes}
                    onSelectedStrokesChange={onSelectedStrokesChange}
                    selectedDistances={selectedDistances}
                    onSelectedDistancesChange={onSelectedDistancesChange}
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
                    selectedStrokes={selectedStrokes}
                    onSelectedStrokesChange={onSelectedStrokesChange}
                    selectedDistances={selectedDistances}
                    onSelectedDistancesChange={onSelectedDistancesChange}
                />
            )}            
        </>}            
        </section>
    );
};

export default SwimmerDetails;
