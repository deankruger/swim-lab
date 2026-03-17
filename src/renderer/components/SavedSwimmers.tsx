import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChain, faChartBar, faCheck, faPlus, faRotate, faTag, faTimes, faTrash, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { SwimmerData } from "../../types";

interface SavedSwimmersProps {
    swimmers: SwimmerData[];
    onLoad: (swimmers: SwimmerData) => void;
    onDelete: (tiref: string) => void;
    onRefreshAll: () => void;    
    onCompare: (swimmers: SwimmerData[]) => void;
    onUpdateTags: (tiref: string, tags: string[]) => void;
}

const SavedSwimmers: React.FC<SavedSwimmersProps> = ({ swimmers, onLoad, onDelete, onRefreshAll, onCompare, onUpdateTags }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [collapsedClubs, setCollapsedClubs] = useState<Set<string>>(new Set());
    const [selectedSwimmers, setSelectedSwimmers] = useState<Set<string>>(new Set());
    const [selectedTag, setSelectedTag] = useState<string>('all');
    const [addingTagFor, setAddingTagFor] = useState<string | null>(null);
    const [newTagValue, setNewTagValue] = useState<string>('');

    //Get all unique tags across all swimmer
    const allTags = Array.from(new Set(swimmers.flatMap(s => s.tags || []))).sort();

    //Filter the swimmers by selected tag
    const filteredSwimmers = selectedTag === 'all'
        ? swimmers 
        : selectedTag === 'Untagged'
        ? swimmers.filter(s => !s.tags || s.tags.length === 0)
        : swimmers.filter(s => s.tags?.includes(selectedTag));

    //Group swimmers by club
    const swimmersByClub = filteredSwimmers.reduce((acc, swimmer) => {
        const club = swimmer.club || 'Unknown Club';
        if (!acc[club]) acc[club] = [];
        acc[club].push(swimmer);
        return acc;
    }, {} as Record<string, SwimmerData[]>);

    Object.keys(swimmersByClub).forEach(club => {
        swimmersByClub[club].sort((a, b) => a.name.localeCompare(b.name))
    });

    const sortedClubs = Object.keys(swimmersByClub).sort();

    const toggleClub = (club: string) => {
        setCollapsedClubs(prev => {
            const next = new Set(prev);
            if (next.has(club)) next.delete(club); else next.add(club);
            return next;
        });
    };

    const toggleSelection = (tiref: string) => {
        const newSelection = new Set(selectedSwimmers);
        if (newSelection.has(tiref)){
            newSelection.delete(tiref);
        } else {
            if (newSelection.size > 5) return;
            newSelection.add(tiref);            
        }
        setSelectedSwimmers(newSelection);
    };

    const handleCompare= () => {
        const swimmersToCompare = swimmers.filter(s => selectedSwimmers.has(s.tiref));
        onCompare(swimmersToCompare);
    };

    const clearSelection = () => setSelectedSwimmers(new Set());

    const handleAddTag = (tiref: string) => {
        const tag = newTagValue.trim();
        if (!tag) return;
        const swimmer = swimmers.find(s => s.tiref === tiref);
        if (!swimmer) return;
        const currentTags = swimmer.tags || [];
        if (!currentTags.includes(tag)){
            onUpdateTags(tiref, [...currentTags, tag]);
        }
        setNewTagValue('');
        setAddingTagFor(null);
    };

    
    const handleTagRemove = (tiref: string, tag: string) => {
        const swimmer = swimmers.find(s => s.tiref === tiref);
        if (!swimmer) return;
        const newTags = (swimmer.tags || []).filter(t => t !== tag);
        onUpdateTags(tiref, newTags);
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent, tiref: string) => {
        if (e.key === 'Enter'){
            handleAddTag(tiref);
        } else if (e.key === 'Escape'){
            setAddingTagFor(null);
            setNewTagValue('');
        }        
    };
    
    return (
        <section className="saved-section card">
            <div className="section-header">
                <h2>Saved Swimmers</h2>
                <button className="btn-ghost section-toggle" onClick={() => setIsCollapsed(c => !c)} aria-label="Toggle section">
                    <FontAwesomeIcon icon={faChevronDown} className={`chevron-icon${!isCollapsed ? ' expanded' : ''}`} />
                </button>                
            </div>

            {!isCollapsed && 
                <>
                    <div className="action-buttons">
                        {selectedSwimmers.size > 0 ? (
                            <>
                                <button onClick={handleCompare} title="Compare Swimmer(s)" className="btn-clear btn-ghost" disabled={selectedSwimmers.size < 2} style={{ color: 'var(--success)' }}>
                                    <FontAwesomeIcon icon={faChartBar} />
                                </button>
                                <button>Clear Selection</button>
                            </>
                        ) : (
                            swimmers.length > 0 && (
                                <button onClick={onRefreshAll} className="btn-clear btn-ghost" title='Reload all swimmers times to update recent club information and new times' style={{ color: 'var(--success)' }}>
                                    <FontAwesomeIcon icon={faRotate} />
                                </button>
                            )
                        )}
                    </div>
                    <div className="group-filter">
                        <label htmlFor="tagFilter">Filter by Tag:</label>
                        <select
                            id='tagFilter'
                            value={selectedTag}
                            onChange={(e) => setSelectedTag(e.target.value)}
                        >
                            <option value='all'>All ({swimmers.length})</option>
                            <option value='Untagged'>Untagged ({swimmers.filter(s => !s.tags || s.tags.length === 0).length})</option>
                            {allTags.map(tag => (
                                <option key={tag} value={tag}>
                                    {tag} ({swimmers.filter(s => s.tags?.includes(tag)).length})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div id='savedSwimmers'>
                        {filteredSwimmers.length === 0 ? (
                            <div className="emtpy-state">
                                <p>{selectedTag === 'all' ? 'No saved swimmers yet' : `No swimmers tagged "${selectedTag}"`}</p>
                            </div>
                        ) : (
                            sortedClubs.map((club, clubIndex) => {
                                const clubCollapsed = collapsedClubs.has(club);

                                return (
                                <div key={club} style={{ marginBottom: clubIndex < sortedClubs.length - 1 ? '2rem' : '0' }}>
                                    <div 
                                        className="club-header"
                                        onClick={() => toggleClub(club)}
                                        style={{marginTop: clubIndex > 0 ? '0.5rem' : '0'}}>
                                        <h3 className="club-header-title">
                                            {club} <span className="club-count">({swimmersByClub[club].length} {swimmersByClub[club].length === 1 ? 'swimmer' : 'swimmers'})</span>
                                        </h3>
                                        <FontAwesomeIcon icon={faChevronDown} className={`chevron-icon${!clubCollapsed ? ' expanded' : ''}`} />
                                    </div>
                                    {!clubCollapsed && 
                                    <div className="saved-swimmers-grid">
                                        {swimmersByClub[club].map((swimmer) => {
                                            const isSelected = selectedSwimmers.has(swimmer.tiref);
                                            const tags = swimmer.tags || [];
                                            return (
                                                <div
                                                    key={swimmer.tiref}
                                                    className={`saved-swimmer-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => toggleSelection(swimmer.tiref)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {isSelected && <div className="selection-badge"><FontAwesomeIcon icon={faCheck} /></div>}
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} >
                                                            <h3 style={{ margin: '0' }}>{swimmer.name || `Tiref ${swimmer.tiref}`}</h3>
                                                            <button onClick={() => onDelete(swimmer.tiref)} className="btn-clear btn-ghost" title="Delete saved swimmer" style={{ color: 'var(--danger)' }}>
                                                                <FontAwesomeIcon icon={faTrash} />
                                                            </button>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }} >
                                                            <p>{swimmer.times.length} events</p>
                                                            {/* Tags display */}
                                                            {tags.length > 0 && (
                                                                <div className="swimmer-tags" onClick={(e) => e.stopPropagation()}>
                                                                    {tags.map(tag => (
                                                                        <span key={tag} className="swimmer-tag-badge">
                                                                            {tag}
                                                                            <button
                                                                                className="swimmer-tag-remove"
                                                                                onClick={() => handleTagRemove(swimmer.tiref, tag)}
                                                                                title={`Remove tag "${tag}"`}
                                                                            >
                                                                                <FontAwesomeIcon icon={faTimes} />
                                                                            </button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="saved-swimmer-actions" onClick={(e) => e.stopPropagation()}>
                                                        <button onClick={() => onLoad(swimmer)}>View</button>

                                                        {addingTagFor === swimmer.tiref ? (
                                                            <div className="group-edit-container">
                                                                <input
                                                                    type="text"
                                                                    list={`tags-${swimmer.tiref}`}
                                                                    value={newTagValue}
                                                                    onChange={(e) => setNewTagValue(e.target.value)}
                                                                    onKeyDown={(e) => handleTagInputKeyDown(e, swimmer.tiref)}
                                                                    onBlur={(e) => handleAddTag(swimmer.tiref)}
                                                                    placeholder="Tag name..."
                                                                    className="group-input"
                                                                    autoFocus
                                                                />
                                                                <datalist id={`tags-${swimmer.tiref}`}>
                                                                    {allTags.filter(t => !tags.includes(t)).map(tag => (
                                                                        <option key={tag} value={tag} />
                                                                    ))}
                                                                </datalist>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => { setAddingTagFor(swimmer.tiref); setNewTagValue(''); }}
                                                                className="group-butto"
                                                                title="Add tag"
                                                            >
                                                                <FontAwesomeIcon icon={faTag} /> <FontAwesomeIcon icon={faPlus} />
                                                            </button>
                                                        )}

                                                    </div>

                                                </div>
                                            );
                                        })}
                                    </div>
                                    }
                                </div>
                            )})
                        )}
                    </div>
                </>
            } 
        </section>
    );
};

export default SavedSwimmers;