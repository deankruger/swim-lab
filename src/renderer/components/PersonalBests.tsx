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

    return (
        <div className="tab-content active">
            <div className="filter-section">
                <div>
                    <label>Stroke:</label>
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
                <div>
                    <label>Distance:</label>
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
            </div>
            {filteredTimes.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '2rem' }}><p>No times match the current filter</p></div>
            ) : (
                sortedCourses.map((course, courseIndex) => (
                    <div key={course} style={{ marginTop: courseIndex > 0 ?'0.5rem' : '0' }}>
                        {/* Course section header */}
                        <div className="club-header" onClick={() => toggleCourse(course)}>
                            <h3 className="club-header-title">
                                <FontAwesomeIcon icon={faPersonSwimming} /> {course === '50m' ? 'Long Course (50m)' : 'Short Course (25m)'}
                            </h3>
                            <FontAwesomeIcon icon={faChevronDown} className={`chevron-icon${!collapsedCourses.has(course) ? ' expanded' : ''}`} />
                        </div>
                        
                        {/* Separate table for this course */}
                        {!collapsedCourses.has(course) && <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: '210px' }}>Event</th>
                                        <th>Course</th>
                                        <th>Time</th>
                                        <th>{course === '50m' ? 'Conv. to SC' : 'Conv. to LC'}</th>
                                        <th>Date</th>
                                        <th>Venue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedByCourse[course].map((time, index) => (
                                        <tr key={`${course}-${index}`}>                                            
                                            <td data-label="Event">
                                                {time.sourceUrl
                                                    ? <a href={time.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{time.event}</a>
                                                    : time.event}
                                            </td>
                                            <td data-label="Course">{time.course}</td>
                                            <td data-label="Time">{time.time}</td>
                                            <td data-label={course === '50m' ? 'Conv. SC' : 'Conv. LC'}>
                                                {course === '50m' ? time.convertedToSC || '-' : time.convertedToLC || '-'}
                                            </td>
                                            <td data-label="Date">{time.date}</td>
                                            <td data-label="Venue">{time.venue}</td>
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
