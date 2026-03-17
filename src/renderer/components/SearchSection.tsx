import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { SwimmerSearchResult } from '../../types'   
import { mobileAPI } from '../../api/MobileAPI'

interface SearchSectionProps{
    onSwimmerSelect: (tiref: string, name: string, birthYear: string, gender: string, club: string) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({ onSwimmerSelect, loading, setLoading, showToast}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);        
    const [searchInput, setSearchInput] = useState('');
    const [searchResults, setSearchResults] = useState<SwimmerSearchResult[]>([]);
    const [currentPage, setCurentPage] = useState(1);
    const [firstNameFilter, setFirstNameFilter] = useState('');
    const [clubFilter, setClubFilter] = useState('');
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
            setFirstNameFilter('');
            setClubFilter('');

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
            handleSearch();
        }
    };

    const filteredResults = searchResults.filter(swimmer => {
        const firstNameMatch = !firstNameFilter || swimmer.name.toLowerCase().includes(firstNameFilter.toLowerCase());
        const clubMatch = !clubFilter || swimmer.club.toLowerCase().includes(clubFilter.toLowerCase());

        return firstNameMatch && clubMatch;
    });

    const handleFirstNameFilterChange = (value: string) => {        
        setFirstNameFilter(value);
        setCurentPage(1);
    };

    const handleClubFilterChange = (value: string) => {
        setClubFilter(value);
        setCurentPage(1);
    };

    return (
        <section className="search-section card">
            <div className="section-header">                
                <h2>Search for Swimmer</h2>
                <button className="btn-ghost section-toggle" onClick={() => setIsCollapsed(c => !c)} aria-label="Toggle section">
                    <FontAwesomeIcon icon={faChevronDown} className={`chevron-icon${!isCollapsed ? ' expanded' : ''}`} />
                </button>
            </div>
            {!isCollapsed && <>            
            <div className="search-controls">
                <input 
                    type='text'
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter swimmers lastname (e.g. Jones)"
                    disabled={loading}
                />
                <button onClick={handleSearch} disabled={loading}>Search</button>
            </div>

            <div id='searchResults'>
                {searchResults.length > 0 && (
                    <div>
                        <div className='filter-section'>
                            <div>
                                <label htmlFor='firstNameFilter'>Filter by Name:</label>
                                <input
                                    id='firstNameFilter'
                                    type='text'
                                    value={firstNameFilter}
                                    onChange={(e) => handleFirstNameFilterChange(e.target.value)}
                                    placeholder='Type to filter...'
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label htmlFor='clubFilter'>Filter by Club:</label>
                                <input
                                    id='clubFilter'
                                    type='text'
                                    value={clubFilter}
                                    onChange={(e) => handleClubFilterChange(e.target.value)}
                                    placeholder='Type to filter...'
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <div className='pagination-info'>
                                Showing {((currentPage  -1) * resultsPerPage) + 1} to {Math.min(currentPage * resultsPerPage, filteredResults.length)} of {filteredResults.length} results
                                {(firstNameFilter || clubFilter) && `(filtered from ${searchResults.length} total)`}
                        </div>
                        {filteredResults
                            .slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage)
                            .map((swimmer) => (
                                <div key={swimmer.tiref} className='swimmer-result'>
                                    <div className='swimmer-result-info'>
                                        <h3>{swimmer.name}</h3>
                                        <p>{swimmer.club} • Born {swimmer.birthYear} • {swimmer.gender}</p>
                                    </div>
                                    <button 
                                        onClick={() => onSwimmerSelect(swimmer.tiref, swimmer.name, swimmer.birthYear, swimmer.gender, swimmer.club)}
                                        disabled={loading}
                                    >
                                        View Times
                                    </button>
                                </div>
                            ))
                        }
                        {filteredResults.length > resultsPerPage && (
                            <div className='pagination'>
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
                            <div className='empty-state'>
                                <p>No swimmers match the current filters</p>
                            </div>
                        )}
                    </div>
                )}
                {searchResults.length === 0 && searchInput && (
                    <div className='empty-state'>
                        <p>No swimmers found</p>
                    </div>
                )}
            </div>
            </>}
        </section>
    );    
};

export default SearchSection;