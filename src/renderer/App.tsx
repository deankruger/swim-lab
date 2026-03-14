import React, {useState, useEffect, useRef } from 'react'
import './styles.css'

import { mobileAPI } from '../api/MobileAPI';
import { ComparisonResult, CountyTimesStore, SwimmerData } from '../types';


import ThemeSelector from './components/ThemeSelector';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';

import SearchSection from './components/SearchSection'
import SwimmerComparison from './components/SwimmerComparison';
import SavedSwimmers from './components/SavedSwimmers';
import SwimmerDetails from './components/SwimmerDetails';

const App: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [currentSwimmerData, setCurrentSwimmerData] = useState<SwimmerData | null>(null);
    const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
    const [savedSwimmers, setSavedSwimmers] = useState<SwimmerData[]>([]);
    const [countyTimesStore, setCountyTimesStore] = useState<CountyTimesStore>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [comparisonSwimmers, setComparisonSwimmers] = useState<SwimmerData[]>([]);
    const swimmerDetailsRef = useRef<HTMLDivElement>(null);
    const comparisonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadSavedSwimmers();
        loadCountyTimesStore();
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({message, type});
        setTimeout(() => setToast(null), 3000);
    }

    const loadSavedSwimmers = async () => {
        try {
            const swimmers = await mobileAPI.getSavedSwimmers();
            setSavedSwimmers(swimmers);            
        } catch (error) {
            showToast(`Error loading saved swimmers: ${(error as Error).message}`, 'error');            
        }
    };

    const loadCountyTimesStore = async () => {
        try {
            const stored = await mobileAPI.loadCountyTimesStore();
            if (stored && Object.keys(stored).length > 0){
                setCountyTimesStore(stored);
            }
        } catch (error) {
            //swallow: no saved county times loaded yet.
        }
    };

    const pickAndloadCountyTimes = async () => {        
        //todo
    };

    const handleCountySelected = async (county: string) => {
        //todo
    };

    const clearOneCounty = async (county: string) => {
        //todo
    };

    const handleSearchResults = async (tiref: string, name:string, birthYear: string, gender: string, club: string ) => {
        setLoading(true);
        try{
            const swimmerData = await mobileAPI.getSwimmerTimes(tiref);
            swimmerData.name = name;
            swimmerData.birthYear = birthYear;
            swimmerData.gender = gender;
            swimmerData.club = club;
            setCurrentSwimmerData(swimmerData);
            showToast('Times loaded successfully');
        } catch (error){
            showToast(`Error loading times: ${(error as Error).message}`, 'error');            
        } finally{
            setLoading(false);
        }
    }
    
    const handleSaveSwimmer = async () => {
        //todo
    };

    const handleExportToExcel = async () => {
        //todo
    };

    const handleLoadSavedSwimmer = async (swimmer: SwimmerData) => {        
        //todo
    };

    const handleDeleteSwimmer = async (tiref: String) => {
        //todo
    };

    const handleClearDetails = () => {
        setCurrentSwimmerData(null);
        setComparisonResult(null);
    }

    const handleUpdateSwimmerTags = async (tiref: string, tags: string[]) => {
        //todo
    };

    const handleRefreshCurrentSwimmer = async () => {
        if (!currentSwimmerData) return;

        setLoading(true);
        try{
            //Fetch fresh times from website
            const swimmerData = await mobileAPI.getSwimmerTimes(currentSwimmerData.tiref)            ;
            swimmerData.name = currentSwimmerData.name;
            swimmerData.birthYear = currentSwimmerData.birthYear;
            swimmerData.gender = currentSwimmerData.gender;
            swimmerData.club = currentSwimmerData.club;

            //Save updated data
            await mobileAPI.saveSwimmer(swimmerData);

            await loadSavedSwimmers();

            setCurrentSwimmerData(swimmerData);

            showToast('Times refreshed successfully')
        } catch (error) {
            showToast(`Error refresshing times: ${(error as Error).message}`, 'error')
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshAllSwimmers = async () => {
        //todo
    };

    const handleCompareSwimmers = async (swimmers: SwimmerData[]) => {
        setComparisonSwimmers(swimmers);
        setCurrentSwimmerData(null);
        setTimeout(() => comparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const handleCloseComparison = () => {
        setComparisonSwimmers([]);
    };

    return (
        <div className="container">
            <header>
                <div className="header-content">
                    <div className="header-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 124 124" fill="none">
                            <rect width="124" height="124" rx="24" fill='currentColor'/>
                            <path d="M19.375 36.7818V100.625C19.375 102.834 21.1659 104.625 23.375 104.625H87.2181C90.7818 104.625 92.5664 100.316 90.0466 97.7966L26.2034 33.9534C23.6836 31.4336 19.375 33.2182 19.375 36.7818Z" fill="white"/>
                            <circle cx="63.2109" cy="37.5391" r="18.1641" fill="black"/>
                            <rect opacity="0.4" x="81.1328" y="80.7198" width="17.5687" height="17.3876" rx="4" transform="rotate(-45 81.1328 80.7198)" fill="#FDBA74"/>
                        </svg>
                    </div>
                    <div className="header-text">
                        <h1>Swim Lab</h1>
                        <p>Review and compare swimmer times and rankings from county to national levels.</p>
                    </div>
                    <ThemeSelector />
                </div>
            </header>
            <main>
                <SearchSection
                    onSwimmerSelect={handleSearchResults}
                    loading={loading}
                    setLoading={setLoading}
                    showToast={showToast} 
                />

                {comparisonSwimmers.length > 0 && (
                    <div ref={comparisonRef}>
                        <SwimmerComparison swimmers={comparisonSwimmers} onClose={handleCloseComparison} />
                    </div>
                )}
                
                {currentSwimmerData && (
                    <div ref={swimmerDetailsRef}>
                        <SwimmerDetails 
                            swimmerData={currentSwimmerData} 
                            countyTimesStore={countyTimesStore} 
                            onSave={handleSaveSwimmer}
                            onExport={handleExportToExcel}
                            onClear={handleClearDetails}
                            onRefresh={handleRefreshCurrentSwimmer} 
                            onLoadCountyTimes={pickAndloadCountyTimes} 
                            onClearOneCounty={clearOneCounty} 
                            onCountySelected={handleCountySelected} 
                            onComparisonChange={setComparisonResult} 
                            onRankingsSaved={loadSavedSwimmers} 
                            loading={loading}
                            setLoading={setLoading}
                            showToast={showToast}
                        />
                    </div>
                )}
                
                <SavedSwimmers 
                    swimmers={savedSwimmers} 
                    onLoad={handleLoadSavedSwimmer}
                    onDelete={handleDeleteSwimmer}
                    onRefreshAll={handleRefreshAllSwimmers}
                    onCompare={handleCompareSwimmers}
                    onUpdateTags={handleUpdateSwimmerTags}
                />
            </main>

            {loading && <LoadingSpinner />}
            {toast && <Toast message={toast.message} type={toast.type} />}
        </div>
    );
};

export default App;
