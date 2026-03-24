import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTriangleExclamation, faFolderOpen, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SwimmerData, CountyTimes, CountyTimesStore, ComparisonResult } from '../../types';
import { mobileAPI } from '../../api/MobileAPI';

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

    if (course === '50m' && keyGender === normGender && age >= ageFrom && age <= ageTo) {
      const event = parts.slice(0, courseIndex).join(' ');
      filtered[`${event}_50m`] = allTimes[key];
    }
  });

  return filtered;
};

/** Try to find a county name that matches the swimmer's region field */
const detectCountyFromRegion = (region: string, countyNames: string[]): string | null => {
  if (!region) return null;
  const regionLower = region.toLowerCase();
  return countyNames.find(name => regionLower.includes(name.toLowerCase())) ?? null;
};

const CountyComparison: React.FC<CountyComparisonProps> = ({
  swimmerData,
  countyTimesStore,
  onLoadCountyTimes,
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

  const handleSelectCounty = (county: string) => {
    setSelectedCounty(county);
    onCountySelected(county);
  };

  useEffect(() => {
    if (countyNames.length === 0) {
      setSelectedCounty('');
      return;
    }
    if (selectedCounty && countyNames.includes(selectedCounty)) return;

    const preferred = swimmerData.preferredCounty && countyNames.includes(swimmerData.preferredCounty)
      ? swimmerData.preferredCounty
      : null;
    const detected = preferred ?? detectCountyFromRegion(swimmerData.region, countyNames) ?? countyNames[0];
    setSelectedCounty(detected);
  }, [countyTimesStore, swimmerData.tiref]);

  const handleCompare = async () => {
    if (!swimmerData.birthYear || !swimmerData.gender) {
      showToast('Swimmer birth year or gender not available for comparison', 'error');
      return;
    }
    if (!selectedCounty || !countyTimesStore[selectedCounty]) {
      showToast('No standards loaded. Please load a standards file first.', 'error');
      return;
    }

    setLoading(true);
    try {
      const allTimes = countyTimesStore[selectedCounty];
      const age = calculateAge(swimmerData.birthYear);
      const targetAge = lookAhead ? age + 1 : age;
      const adjustedBirthYear = lookAhead
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
            <strong>Loaded Standards:</strong>
            {countyNames.length > 0 ? (
              <div className="swimmer-tags">
                {countyNames.map(county => (
                  <span key={county} className="swimmer-tag-badge">
                    {county}
                    <button
                      className="swimmer-tag-remove"
                      onClick={() => onClearOneCounty(county)}
                      disabled={loading}
                      title={`Remove ${county}`}
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--danger)' }}>
                <FontAwesomeIcon icon={faTriangleExclamation} /> No standards loaded
              </span>
            )}
          </div>
          <button
            onClick={onLoadCountyTimes}
            disabled={loading}
            className="btn-ghost"
            style={{ padding: '5px 15px', fontSize: '0.9em', color: 'var(--primary)', whiteSpace: 'nowrap' }}
          >
            <FontAwesomeIcon icon={faFolderOpen} /> Load Standards from File
          </button>
        </div>
        {swimmerData.region && (
          <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
            Swimmer region: <strong>{swimmerData.region}</strong>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="comparison-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {countyNames.length > 1 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95em' }}>
            Standards:
            <select
              value={selectedCounty}
              onChange={e => handleSelectCounty(e.target.value)}
              style={{ padding: '4px 8px' }}
            >
              {countyNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
        )}
        <button onClick={handleCompare} disabled={loading || countyNames.length === 0}>
          Compare with {selectedCounty || 'Standards'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95em', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={lookAhead}
            onChange={e => setLookAhead(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span>Look ahead to next year's age category</span>
        </label>
      </div>

      {comparison && (
        <div className="table-container">
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
              {comparison.comparisons.map((comp, index) => (
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
      )}
    </div>
  );
};

export default CountyComparison;
