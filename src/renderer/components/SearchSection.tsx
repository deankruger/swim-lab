import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronLeft, faChevronRight, faList, faGrip, faMagnifyingGlass, faFloppyDisk, faBookmark, faSearch, faTimes, faFilter } from '@fortawesome/free-solid-svg-icons'
import { SwimmerSearchResult } from '../../types'   
import { mobileAPI } from '../../api/MobileAPI'

interface SearchSectionProps{
    onSwimmerSelect: (tiref: string, name: string, birthYear: string, gender: string, club: string) => void;
    onSaveSwimmer: (tiref: string, name: string, birthYear: string, gender: string, club: string) => void;
    savedTirefs: Set<string>;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({ onSwimmerSelect, onSaveSwimmer, savedTirefs, loading, setLoading, showToast}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isCompact, setIsCompact] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [searchResults, setSearchResults] = useState<SwimmerSearchResult[]>([]);
    const [currentPage, setCurentPage] = useState(1);
    const [quickFilter, setQuickFilter] = useState('');
    const resultsPerPage = 7;

    const handleSearch = async () =>  {
        const surname = searchInput.trim();

        if (!surname)
        {
            showToast('Please enter a surname', 'error');            
            return;
        }

        setLoading(true);

        try{
            const results = await mobileAPI.searchSwimmer(surname);
            setSearchResults(results);
            setCurentPage(1);
            setQuickFilter('');

            if (results.length === 0){
                showToast('No swimmers found', 'error');                
            }            
        } catch (error){
            showToast(`Error searching ${(error as Error).message}`, 'error');
        }
        finally{
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter'){
            handleSearchWrapped();
        }
    };

    const filteredResults = searchResults.filter(swimmer => {
        if (!quickFilter) return true;
        const q = quickFilter.toLowerCase();
        return swimmer.name.toLowerCase().includes(q) || swimmer.club.toLowerCase().includes(q);
    });

    const handleQuickFilterChange = (value: string) => {
        setQuickFilter(value);
        setCurentPage(1);
    };

    // Track if a search has been performed
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearchWrapped = async () => {
        setHasSearched(true);
        await handleSearch();
    };

    return (
        <section className="search-section card">
            <div className="section-header">                
                <h2>Search for Swimmer</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className="btn-ghost section-toggle" onClick={() => setIsCompact(c => !c)} title={isCompact ? 'Switch to comfortable view' : 'Switch to compact view'}>
                    <FontAwesomeIcon icon={isCompact ? faGrip : faList} />
                  </button>
                  <button className="btn-ghost section-toggle" onClick={() => setIsCollapsed(c => !c)} aria-label="Toggle section">
                    <FontAwesomeIcon icon={faChevronDown} className={`chevron-icon${!isCollapsed ? ' expanded' : ''}`} />
                  </button>
                </div>
            </div>
            {!isCollapsed && <>            
            <div className="search-controls">
                <div className="search-input-wrap">
                    <input
                        type='text'
                        value={searchInput}
                        onChange={(e) => { setSearchInput(e.target.value); if (hasSearched) setHasSearched(false); }}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter swimmers lastname (e.g. Jones)"
                        disabled={loading}
                    />
                    {searchInput.length > 0 && (
                        <button
                            type="button"
                            className="search-filter-clear"
                            onClick={() => { setSearchInput(''); setHasSearched(false); setSearchResults([]); }}
                            title="Clear search"
                            aria-label="Clear search"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    )}
                </div>
                <button onClick={handleSearchWrapped} disabled={loading}>Search</button>
            </div>

            <div id='searchResults'>
                {!hasSearched && searchResults.length === 0 && (
                    <div className="search-pre-help">
                        <h3><FontAwesomeIcon icon={faSearch} />&nbsp;Ready to search</h3>
                        <p>Type a swimmer's surname above, then tap <strong>Search</strong>.</p>
                        <ul>
                            <li>Try surname examples like <strong>Jones</strong>, <strong>Smith</strong>, or <strong>Taylor</strong>.</li>
                            <li>After results load, use the filter to narrow by name or club.</li>
                            <li>Use the save icon to bookmark swimmers for quick access later.</li>
                        </ul>
                    </div>
                )}
                {searchResults.length > 0 && (
                    <div className="search-results-content">
                        <div className="filter-section">
                            <div className="search-filter-row">
                                <div className="search-filter-input-wrap">
                                    <FontAwesomeIcon icon={faFilter} className="search-filter-icon" />
                                    <input
                                        id="quickFilter"
                                        type="text"
                                        value={quickFilter}
                                        onChange={(e) => handleQuickFilterChange(e.target.value)}
                                        placeholder="Filter by name or club..."
                                        disabled={loading}
                                        className="search-filter-input"
                                    />
                                    {quickFilter.length > 0 && (
                                        <button
                                            type="button"
                                            className="search-filter-clear"
                                            onClick={() => handleQuickFilterChange('')}
                                            title="Clear filter"
                                            aria-label="Clear filter"
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="pagination-info">
                                Showing {((currentPage  -1) * resultsPerPage) + 1} to {Math.min(currentPage * resultsPerPage, filteredResults.length)} of {filteredResults.length} results
                                {quickFilter && `(filtered from ${searchResults.length} total)`}
                        </div>
                        <div className={isCompact ? undefined : 'search-results-grid'}>
                        {filteredResults
                            .slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage)
                            .map((swimmer) => {
                                const isSaved = savedTirefs.has(swimmer.tiref);
                                return isCompact ? (
                                  <div key={swimmer.tiref} className="swimmer-result-compact">
                                    <span className="swimmer-result-compact-name">{swimmer.name}</span>
                                    <span className="swimmer-result-compact-meta">{swimmer.club} • Born {swimmer.birthYear} • {swimmer.gender}</span>
                                    <button
                                      onClick={() => onSwimmerSelect(swimmer.tiref, swimmer.name, swimmer.birthYear, swimmer.gender, swimmer.club)}
                                      disabled={loading}
                                      title="View Times"
                                    >
                                      <FontAwesomeIcon icon={faMagnifyingGlass} />
                                    </button>
                                    <button
                                      className={`swimmer-result-save${isSaved ? ' is-saved' : ''}`}
                                      onClick={() => onSaveSwimmer(swimmer.tiref, swimmer.name, swimmer.birthYear, swimmer.gender, swimmer.club)}
                                      disabled={loading || isSaved}
                                      title={isSaved ? 'Already saved' : 'Save swimmer'}
                                      aria-label={isSaved ? 'Already saved' : 'Save swimmer'}
                                    >
                                      <FontAwesomeIcon icon={isSaved ? faBookmark : faFloppyDisk} />
                                    </button>
                                  </div>
                                ) : (
                                <div key={swimmer.tiref} className="swimmer-result">
                                    <div className="swimmer-result-info">
                                        <h3>{swimmer.name}</h3>
                                        <p>{swimmer.club} • Born {swimmer.birthYear} • {swimmer.gender}</p>
                                    </div>
                                    <div className="swimmer-result-actions">
                                        <button
                                            onClick={() => onSwimmerSelect(swimmer.tiref, swimmer.name, swimmer.birthYear, swimmer.gender, swimmer.club)}
                                            disabled={loading}
                                        >
                                            View Times
                                        </button>
                                        <button
                                            className={`swimmer-result-save${isSaved ? ' is-saved' : ''}`}
                                            onClick={() => onSaveSwimmer(swimmer.tiref, swimmer.name, swimmer.birthYear, swimmer.gender, swimmer.club)}
                                            disabled={loading || isSaved}
                                            title={isSaved ? 'Already saved' : 'Save swimmer'}
                                        >
                                            <FontAwesomeIcon icon={isSaved ? faBookmark : faFloppyDisk} />
                                            <span>{isSaved ? 'Saved' : 'Save'}</span>
                                        </button>
                                    </div>
                                </div>
                                );
                            })
                        }
                        </div>
                        {filteredResults.length > resultsPerPage && (
                            <div className="pagination">
                                <button
                                    onClick={() => setCurentPage(prev => Math.max(1, prev-1))}
                                    disabled={currentPage === 1 || loading}
                                    className='btn-ghost'
                                    style={{color: 'var(--primary)'}}
                                >                                    
                                    <FontAwesomeIcon icon={faChevronLeft} /> Previous
                                </button>
                                <span>Page {currentPage} of {Math.ceil(filteredResults.length / resultsPerPage)}</span>
                                <button
                                    onClick={() => setCurentPage(prev => Math.min(Math.ceil(filteredResults.length/resultsPerPage), prev + 1))}
                                    disabled={currentPage >= Math.ceil(filteredResults.length / resultsPerPage) || loading}
                                    className='btn-ghost'
                                    style={{color: 'var(--primary)'}}
                                >                                    
                                    Next <FontAwesomeIcon icon={faChevronRight} />
                                </button>
                            </div>
                        )}
                        {filteredResults.length === 0 && (
                            <div className="empty-state">
                                <p>No swimmers match the current filters</p>
                            </div>
                        )}
                    </div>
                )}
                {/* Only show 'No swimmers found' if a search has been performed and there are no results */}
                {hasSearched && searchResults.length === 0 && (
                    <div className="empty-state">
                        <p>No swimmers found</p>
                    </div>
                )}
            </div>
            </>}
        </section>
    );    
};

export default SearchSection;
