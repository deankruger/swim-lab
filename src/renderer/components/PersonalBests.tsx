import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPersonSwimming, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { SwimTime } from "../../types";
import { compareEvents, sortStrokeValues, sortDistances } from "../../services/utils/EventOrdering";

interface PersonalBestsProps {
    times: SwimTime[];
}

const PersonalBests: React.FC<PersonalBestsProps> = ({ times }) => {
    const [courseFilter, setCourseFilter] = useState<'all' | '25m' | '50m'>('all');
    const [strokeFilter, setStrokeFilter] = useState<string>('all');
    const [distanceFilter, setDistanceFilter] = useState<string>('all');
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
        const strokeMatch = strokeFilter === 'all' || stroke === strokeFilter;
        const distanceMatch = distanceFilter === 'all' || distance === distanceFilter;

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
                    <label htmlFor='courseFilter'>Course:</label>
                    <select id='courseFilter' value={courseFilter} onChange={(e) => setCourseFilter(e.target.value as 'all' | '25m' | '50m')}>
                        <option value='all'>All Courses</option>
                        <option value='25m'>Short Course Only</option>
                        <option value='50m'>Long Course Only</option>
                    </select>
                </div>
                <div>
                    <label htmlFor='strokeFilter'>Stroke:</label>
                    <select id='strokeFilter' value={strokeFilter} onChange={(e) => setStrokeFilter(e.target.value)}>
                        <option value='all'>All Stroke</option>
                        {strokes.map(stroke => (
                            <option key={stroke} value={stroke}>{stroke}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor='distanceFilter'>Distance:</label>
                    <select id='distanceFilter' value={distanceFilter} onChange={(e) => setDistanceFilter(e.target.value)}>
                        <option value='all'>All Distances</option>
                        {distances.map(distance => (
                            <option key={distance} value={distance}>{distance}</option>
                        ))}
                    </select>
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
