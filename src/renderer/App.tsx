import React, {useState, useEffect, useRef } from 'react';
import './styles.css';

import { mobileAPI } from '../api/MobileAPI';
import { ComparisonResult, CountyTimesStore, SwimmerData } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faInfoCircle } from '@fortawesome/free-solid-svg-icons';


import ThemeSelector from './components/ThemeSelector';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';

import SearchSection from './components/SearchSection';
import SwimmerComparison from './components/SwimmerComparison';
import SavedSwimmers from './components/SavedSwimmers';
import SwimmerDetails from './components/SwimmerDetails';
import ContactPage from './components/ContactPage';
import AboutPage from './components/AboutPage';

import defaultCountyTimes from '../../assets/json/county-times.json';
import AuthButton from './components/AuthButton';
import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';

const App: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [currentSwimmerData, setCurrentSwimmerData] = useState<SwimmerData | null>(null);
    const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
    const [savedSwimmers, setSavedSwimmers] = useState<SwimmerData[]>([]);
    const [countyTimesStore, setCountyTimesStore] = useState<CountyTimesStore>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [comparisonSwimmers, setComparisonSwimmers] = useState<SwimmerData[]>([]);
    const [navOpen, setNavOpen] = useState(false);
    const [page, setPage] = useState<'home' | 'contact' | 'about'>('home');
    const [activeStandards, setActiveStandards] = useState<string[]>([]);
    const swimmerDetailsRef = useRef<HTMLDivElement>(null);
    const comparisonRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!navOpen) return;
        const handler = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) {
                setNavOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [navOpen]);

    useEffect(() => {
        loadSavedSwimmers();
        loadCountyTimesStore();
        loadActiveStandards();
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadSavedSwimmers = async () => {
        try {
            const swimmers = await mobileAPI.getSavedSwimmers();
            setSavedSwimmers(swimmers);            
        } catch (error) {
            showToast(`Error loading saved swimmers: ${(error as Error).message}`, 'error');
        }
    };

    const loadDefaultCountyTimes = async () => {
        try {
            return defaultCountyTimes as CountyTimesStore;
        } catch (error) {
            console.warn('Default county times load failed:', error);
            return {} as CountyTimesStore;
        }
    };

    const mergeCountyTimesStores = (base: CountyTimesStore, extra: CountyTimesStore): CountyTimesStore => {
        const merged: CountyTimesStore = { ...base };
        Object.keys(extra).forEach(county => {
            merged[county] = { ...(merged[county] || {}), ...extra[county] };
        });
        return merged;
    };

    const loadCountyTimesStore = async () => {
        try {
            const defaultStore = await loadDefaultCountyTimes();
            const stored = await mobileAPI.loadCountyTimesStore();
            const merged = mergeCountyTimesStores(defaultStore, stored);
            if (Object.keys(merged).length > 0) {
                setCountyTimesStore(merged);
            }
        } catch (error) {
            console.warn('County times store load failed:', error);
            // swallow: no saved county times loaded yet.
        }
    };

    const loadActiveStandards = async () => {
        try {
            const active = await mobileAPI.loadActiveStandards();
            setActiveStandards(active);
        } catch (error) {
            console.warn('Active standards load failed:', error);
            setActiveStandards([]); // Start with no standards active
        }
    };

    const handleActiveStandardsChange = async (active: string[]) => {
        setActiveStandards(active);
        try {
            await mobileAPI.saveActiveStandards(active);
        } catch (error) {
            console.error('Failed to save active standards:', error);
            showToast('Failed to save standards selection', 'error');
        }
    };

    const pickAndLoadCountyTimes = async () => {        
     try {
      console.log('Opening file picker for standard times...');
      const results = await mobileAPI.pickCountyTimesFile();

      if (results === null) {
        console.log('File picker cancelled by user');
        return;
      }

      setCountyTimesStore(prev => {
        const next = { ...prev };
        for (const { countyName, times } of results) {
          next[countyName] = { ...(next[countyName] || {}), ...times };
        }
        mobileAPI.saveCountyTimesStore(next);
        return next;
      });
      const summary = results.map(r => `${r.countyName} (${Object.keys(r.times).length})`).join(', ');
      showToast(`Loaded: ${summary}`, 'success');
     } catch (error) {
      console.error('Error loading standards from file:', error);
      showToast(`Failed to load standards: ${(error as Error).message}`, 'error');
     }
    };

    const handleCountySelected = async (county: string) => {
     if (!currentSwimmerData) return;
     const updated = { ...currentSwimmerData, preferredCounty: county };
     setCurrentSwimmerData(updated);
     await mobileAPI.saveSwimmer(updated);
    };

    const clearOneCounty = async (county: string) => {
     setCountyTimesStore(prev => {
      const next = { ...prev };
      delete next[county];
      mobileAPI.saveCountyTimesStore(next);
      return next;
     });
     showToast(`Cleared ${county}`);
    };

    const handleSearchResults = async (tiref: string, name: string, birthYear: string, gender: string, club: string) => {
        setLoading(true);
        try {
            const swimmerData = await mobileAPI.getSwimmerTimes(tiref);
            swimmerData.name = name;
            swimmerData.birthYear = birthYear;
            swimmerData.gender = gender;
            swimmerData.club = club;
            setCurrentSwimmerData(swimmerData);
            showToast('Times loaded successfully');
        } catch (error) {
            showToast(`Error loading times: ${(error as Error).message}`, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const handleSaveSwimmer = async () => {
        if (!currentSwimmerData) {
            showToast('No swimmer data to save', 'error');
            return;
        }
        
        setLoading(true);
        try {
            await mobileAPI.saveSwimmer(currentSwimmerData);
            await loadSavedSwimmers();
            showToast('Swimmer saved successfully');
        } catch (error) {
            showToast(`Error saving swimmer: ${(error as Error).message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExportToExcel = async () => {
     if (!currentSwimmerData) {
      showToast('No swimmer data to export', 'error');
      return;
     }

     setLoading(true);
     try {
      const filePath = await mobileAPI.exportToExcel(currentSwimmerData, comparisonResult);
      showToast(`Exported to: ${filePath}`);
     } catch (error) {
      showToast(`Error exporting: ${(error as Error).message}`, 'error');
     } finally {
      setLoading(false);
     }
    };

    const handleLoadSavedSwimmer = (swimmer: SwimmerData) => {
        setCurrentSwimmerData(swimmer);
        setComparisonResult(null);
        setTimeout(() => swimmerDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const handleDeleteSwimmer = async (tiref: string) => {
        if (!confirm('Are you sure you want to delete this swimmer?')) {
            return;
        }
        
        setLoading(true);
        try {
            await mobileAPI.deleteSwimmer(tiref);
            await loadSavedSwimmers();
            showToast('Swimmer deleted successfully');

            if (currentSwimmerData && currentSwimmerData.tiref === tiref) {
                setCurrentSwimmerData(null);
            }
        } catch (error) {
            showToast(`Error deleting swimmer: ${(error as Error).message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClearDetails = () => {
        setCurrentSwimmerData(null);
        setComparisonResult(null);
    };

    const handleUpdateSwimmerTags = async (tiref: string, tags: string[]) => {
        setLoading(true);
        try {
            const swimmer = savedSwimmers.find(s => s.tiref === tiref);
            if (!swimmer) {
                throw new Error('Swimmer not found');
            }

            const updatedSwimmer = { ...swimmer, tags: tags.length > 0 ? tags : undefined };            
            await mobileAPI.saveSwimmer(updatedSwimmer);
            await loadSavedSwimmers();
            
            showToast(tags.length > 0 ? 'Tags updated' : 'Tags Cleared');
        } catch (error) {
            showToast(`Error updating tags: ${(error as Error).message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshCurrentSwimmer = async () => {
        if (!currentSwimmerData) return;

        setLoading(true);
        try {
            // Fetch fresh times from website
            const swimmerData = await mobileAPI.getSwimmerTimes(currentSwimmerData.tiref);
            swimmerData.name = currentSwimmerData.name;
            swimmerData.birthYear = currentSwimmerData.birthYear;
            swimmerData.gender = currentSwimmerData.gender;
            swimmerData.club = currentSwimmerData.club;
            swimmerData.tags = currentSwimmerData.tags; // Preserve tag assignments
            swimmerData.rankings = currentSwimmerData.rankings; // Preserve rankings

            // Save updated data
            await mobileAPI.saveSwimmer(swimmerData);

            await loadSavedSwimmers();

            setCurrentSwimmerData(swimmerData);

            showToast('Times refreshed successfully');
        } catch (error) {
            showToast(`Error refreshing times: ${(error as Error).message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshAllSwimmers = async () => {
        if (savedSwimmers.length === 0) {
      showToast('No swimmers to refresh', 'error');
      return;
     }

     if (!confirm(`This will reload all ${savedSwimmers.length} saved swimmers from the website to update their club information and times. This may take a few moments. Continue?`)) {
      return;
     }

     setLoading(true);
     let successCount = 0;
     let errorCount = 0;

     try {
      for (const swimmer of savedSwimmers) {
        try {
          // Fetch fresh data from website
          const swimmerData = await mobileAPI.getSwimmerTimes(swimmer.tiref);
          swimmerData.name = swimmer.name;
          swimmerData.birthYear = swimmer.birthYear;
          swimmerData.gender = swimmer.gender;
          swimmerData.club = swimmer.club; // Preserve club
          swimmerData.tags = swimmer.tags; // Preserve tag assignments
          swimmerData.rankings = swimmer.rankings; // Preserve rankings

          // Save updated data
          await mobileAPI.saveSwimmer(swimmerData);
          successCount++;
        } catch (error) {
          console.error(`Error refreshing swimmer ${swimmer.name}:`, error);
          errorCount++;
        }
      }

      // Reload saved swimmers list
      await loadSavedSwimmers();

      if (errorCount === 0) {
        showToast(`Successfully refreshed all ${successCount} swimmers!`, 'success');
      } else {
        showToast(`Refreshed ${successCount} swimmers, ${errorCount} failed`, 'error');
      }
     } catch (error) {
      showToast(`Error during refresh: ${(error as Error).message}`, 'error');
     } finally {
      setLoading(false);
     }
    };

    const handleCompareSwimmers = (swimmers: SwimmerData[]) => {
        setComparisonSwimmers(swimmers);
        setCurrentSwimmerData(null);
        setTimeout(() => comparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const handleCloseComparison = () => {
        setComparisonSwimmers([]);
    };

    return (
        <>
            <header ref={navRef}>
                <div className="header-content">
                    <a href="/" className="logo"> 
                        <div className="header-icon">
                            <svg width="36" height="36" viewBox="0 0 122.88 82.13" xmlns="http://www.w3.org/2000/svg">
                                <g fill="currentColor">
                                    <path d="M0,66.24c7.11-2.74,13.1-0.95,21.42,1.55c2.17,0.65,4.53,1.36,6.66,1.92c1.9,0.5,4.82-0.58,7.88-1.71 c3.82-1.41,7.8-2.87,12.57-2.75c3.6,0.09,6.63,1.74,9.69,3.41c1.92,1.05,3.87,2.11,4.95,2.15c1.24,0.04,3.08-1.04,4.92-2.12 c3-1.77,6-3.54,10.17-3.68c4.48-0.15,7.95,1.39,11.39,2.92c1.96,0.87,3.91,1.74,5.54,1.86c1.54,0.12,3.6-1.2,5.6-2.47 c2.78-1.78,5.51-3.52,9.1-3.92c4.27-0.47,8.93,1.54,12.89,3.24l0.1,0.05c0,4.05,0,8.11,0,12.16c-0.85-0.25-1.73-0.59-2.64-0.96 c-0.63-0.26-1.28-0.54-1.94-0.82c-2.71-1.16-5.9-2.54-7.17-2.4c-1.02,0.11-2.63,1.14-4.27,2.19c-0.6,0.38-1.21,0.77-1.82,1.15 c-3.04,1.85-6.34,3.43-10.69,3.1c-3.54-0.27-6.42-1.55-9.31-2.84l-0.25-0.11c-2.16-0.96-4.33-1.89-6.17-1.83 c-1.13,0.04-2.75,0.95-4.39,1.91l-0.38,0.22c-3.25,1.92-6.51,3.84-11.08,3.67c-3.73-0.14-6.87-1.84-9.96-3.53l-0.39-0.21 c-1.72-0.94-3.37-1.8-4.16-1.82c-2.42-0.06-5.21,0.91-7.92,1.91l-0.47,0.17c-4.74,1.75-9.26,3.41-14.62,2.01 c-2.88-0.75-5.06-1.41-7.06-2.01l-0.06-0.02c-7.25-2.18-11.98-3.58-17.65,0.13c-0.15,0.1-0.31,0.2-0.47,0.31v-0.31V66.24L0,66.24z M87.91,17.06l14.16-2.15c8.81-1.32,6.16-17.18-5.13-14.64l-32.11,5.3c-3.48,0.57-9.45,1.01-12.05,3.33 c-1.49,1.33-2.11,3.18-1.77,5.49c0.48,3.27,3.21,7.37,4.85,10.34l3.97,7.14c2.89,5.19,4.44,5.69-0.91,8.56L22.45,59.99l2.67,0.79 l8.01,0.12c0.91-0.3,1.86-0.65,2.83-1.01c3.82-1.41,7.8-2.87,12.57-2.75c3.6,0.09,6.63,1.74,9.69,3.41l1.38,0.74l7.06,0.11 c0.47-0.26,0.95-0.54,1.42-0.82c3-1.77,6-3.54,10.17-3.68c4.48-0.15,7.95,1.39,11.39,2.92c1.96,0.87,3.91,1.74,5.54,1.86 c0.37,0.03,0.77-0.03,1.19-0.14L77.79,28.5c-1.58-2.81-4.42-6.36-4.01-8.5c0.14-0.72,1.1-1.01,2.27-1.19 C80.01,18.24,83.95,17.66,87.91,17.06L87.91,17.06z M103.21,24.42c7.77,0,14.07,6.3,14.07,14.07c0,7.77-6.3,14.07-14.07,14.07 c-7.77,0-14.07-6.3-14.07-14.07C89.15,30.71,95.44,24.42,103.21,24.42L103.21,24.42z" />
                                </g>
                            </svg>
                        </div>
                    </a>
                    <h1>Swim Lab</h1>
                    <button
                            className="nav-toggle"
                            onClick={() => setNavOpen(o => !o)}
                            aria-label="Toggle menu"
                            aria-expanded={navOpen}
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                </div>
                    {navOpen && (
                    <nav className="nav-drawer">
                        <div className="nav-drawer-content">
                            <strong>
                                <button
                                    className="btn-ghost"
                                    style={{
                                        color: 'var(--primary)'
                                    }}
                                    onClick={() => {
                                        setPage('about');
                                        setNavOpen(false);
                                    }}
                                >
                                    About
                                </button>
                            </strong>
                            <strong>
                                <button
                                    className="btn-ghost"
                                    style={{
                                        color: 'var(--primary)'
                                    }}
                                    onClick={() => {
                                        setPage('contact');
                                        setNavOpen(false);
                                    }}
                                >
                                    Contact
                                </button>
                            </strong>                            
                            <ThemeSelector />
                            <AuthButton />
                            <AuthenticatedTemplate>
                                <div>Signed In</div>
                            </AuthenticatedTemplate>
                            <UnauthenticatedTemplate>
                                <div>Please sign in to continue.</div>
                            </UnauthenticatedTemplate>
                        </div>
                    </nav>
                    )}
            </header>
            
            <div className="container">
                <main>
                    {page === 'home' ? (
                        <>
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
                                        activeStandards={activeStandards}
                                        onActiveStandardsChange={handleActiveStandardsChange}
                                        onSave={handleSaveSwimmer}
                                        onExport={handleExportToExcel}
                                        onClear={handleClearDetails}
                                        onRefresh={handleRefreshCurrentSwimmer}
                                        onLoadCountyTimes={pickAndLoadCountyTimes}
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
                        </>
                    ) : page === 'about' ? (
                        <AboutPage onBack={() => setPage('home')} />
                    ) : (
                        <ContactPage onBack={() => setPage('home')} showToast={showToast} />
                    )}
                </main>

                {loading && <LoadingSpinner />}
                {toast && <Toast message={toast.message} type={toast.type} />}
            </div>
        </>
    );
};

export default App;

