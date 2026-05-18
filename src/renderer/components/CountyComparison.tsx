import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTriangleExclamation, faFolderOpen, faXmark, faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import { SwimmerData, CountyTimes, CountyTimesStore, ComparisonResult } from '../../types';
import { mobileAPI } from '../../api/MobileAPI';
import { parseEventName, getShortStrokeName } from '../../services/utils/EventOrdering';

interface CountyComparisonProps {
  swimmerData: SwimmerData;
  countyTimesStore: CountyTimesStore;
  activeStandards: string[];
  onActiveStandardsChange: (active: string[]) => void;
  selectedStrokes?: string[];
  onSelectedStrokesChange?: (strokes: string[]) => void;
  selectedDistances?: string[];
  onSelectedDistancesChange?: (distances: string[]) => void;
  onLoadCountyTimes: () => void;
  onClearOneCounty: (county: string) => void;
  onCountySelected: (county: string) => void;
  onComparisonChange?: (result: ComparisonResult | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const calculateAge = (birthYear: string): number => {
  return new Date().getFullYear() - parseInt(birthYear);
};

const normalizeGender = (gender: string): string => {
  const g = gender.toLowerCase();
  if (g.includes('female')) return 'female';
  if (g.includes('male') || g === 'm') return 'male';
  if (g === 'f') return 'female';
  return g;
};

const getFilteredCountyTimes = (birthYear: string, gender: string, allTimes: CountyTimes): CountyTimes => {
  const age = calculateAge(birthYear);
  const normGender = normalizeGender(gender);
  const filtered: CountyTimes = {};

  Object.keys(allTimes).forEach(key => {
    const parts = key.split('_');
    const courseIndex = parts.findIndex(p => p === '25m' || p === '50m');
    if (courseIndex <= 0) return;

    const course = parts[courseIndex];
    const keyGender = normalizeGender(parts[courseIndex + 1] || '');
    const ageFrom = parseInt(parts[courseIndex + 2]);
    const ageTo = parseInt(parts[courseIndex + 3]);

    if (keyGender === normGender && age >= ageFrom && age <= ageTo) {
      const event = parts.slice(0, courseIndex).join(' ');
      const outputKey = `${event}_50m`;
      // Prefer 50m (LC) standards; only use 25m (SC) if no LC entry exists for this event.
      // This lets SC-only counties like Essex still show their times.
      if (course === '50m' || !filtered[outputKey]) {
        filtered[outputKey] = allTimes[key];
      }
    }
  });

  return filtered;
};

/** Try to find a county name that matches the swimmer's region field */
type StandardCategory = 'County' | 'Regional' | 'National / International' | 'Other';

const getStandardCategory = (name: string): StandardCategory => {
  const normalized = name.toLowerCase();

  if (normalized.includes('national') || normalized.includes('international') || normalized.includes('ssa') || normalized.includes('british') || normalized.includes('fina')) {
    return 'National / International';
  }

  if (normalized.includes('london') || normalized.includes('regional') || normalized.includes('se ')) {
    return 'Regional';
  }

  if (normalized.includes('custom')) {
    return 'Other';
  }

  return 'County';
};

const detectCountyFromRegion = (region: string, countyNames: string[]): string | null => {
  if (!region) return null;
  const regionLower = region.toLowerCase();
  return countyNames.find(name => regionLower.includes(name.toLowerCase())) ?? null;
};

const CountyComparison: React.FC<CountyComparisonProps> = ({
  swimmerData,
  countyTimesStore,
  activeStandards,
  onActiveStandardsChange,  selectedStrokes = [],
  onSelectedStrokesChange,
  selectedDistances = [],
  onSelectedDistancesChange,  onLoadCountyTimes,
  onClearOneCounty,
  onCountySelected,
  onComparisonChange,
  loading,
  setLoading,
  showToast,
}) => {
  const countyNames = Object.keys(countyTimesStore);

  const [selectedCounty, setSelectedCounty] = useState<string>('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [lookAhead, setLookAhead] = useState(false);
  const [showStandardsModal, setShowStandardsModal] = useState(false);

  useEffect(() => { setComparison(null); onComparisonChange?.(null); }, [swimmerData.tiref]);

  const activeCountyNames = countyNames.filter(name => activeStandards.includes(name));

  const handleSelectCounty = (county: string) => {
    setSelectedCounty(county);
    onCountySelected(county);
  };

  useEffect(() => {
    const activeCountyNames = countyNames.filter(name => activeStandards.includes(name));
    if (activeCountyNames.length === 0) {
      setSelectedCounty('');
      return;
    }
    if (selectedCounty && activeCountyNames.includes(selectedCounty)) return;

    const preferred = swimmerData.preferredCounty && activeCountyNames.includes(swimmerData.preferredCounty)
      ? swimmerData.preferredCounty
      : null;
    const detected = preferred ?? detectCountyFromRegion(swimmerData.region, activeCountyNames) ?? activeCountyNames[0];
    setSelectedCounty(detected);
  }, [activeStandards, countyTimesStore, swimmerData.region, selectedCounty]);

  const handleCompare = async (lookAheadOverride?: boolean) => {
    if (!swimmerData.birthYear || !swimmerData.gender) {
      showToast('Swimmer birth year or gender not available for comparison', 'error');
      return;
    }

    const activeCountyNames = countyNames.filter(name => activeStandards.includes(name));
    if (!selectedCounty || !activeCountyNames.includes(selectedCounty) || !countyTimesStore[selectedCounty]) {
      showToast('No active standards selected. Open Load and select one or more standards.', 'error');
      return;
    }

    const effectiveLookAhead = lookAheadOverride ?? lookAhead;
    setLoading(true);
    try {
      const allTimes = countyTimesStore[selectedCounty];
      const age = calculateAge(swimmerData.birthYear);
      const targetAge = effectiveLookAhead ? age + 1 : age;
      const adjustedBirthYear = effectiveLookAhead
        ? (parseInt(swimmerData.birthYear) - 1).toString()
        : swimmerData.birthYear;

      const filtered = getFilteredCountyTimes(adjustedBirthYear, swimmerData.gender, allTimes);

      if (Object.keys(filtered).length === 0) {
        showToast(
          `No ${selectedCounty} times found for Age ${targetAge}, Gender ${swimmerData.gender}, 50m course.`,
          'error'
        );
        return;
      }

      const result = await mobileAPI.compareWithCountyTimes(swimmerData, filtered);
      setComparison(result);
      onComparisonChange?.(result);
    } catch (error) {
      showToast(`Error comparing times: ${(error as Error).message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-content active">
      {/* County files status */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'var(--card-bg)', borderRadius: '5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <p><strong>Loaded Standards:</strong></p>
            {activeCountyNames.length > 0 ? (
              <div className="standards-group-list" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(['County', 'Regional', 'National / International', 'Other'] as StandardCategory[])
                  .map(category => {
                    const categoryItems = activeCountyNames.filter(name => getStandardCategory(name) === category);
                    if (categoryItems.length === 0) return null;
                    return (
                      <div key={category} className="standards-group" style={{ minWidth: '180px' }}>
                        <div className="standards-group-title" style={{ fontSize: '0.85em', fontWeight: 600, marginBottom: '4px' }}>{category}</div>
                        <div className="swimmer-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {categoryItems.map(county => (
                            <span key={county} className="swimmer-tag-badge">
                              {county}
                              <button
                                className="swimmer-tag-remove"
                                onClick={() => onActiveStandardsChange(activeStandards.filter(name => name !== county))}
                                disabled={loading}
                                title={`Hide ${county} from comparison`}
                              >
                                <FontAwesomeIcon icon={faXmark} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <span style={{ color: 'var(--danger)' }}>
                <FontAwesomeIcon icon={faTriangleExclamation} /> No standards loaded
              </span>
            )}
          </div>
          <button
            onClick={() => setShowStandardsModal(true)}
            disabled={loading}
            className="btn-ghost"
            style={{ padding: '5px 15px', fontSize: '0.9em', color: 'var(--primary)', whiteSpace: 'nowrap' }}
          >
            <FontAwesomeIcon icon={faFolderOpen} /> Load
          </button>
        </div>
        {showStandardsModal && (
          <div className="modal-backdrop" onClick={() => setShowStandardsModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Standards</h3>
                <button className="modal-close" onClick={() => setShowStandardsModal(false)} aria-label="Close standards modal">×</button>
              </div>
              <div className="modal-body">
                <p>Select which standards should be available in the comparison dropdown. Standards are grouped into County, Regional, and National / International categories.</p>
                <div className="standards-list">
                  {countyNames.length > 0 ? (
                    (['County', 'Regional', 'National / International', 'Other'] as StandardCategory[])
                      .map(category => {
                        const namesInCategory = countyNames.filter(name => getStandardCategory(name) === category);
                        if (namesInCategory.length === 0) return null;
                        return (
                          <div key={category} className="standards-category">
                            <div className="standards-category-title">{category}</div>
                            {namesInCategory.map(county => (
                              <label key={county} className="standards-item">
                                <input
                                  type="checkbox"
                                  checked={activeStandards.includes(county)}
                                  onChange={() => onActiveStandardsChange(
                                    activeStandards.includes(county)
                                      ? activeStandards.filter(name => name !== county)
                                      : [...activeStandards, county]
                                  )}
                                />
                                <span>{county}</span>
                              </label>
                            ))}
                          </div>
                        );
                      })
                  ) : (
                    <div className="empty-standards">No standards loaded yet.</div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" style={{opacity:0.8}} onClick={() => onActiveStandardsChange(countyNames)} disabled={countyNames.length === 0}>
                  <FontAwesomeIcon icon={faCheckSquare} /> Select All</button>
                <button type="button" className="btn" style={{opacity:0.8}} onClick={() => onActiveStandardsChange([])} disabled={countyNames.length === 0}>
                  Clear All</button>
                <button type="button" className="btn" style={{opacity:0.8}} onClick={onLoadCountyTimes} disabled={loading}>
                  <FontAwesomeIcon icon={faFolderOpen} /> Load from File
                </button>
                <button type="button" className="btn" onClick={() => setShowStandardsModal(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {swimmerData.region && (
        <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
          Swimmer region: <strong>{swimmerData.region}</strong>
        </div>
      )}

      {/* Controls */}
      <div className="comparison-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {activeCountyNames.length > 1 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95em' }}>
            Standards:
            <select
              value={selectedCounty}
              onChange={e => handleSelectCounty(e.target.value)}
              style={{ padding: '4px 8px' }}
            >
              {(['County', 'Regional', 'National / International', 'Other'] as StandardCategory[])
                .map(category => {
                  const namesInCategory = activeCountyNames.filter(name => getStandardCategory(name) === category);
                  if (namesInCategory.length === 0) return null;
                  return (
                    <optgroup key={category} label={category}>
                      {namesInCategory.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </optgroup>
                  );
                })}
            </select>
          </label>
        )}
        {activeCountyNames.length === 1 && (
          <div style={{ fontSize: '0.95em' }}><strong>Standard:</strong> {activeCountyNames[0]}</div>
        )}
        <button onClick={() => handleCompare()} disabled={loading || activeCountyNames.length === 0}>
          Compare with {selectedCounty || 'Standards'}
        </button>
        <div className="segmented-toggle">
          <button className={!lookAhead ? 'active' : ''} onClick={() => { setLookAhead(false); handleCompare(false); }}>Current Year</button>
          <button className={lookAhead ? 'active' : ''} onClick={() => { setLookAhead(true); handleCompare(true); }}>Next Year</button>
        </div>
      </div>

      {comparison && (
        <>
          <div className="filter-section">
            <div>
              <label>Stroke:</label>
              <div className="filter-toggles">
                {Array.from(new Set(comparison.comparisons.map(comp => parseEventName(comp.event).stroke))).map(stroke => (
                  <button
                    key={stroke}
                    className={`filter-toggle ${selectedStrokes.includes(stroke) ? 'active' : ''}`}
                    onClick={() => {
                      if (onSelectedStrokesChange) {
                        const newStrokes = selectedStrokes.includes(stroke)
                          ? selectedStrokes.filter(s => s !== stroke)
                          : [...selectedStrokes, stroke];
                        onSelectedStrokesChange(newStrokes);
                      }
                    }}
                  >
                    {getShortStrokeName(stroke)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Distance:</label>
              <div className="filter-toggles">
                {Array.from(new Set(comparison.comparisons.map(comp => parseEventName(comp.event).distance.toString()))).map(distance => (
                  <button
                    key={distance}
                    className={`filter-toggle ${selectedDistances.includes(distance) ? 'active' : ''}`}
                    onClick={() => {
                      if (onSelectedDistancesChange) {
                        const newDistances = selectedDistances.includes(distance)
                          ? selectedDistances.filter(d => d !== distance)
                          : [...selectedDistances, distance];
                        onSelectedDistancesChange(newDistances);
                      }
                    }}
                  >
                    {distance}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: 'var(--card-bg)', borderRadius: '5px' }}>
            <strong>Comparing Against: </strong>
            {selectedCounty} Standards
            {swimmerData.birthYear && (
              <>
                {' — '}Age {lookAhead ? calculateAge(swimmerData.birthYear) + 1 : calculateAge(swimmerData.birthYear)}
                {lookAhead && (
                  <span style={{ marginLeft: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                    (Next Year)
                  </span>
                )}
              </>
            )}
          </div>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Course</th>
                  <th>Swimmer Time</th>
                  <th>Qualifying</th>
                  <th>Consideration</th>
                  <th>Age Category</th>
                  <th>Difference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {comparison.comparisons.filter(comp => {
                  const { stroke, distance } = parseEventName(comp.event);
                  const strokeMatch = selectedStrokes.length === 0 || selectedStrokes.includes(stroke);
                  const distanceMatch = selectedDistances.length === 0 || selectedDistances.includes(distance.toString());
                  return strokeMatch && distanceMatch;
                }).map((comp, index) => (
                  <tr key={index}>
                    <td data-label="Event">{comp.event}</td>
                    <td data-label="Course">{comp.course}</td>
                    <td data-label="Swimmer Time"><strong>{comp.swimmerTime}</strong></td>
                    <td data-label="Qualifying">{comp.standardTime}</td>
                    <td data-label="Consideration">{comp.considerationTime || '—'}</td>
                    <td data-label="Age Category">{comp.ageCategory || '—'}</td>
                    <td data-label="Difference">{comp.difference}</td>
                    <td data-label="Status">
                      {comp.isFaster === null ? '—' : comp.isFaster ? (
                        <span className="faster"><FontAwesomeIcon icon={faCheck} /> Qualifies</span>
                      ) : comp.meetsConsideration ? (
                        <span style={{ color: 'var(--warning-color, orange)' }}>~ Consideration</span>
                      ) : (
                        <span className="slower"><FontAwesomeIcon icon={faXmark} /> Slower</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default CountyComparison;
