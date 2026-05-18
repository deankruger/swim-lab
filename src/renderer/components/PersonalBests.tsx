import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPersonSwimming, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { SwimTime } from "../../types";
import { compareEvents, sortStrokeValues, sortDistances, getShortStrokeName } from "../../services/utils/EventOrdering";

interface PersonalBestsProps {
    times: SwimTime[];
    selectedStrokes?: string[];
    onSelectedStrokesChange?: (strokes: string[]) => void;
    selectedDistances?: string[];
    onSelectedDistancesChange?: (distances: string[]) => void;
}

const PersonalBests: React.FC<PersonalBestsProps> = ({ times, selectedStrokes = [], onSelectedStrokesChange, selectedDistances = [], onSelectedDistancesChange }) => {
    const [courseFilter, setCourseFilter] = useState<'all' | '25m' | '50m'>('all');
    const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());
    const [groupBy, setGroupBy] = useState<'course' | 'stroke'>('course');

    const toggleCourse = (course: string) => { 
        setCollapsedCourses(prev => { 
            const next = new Set(prev);
            if (next.has(course)) next.delete(course);
            else next.add(course);
            return next;
        });
    };
    
    if (times.length === 0) {
        return <div className="empty-state"><p>No times found</p></div>
    }

    const extractStrokeAndDistance = (event: string): { stroke: string; distance: string } => {
        const match = event.match(/^(\d+)\s*(.+)$/);
        if (match) {
            return { distance: match[1], stroke: match[2].trim() };
        }
        return { distance: '', stroke: event };
    };

    const strokes = sortStrokeValues(Array.from(new Set(times.map(t => extractStrokeAndDistance(t.event).stroke))));
    const distances = sortDistances(Array.from(new Set(times.map(t => extractStrokeAndDistance(t.event).distance).filter(d => d))));

    //Apply filters
    const filteredTimes = times.filter(time => {
        const { stroke, distance } = extractStrokeAndDistance(time.event);
        const courseMatch = courseFilter === 'all' || time.course === courseFilter;
        const strokeMatch = selectedStrokes.length === 0 || selectedStrokes.includes(stroke);
        const distanceMatch = selectedDistances.length === 0 || selectedDistances.includes(distance);

        return courseMatch && strokeMatch && distanceMatch;
    })

    const sortedTimes = [...filteredTimes].sort((a, b) => compareEvents(a.event, b.event));

    //Group times by course
    const groupedByCourse = sortedTimes.reduce((acc, time) => {
        const course = time.course;
        if (!acc[course]) {
            acc[course] = [];
        }
        acc[course].push(time)
        return acc;
    }, {} as Record<string, SwimTime[]>)

    const sortedCourses = Object.keys(groupedByCourse).sort((a, b) => {
        if (a === '50m') return -1;
        if (b === '50m') return 1;
        return a.localeCompare(b);
    });

    const groupedByStroke = sortedTimes.reduce((acc, time) => {
        const { stroke } = extractStrokeAndDistance(time.event);
        if (!acc[stroke]) acc[stroke] = [];
        acc[stroke].push(time);
        return acc;
    }, {} as Record<string, SwimTime[]>);

    const sortedStrokeGroups = sortStrokeValues(Object.keys(groupedByStroke));

    const activeGroups = groupBy === 'course' ? groupedByCourse : groupedByStroke;
    const activeGroupKeys = groupBy === 'course' ? sortedCourses : sortedStrokeGroups;

    return (
        <div className="tab-content active">
            <div className="filter-section">
                <div className="filter-chip-group">
                    <span className="filter-chip-label">Stroke</span>
                    <div className="filter-toggles">
                        {strokes.map(stroke => (
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
                <div className="filter-chip-group">
                    <span className="filter-chip-label">Dist</span>
                    <div className="filter-toggles">
                        {distances.map(distance => (
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
                <div className="filter-chip-group">
                    <div className="segmented-toggle">
                        <button className={groupBy === 'course' ? 'active' : ''} onClick={() => setGroupBy('course')}>By Course</button>
                        <button className={groupBy === 'stroke' ? 'active' : ''} onClick={() => setGroupBy('stroke')}>By Stroke</button>
                    </div>
                </div>
            </div>
            {filteredTimes.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '2rem' }}><p>No times match the current filter</p></div>
            ) : (
                activeGroupKeys.map((groupKey, courseIndex) => (
                    <div key={groupKey} className={`club-group${courseIndex > 0 ? ' club-group-spaced' : ''}`}>
                        <div className="club-header" onClick={() => toggleCourse(groupKey)}>
                            <h3 className="club-header-title">
                                <FontAwesomeIcon icon={faPersonSwimming} /> {groupBy === 'course' ? (groupKey === '50m' ? 'Long Course (50m)' : 'Short Course (25m)') : groupKey}
                            </h3>
                            <FontAwesomeIcon icon={faChevronDown} className={`chevron-icon${!collapsedCourses.has(groupKey) ? ' expanded' : ''}`} />
                        </div>

                        {!collapsedCourses.has(groupKey) && <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: '230px' }}>Event</th>
                                        <th>Time</th>
                                        <th>{groupBy === 'course' ? (groupKey === '50m' ? 'Conv. to SC' : 'Conv. to LC') : 'Conv.'}</th>
                                        <th>Date</th>
                                        <th>Venue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeGroups[groupKey].map((time, index) => (
                                        <tr key={`${groupKey}-${index}`}>
                                            <td data-label="Event" className="card-event-td">
                                                <div className="card-event-header">
                                                    <div>
                                                        {time.sourceUrl
                                                            ? <a href={time.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{time.event}</a>
                                                            : time.event}
                                                        &nbsp;<span className="swimmer-tag-badge">{time.course === '50m' ? 'LC' : 'SC'}</span>
                                                    </div>
                                                    <span className="mobile-supplement card-inline-time">{time.time}</span>
                                                </div>
                                                <div className="mobile-supplement card-meta-row">
                                                    {time.course === '50m' ? `SC: ${time.convertedToSC || '—'}` : `LC: ${time.convertedToLC || '—'}`}
                                                    {' · '}{time.date}{time.venue ? ` · ${time.venue}` : ''}
                                                </div>
                                            </td>
                                            <td data-label="Time" className="hide-on-mobile">{time.time}</td>
                                            <td data-label={time.course === '50m' ? 'Conv. SC' : 'Conv. LC'} className="hide-on-mobile">
                                                {time.course === '50m' ? time.convertedToSC || '-' : time.convertedToLC || '-'}
                                            </td>
                                            <td data-label="Date" className="hide-on-mobile">{time.date}</td>
                                            <td data-label="Venue" className="hide-on-mobile">{time.venue}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>}
                    </div>
                ))
            )}
        </div>
    );
};

export default PersonalBests;
