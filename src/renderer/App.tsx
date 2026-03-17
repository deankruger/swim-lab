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
    const [navOpen, setNavOpen] = useState(false);
    const swimmerDetailsRef = useRef<HTMLDivElement>(null);
    const comparisonRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!navOpen) return;
        const handler = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)){
                setNavOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [navOpen]);

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
        if (!currentSwimmerData){
            showToast('No swimmer data to save', 'error');
            return;
        }
        setLoading(true);
        try{
            await mobileAPI.saveSwimmer(currentSwimmerData);
            await loadSavedSwimmers();
            showToast('Swimmer saved successfully');
        } catch (error){
            showToast(`Error saving swimmer: ${(error as Error).message}`, 'error');
        } finally{
            setLoading(false);
        }
    };

    const handleExportToExcel = async () => {
        //todo
    };

    const handleLoadSavedSwimmer = async (swimmer: SwimmerData) => {        
        setCurrentSwimmerData(swimmer);
        setComparisonResult(null);
        setTimeout(() => swimmerDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const handleDeleteSwimmer = async (tiref: string) => {
        if (!confirm('Are you sure you want to deleted this swimmer?')){
            return;
        }
        setLoading(true);
        try{
            await mobileAPI.deleteSwimmer(tiref);
            await loadSavedSwimmers();
            showToast('Swimmer deleted successfully');

            if (currentSwimmerData && currentSwimmerData.tiref === tiref){
                setCurrentSwimmerData(null);
            }
        } catch (error){
            showToast(`Error deleting swimmer: ${(error as Error).message}`, 'error');
        } finally{
            setLoading(false);
        }
    };

    const handleClearDetails = () => {
        setCurrentSwimmerData(null);
        setComparisonResult(null);
    }

    const handleUpdateSwimmerTags = async (tiref: string, tags: string[]) => {
        setLoading(true);
        try{
            const swimmer = savedSwimmers.find(s => s.tiref === tiref);
            if (!swimmer){
                throw new Error('Swimmer not found');
            }

            const updateSwimmer = { ...swimmer, tags: tags.length > 0 ? tags : undefined };            
            await mobileAPI.saveSwimmer(updateSwimmer);
            await loadSavedSwimmers();
            
            showToast(tags.length > 0 ? 'Tags updated' : 'Tags Cleared');
        } catch (error){
            showToast(`Error updating tags: ${(error as Error).message}`, 'error');
        } finally{
            setLoading(false);
        }
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
        <>
            <header>
                <div className="header-content">
                    <div className="header-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 124 124" fill="none">
                            <rect width="124" height="124" rx="24" fill='currentColor' />
                            <path d="M19.375 36.7818V100.625C19.375 102.834 21.1659 104.625 23.375 104.625H87.2181C90.7818 104.625 92.5664 100.316 90.0466 97.7966L26.2034 33.9534C23.6836 31.4336 19.375 33.2182 19.375 36.7818Z" fill="white" />
                            <circle cx="63.2109" cy="37.5391" r="18.1641" fill="black" />
                            <rect opacity="0.4" x="81.1328" y="80.7198" width="17.5687" height="17.3876" rx="4" transform="rotate(-45 81.1328 80.7198)" fill="#FDBA74" />
                        </svg>
                    </div>
                    <div className="header-text">
                        <h1>Swim Lab</h1>
                        <button
                            className='nav-toggle'
                            onClick={() => setNavOpen(o => !o)}
                            aria-label='Toggle menu'
                            aria-expanded={navOpen}
                        >
                            <span />
                            <span />
                            <span />
                        </button>
                    </div>
                    {navOpen && (
                        <nav className='nav-drawer'>
                            <div className='nav-drawer-content'>
                                <span className='nav-label'>Theme</span>
                                <ThemeSelector />
                            </div>
                        </nav>
                    )}
                </div>
            </header>
            <div className="container">
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
        </>
    );
};

export default App;
