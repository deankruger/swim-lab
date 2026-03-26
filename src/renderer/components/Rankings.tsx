import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPersonSwimming, faSpinner, faRotate, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { SwimmerData, EventRanking, RankingEntry } from '../../types';
import { mobileAPI } from '../../api/MobileAPI';

interface RankingsProps {
  swimmerData: SwimmerData;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onRankingsSaved?: () => void;
}

interface CachedRanking {
  kentCounty?: { entry: RankingEntry | null; total: number; ageGroup?: string };
  national?: { entry: RankingEntry | null; total: number; ageGroup?: string };
}

const COUNTIES: { code: string; name: string }[] = [
  { code: 'BDFT', name: 'Bedfordshire' },
  { code: 'BSBS', name: 'Berkshire & South Bucks' },
  { code: 'CMBT', name: 'Cambridgeshire' },
  { code: 'CHRN', name: 'Cheshire' },
  { code: 'CWLW', name: 'Cornwall' },
  { code: 'CUMN', name: 'Cumbria' },
  { code: 'DRBA', name: 'Derbyshire' },
  { code: 'DVNW', name: 'Devon' },
  { code: 'DRSW', name: 'Dorset' },
  { code: 'SEDX', name: 'East Scotland' },
  { code: 'ESXQ', name: 'Essex' },
  { code: 'GLUW', name: 'Gloucester' },
  { code: 'HNTS', name: 'Hampshire' },
  { code: 'HRTT', name: 'Hertfordshire' },
  { code: 'KNTQ', name: 'Kent' },
  { code: 'LNCN', name: 'Lancashire' },
  { code: 'LECA', name: 'Leicestershire' },
  { code: 'LNCA', name: 'Lincolnshire' },
  { code: 'SMDX', name: 'Mid Scotland' },
  { code: 'MDXL', name: 'Middlesex' },
  { code: 'NRFT', name: 'Norfolk' },
  { code: 'SNDX', name: 'North Scotland' },
  { code: 'NWAY', name: 'North Wales' },
  { code: 'NHPA', name: 'Northamptonshire' },
  { code: 'NDRE', name: 'Northumberland & Durham' },
  { code: 'NTMA', name: 'Nottinghamshire' },
  { code: 'ONBS', name: 'Oxfordshire & North Bucks' },
  { code: 'SHPM', name: 'Shropshire' },
  { code: 'SMSW', name: 'Somerset' },
  { code: 'STFM', name: 'Staffordshire' },
  { code: 'EWAY', name: 'South East Wales' },
  { code: 'WWAY', name: 'South West Wales' },
  { code: 'SFKT', name: 'Suffolk' },
  { code: 'SRYQ', name: 'Surrey' },
  { code: 'SSXS', name: 'Sussex' },
  { code: 'WWKM', name: 'Warwickshire' },
  { code: 'SCWX', name: 'West Scotland' },
  { code: 'WLTW', name: 'Wiltshire' },
  { code: 'WRCM', name: 'Worcester' },
  { code: 'YRKE', name: 'Yorkshire' },
];

const STROKE_IDS: Record<string, number> = {
  '50 Freestyle': 1,   '100 Freestyle': 2,   '200 Freestyle': 3,   '400 Freestyle': 4,
  '800 Freestyle': 5,  '1500 Freestyle': 6,
  '50 Breaststroke': 7, '100 Breaststroke': 8, '200 Breaststroke': 9,
  '50 Butterfly': 10,  '100 Butterfly': 11,  '200 Butterfly': 12,
  '50 Backstroke': 13, '100 Backstroke': 14, '200 Backstroke': 15,
  '200 Individual Medley': 16, '400 Individual Medley': 17,
  '100 Individual Medley': 18, '150 Individual Medley': 19,
};

function buildRankingUrl(
  event: string,
  course: '25m' | '50m',
  sex: string,
  ageGroup: number,
  level: 'C' | 'N',
  countyCode: string,
): string | undefined {
  const strokeId = STROKE_IDS[event];
  if (!strokeId || !ageGroup) return undefined;
  const pool = course === '50m' ? 'L' : 'S';
  const date = encodeURIComponent(`31/12/${new Date().getFullYear()}`);
  let url = `https://www.swimmingresults.org/12months/last12.php?Pool=${pool}&Stroke=${strokeId}&Sex=${sex}&AgeGroup=${ageGroup}&date=${date}&StartNumber=1&RecordsToView=100`;
  if (level === 'C') {
    url += `&TargetNationality=P&TargetRegion=P&Level=C&TargetCounty=${countyCode}&TargetClub=XXXX`;
  } else {
    url += '&Level=N&TargetNationality=X&TargetRegion=P&TargetCounty=XXXX&TargetClub=XXXX';
  }
  return url;
}

const detectCountyCode = (region: string): string => {
  if (!region) return 'KNTQ';
  const regionLower = region.toLowerCase();
  return COUNTIES.find(c => regionLower.includes(c.name.toLowerCase()))?.code ?? 'KNTQ';
};

const Rankings: React.FC<RankingsProps> = ({ swimmerData, loading, setLoading, showToast, onRankingsSaved }) => {
  // Separate state for regular and forecast rankings
  const [regularRankings, setRegularRankings] = useState<Map<string, CachedRanking>>(() => {
    if (swimmerData.rankings) {
      return new Map(Object.entries(swimmerData.rankings));
    }
    return new Map();
  });

  const [forecastRankingsData, setForecastRankingsData] = useState<Map<string, CachedRanking>>(() => {
    if (swimmerData.forecastRankings) {
      return new Map(Object.entries(swimmerData.forecastRankings));
    }
    return new Map();
  });

  const [courseFilter, setCourseFilter] = useState<'all' | '25m' | '50m'>('all');
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());
  const [loadingEvents, setLoadingEvents] = useState<Set<string>>(new Set());
  const toggleCourse = (course: string) =>  { 
    setCollapsedCourses(prev => {
      const next = new Set(prev);
      if (next.has(course)) next.delete(course); else next.add(course);
      return next;
    });
  };
  const [forecastMode, setForecastMode] = useState<boolean>(false);
  const [countyCode, setCountyCode] = useState<string>(
    swimmerData.selectedCountyCode ?? detectCountyCode(swimmerData.region)
  );

  const selectedCountyName = COUNTIES.find(c => c.code === countyCode)?.name ?? countyCode;

  // Swimmer demographics used for ranking URL construction
  const currentYear = new Date().getFullYear();
  const swimmerAge = swimmerData.birthYear ? currentYear - parseInt(swimmerData.birthYear) : 0;
  const swimmerSex = swimmerData.gender?.toUpperCase().includes('FEMALE') ? 'F' : 'M';
  const canShowForecast = swimmerAge === 9 || swimmerAge === 10;

  // Get the appropriate rankings based on forecast mode
  const rankings = forecastMode ? forecastRankingsData : regularRankings;

  // Sync rankings when swimmerData changes (e.g., when loading a saved swimmer)
  useEffect(() => {
    if (swimmerData.rankings) {
      setRegularRankings(new Map(Object.entries(swimmerData.rankings)));
    } else {
      setRegularRankings(new Map());
    }

    if (swimmerData.forecastRankings) {
      setForecastRankingsData(new Map(Object.entries(swimmerData.forecastRankings)));
    } else {
      setForecastRankingsData(new Map());
    }

    setCountyCode(swimmerData.selectedCountyCode ?? detectCountyCode(swimmerData.region));
  }, [swimmerData.tiref, swimmerData.rankings, swimmerData.forecastRankings]);

  // Get unique events (event + course combination)
  const events = swimmerData.times.map(time => ({
    event: time.event,
    course: time.course,
    time: time.time,
    date: time.date,
    sourceUrl: time.sourceUrl,
    key: `${time.event}_${time.course}`
  }));

  // Filter events by course
  const filteredEvents = events.filter(evt => {
    if (courseFilter === 'all') return true;
    return evt.course === courseFilter;
  });

  // Group by course
  const groupedByCourse = filteredEvents.reduce((acc, evt) => {
    if (!acc[evt.course]) {
      acc[evt.course] = [];
    }
    acc[evt.course].push(evt);
    return acc;
  }, {} as Record<string, typeof events>);

  const sortedCourses = Object.keys(groupedByCourse).sort((a, b) => {
    if (a === '50m') return -1;
    if (b === '50m') return 1;
    return a.localeCompare(b);
  });

  const fetchRanking = async (eventKey: string, level: 'C' | 'N') => {
    if (!swimmerData.birthYear || !swimmerData.gender) {
      showToast('Cannot load rankings: missing birth year or gender', 'error');
      return;
    }

    const event = events.find(e => e.key === eventKey);
    if (!event) return;

    // Mark this event as loading
    setLoadingEvents(prev => new Set(prev).add(`${eventKey}_${level}`));

    try {
      // Create a minimal SwimmerData with just this event
      const singleEventData: SwimmerData = {
        ...swimmerData,
        times: [swimmerData.times.find(t => `${t.event}_${t.course}` === eventKey)!]
      };

      const rankingsData = await mobileAPI.getSwimmerRankings(singleEventData, level, forecastMode, countyCode);

      if (rankingsData.rankings.length > 0) {
        const ranking = rankingsData.rankings[0];

        // Update rankings state
        const updatedRankings = new Map(rankings);
        const existing = updatedRankings.get(eventKey) || {};

        if (level === 'C') {
          existing.kentCounty = {
            entry: ranking.kentCountyRanking,
            total: ranking.totalKentCounty,
            ageGroup: ranking.kentCountyAgeGroup
          };
        } else {
          existing.national = {
            entry: ranking.nationalRanking,
            total: ranking.totalNational,
            ageGroup: ranking.nationalAgeGroup
          };
        }

        updatedRankings.set(eventKey, existing);

        // Update the appropriate state based on forecast mode
        if (forecastMode) {
          setForecastRankingsData(updatedRankings);
        } else {
          setRegularRankings(updatedRankings);
        }

        // Save updated rankings to swimmer data (in the appropriate property)
        const rankingsRecord: Record<string, CachedRanking> = {};
        updatedRankings.forEach((value, key) => {
          rankingsRecord[key] = value;
        });

        // Save to the appropriate property based on forecast mode
        const updatedSwimmerData: SwimmerData = forecastMode
          ? {
              ...swimmerData,
              selectedCountyCode: countyCode,
              rankings: Object.fromEntries(regularRankings),  // Preserve regular rankings
              forecastRankings: rankingsRecord  // Update forecast rankings
            }
          : {
              ...swimmerData,
              selectedCountyCode: countyCode,
              rankings: rankingsRecord,  // Update regular rankings
              forecastRankings: Object.fromEntries(forecastRankingsData)  // Preserve forecast rankings
            };

        console.log('Saving swimmer with rankings:', {
          name: updatedSwimmerData.name,
          tiref: updatedSwimmerData.tiref,
          rankingsKeys: Object.keys(rankingsRecord),
          rankingsData: rankingsRecord
        });

        // Save to data store (await to ensure it completes)
        mobileAPI.saveSwimmer(updatedSwimmerData)
          .then((savedData) => {
            console.log('Rankings saved successfully for', swimmerData.name);
            console.log('Saved data:', savedData);
            // Refresh saved swimmers list in parent component
            if (onRankingsSaved) {
              onRankingsSaved();
            }
          })
          .catch(err => {
            console.error('Error saving rankings:', err);
            showToast('Failed to save rankings', 'error');
          });

        const levelName = level === 'C' ? selectedCountyName : 'National';
        if ((level === 'C' && ranking.kentCountyRanking) || (level === 'N' && ranking.nationalRanking)) {
          showToast(`${levelName} ranking loaded`, 'success');
        } else {
          showToast(`No ${levelName} ranking found`, 'error');
        }
      }
    } catch (error) {
      showToast(`Error loading ranking: ${(error as Error).message}`, 'error');
    } finally {
      setLoadingEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${eventKey}_${level}`);
        return newSet;
      });
    }
  };

  const isEventLoading = (eventKey: string, level: 'C' | 'N') => {
    return loadingEvents.has(`${eventKey}_${level}`);
  };

  const hasRanking = (eventKey: string, level: 'C' | 'N') => {
    const cached = rankings.get(eventKey);
    if (!cached) return false;
    return level === 'C' ? !!cached.kentCounty : !!cached.national;
  };

  return (
    <div>
      <div className="filter-section">
        <div>
          <label htmlFor="courseFilter">Course:</label>
          <select
            id="courseFilter"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value as 'all' | '25m' | '50m')}
            disabled={loading}
          >
            <option value="all">All Courses</option>
            <option value="25m">Short Course Only</option>
            <option value="50m">Long Course Only</option>
          </select>
        </div>
        <div>
          <label htmlFor="countySelect">County:</label>
          <select
            id="countySelect"
            value={countyCode}
            onChange={(e) => setCountyCode(e.target.value)}
            disabled={loading}
          >
            {COUNTIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        {canShowForecast && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="forecastMode"
              checked={forecastMode}
              onChange={(e) => setForecastMode(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="forecastMode" style={{ cursor: 'pointer', userSelect: 'none' }}>
              Forecast Next Year's 10-11 Championship
            </label>
          </div>
        )}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="empty-state">
          <p>No events match the current filters</p>
        </div>
      ) : (
        sortedCourses.map((course, courseIndex) => (
          <div key={course} style={{ marginTop: courseIndex > 0 ? '0.5rem' : '0' }}>
            {/* Course section header */}
            <div className="club-header" onClick={() => toggleCourse(course)}>
              <h3 className="club-header-title">
                <FontAwesomeIcon icon={faPersonSwimming} /> {course === '50m' ? 'Long Course (50m)' : 'Short Course (25m)'}
              </h3>
              <FontAwesomeIcon icon={faChevronDown} className={`chevron-icon${!collapsedCourses.has(course) ? 'expanded' : ''}`} />
            </div>
            {/* Events list for this course */}
            {!collapsedCourses.has(course) && <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>PB Time</th>
                    <th>{selectedCountyName}</th>
                    <th>National</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedByCourse[course].map((evt) => {
                    const cached = rankings.get(evt.key);

                    return (
                      <tr key={evt.key}>
                        <td data-label="Event">
                          <strong>
                            {evt.sourceUrl
                              ? <a href={evt.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{evt.event}</a>
                            :evt.event}
                          </strong>
                        </td>
                        <td data-label="PB Time">{evt.time}<br/><small style={{ color: 'var(--gray-400)' }}>{evt.date}</small></td>
                        <td data-label={selectedCountyName}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '2.5rem' }}>
                            <button
                              onClick={() => fetchRanking(evt.key, 'C')}
                              disabled={loading || isEventLoading(evt.key, 'C')}
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', flexShrink: 0, ...(hasRanking(evt.key, 'C') && { background: 'transparent', border: 'none' }) }}
                              title={hasRanking(evt.key, 'C') ? 'Click to refresh' : 'Fetch ranking'}
                            >
                              {isEventLoading(evt.key, 'C') ? <FontAwesomeIcon icon={faSpinner} spin /> : hasRanking(evt.key, 'C') ? <FontAwesomeIcon icon={faRotate} style={{ color: 'var(--success)' }} /> : 'Fetch'}
                            </button>
                            {cached?.kentCounty ? (
                              cached.kentCounty.entry ? (
                                <a href={buildRankingUrl(evt.event, evt.course, swimmerSex, swimmerAge, 'C', countyCode)} target="_blank" rel="noreferrer" style={{ flex: 1, color: 'inherit', textDecoration: 'none' }}>
                                  <div style={{ flex: 1 }}>
                                    <strong>{cached.kentCounty.entry.isTied ? '=' : ''}#{cached.kentCounty.entry.position}</strong> of {cached.kentCounty.total}
                                    {cached.kentCounty.entry.fina && <span> • <strong>{cached.kentCounty.entry.fina}</strong> pts</span>}
                                    {cached.kentCounty.ageGroup && (
                                      <span style={{
                                        marginLeft: '0.5rem',
                                        padding: '0.15rem 0.4rem',
                                        backgroundColor: 'var(--primary)',
                                        borderRadius: '3px',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        opacity: 0.8
                                      }}>
                                        Age: {cached.kentCounty.ageGroup}
                                      </span>
                                    )}
                                    <br/>
                                    <small style={{ color: 'var(--gray-400)' }}>
                                      {cached.kentCounty.entry.time} • {cached.kentCounty.entry.date}
                                    </small>
                                  </div>
                                </a>
                              ) : (
                                <span style={{ color: 'var(--gray-400)' }}>Not ranked</span>
                              )
                            ) : (
                              <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Click to fetch</span>
                            )}
                          </div>
                        </td>
                        <td data-label="National">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '2.5rem' }}>
                            <button
                              onClick={() => fetchRanking(evt.key, 'N')}
                              disabled={loading || isEventLoading(evt.key, 'N')}
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', flexShrink: 0, ...(hasRanking(evt.key, 'N') && { background: 'transparent', border: 'none' }) }}
                              title={hasRanking(evt.key, 'N') ? 'Click to refresh' : 'Fetch ranking'}
                            >
                              {isEventLoading(evt.key, 'N') ? <FontAwesomeIcon icon={faSpinner} spin /> : hasRanking(evt.key, 'N') ? <FontAwesomeIcon icon={faRotate} style={{ color: 'var(--success)' }} /> : 'Fetch'}
                            </button>
                            {cached?.national ? (
                              cached.national.entry ? (
                                <a href={buildRankingUrl(evt.event, evt.course, swimmerSex, swimmerAge, 'N', countyCode)} target="_blank" rel="noreferrer" style={{ flex: 1, color: 'inherit', textDecoration: 'none' }}>
                                  <div style={{ flex: 1 }}>
                                    <strong>{cached.national.entry.isTied ? '=' : ''}#{cached.national.entry.position}</strong> of {cached.national.total}
                                    {cached.national.entry.fina && <span> • <strong>{cached.national.entry.fina}</strong> pts</span>}
                                    {cached.national.ageGroup && (
                                      <span style={{
                                        marginLeft: '0.5rem',
                                        padding: '0.15rem 0.4rem',
                                        backgroundColor: 'var(--primary)',
                                        borderRadius: '3px',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        opacity: 0.8
                                      }}>
                                        Age: {cached.national.ageGroup}
                                      </span>
                                    )}
                                    <br/>
                                    <small style={{ color: 'var(--gray-400)' }}>
                                      {cached.national.entry.time} • {cached.national.entry.date}
                                    </small>
                                  </div>
                                </a>                                
                              ) : (
                                <span style={{ color: 'var(--gray-400)' }}>Not ranked</span>
                              )
                            ) : (
                              <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Click to fetch</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}
          </div>
        ))
      )}

      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--card-bg)', borderRadius: '4px' }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--gray-400)', margin: 0 }}>
          <strong>Note:</strong> Click "Fetch" for each event to fetch either County or National rankings.
          Rankings are based on the last 12 months of performances.
          County rankings are limited to swimmers from the selected county, while National rankings include all swimmers in the UK.
        </p>
      </div>
    </div>
  );
};

export default Rankings;
