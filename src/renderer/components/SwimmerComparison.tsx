import React, { useState } from "react";
import { SwimmerData } from "../../types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPersonSwimming, faXmark } from "@fortawesome/free-solid-svg-icons";

interface SwimmerComparisonProps {
    swimmers: SwimmerData[];
    onClose: () => void;
}

const SwimmerComparison: React.FC<SwimmerComparisonProps> = ({swimmers, onClose}) => {
    const [courseFilter, setCourseFilter] = useState<'all' | '25m' | '50m'>('all')
    const [strokeFilter, setStrokeFilter] = useState<string>('all')
    const [distanceFilter, setDistanceFilter] = useState<string>('all')


    //Extract all unique events across all swimmers
    const extractStrokeAndDistance = (event: string) : {stroke: string, distance: string } => {
        const match = event.match(/^(\d+)\s*(.+)$/);
        if (match) {
            return { distance: match[1], stroke: match[2].trim() }
        }
        return {distance: '', stroke: event}
    }

    //Get all unique events
    const allEvents = new Set<string>();
    swimmers.forEach(swimmer => {
        swimmer.times.forEach(time => {
            const key = `${time.event}_${time.course}`;
            allEvents.add(key);
        });
    });

    //Get unique strokes and distances
    const allTimes = swimmers.flatMap(x => x.times);
    const strokes = Array.from(new Set(allTimes.map(t => extractStrokeAndDistance(t.event).stroke))).sort();
    const distances = Array.from(new Set(allTimes.map(t => extractStrokeAndDistance(t.event).distance).filter(d => d))).sort((a, b) => parseInt(a) - parseInt(b));

    //Filter events
    const filteredEvents = Array.from(allEvents).filter(eventKey => {
        const [event,course] = eventKey.split('_');
        const { stroke, distance } = extractStrokeAndDistance(event);

        const courseMatch = courseFilter === 'all' || course === courseFilter;
        const strokeMatch = strokeFilter === 'all' || stroke === strokeFilter;
        const distanceMatch = distanceFilter === 'all' || distance === distanceFilter;

        return courseMatch && strokeMatch && distanceMatch;
    }).sort();
    
    //Group events by course
    const  groupedByCourse = filteredEvents.reduce((acc, eventKey) => {
        const [event, course] = eventKey.split('_');
        if (!acc[course]) {
            acc[course] = [];
        }
        acc[course].push(eventKey);
        return acc;
    }, {} as Record<string, string[]>);

    const sortedCourses = Object.keys(groupedByCourse).sort((a, b) => {
        if (a === '50m') return -1;
        if (b === '50m') return 1;
        return a.localeCompare(b);
    });

    //Helper to find swimmer and event
    const getTimeForSwimmer = (swimmer: SwimmerData, eventKey: string) => {
        const [event, course] = eventKey.split('_');
        const time = swimmer.times.find(t => t.event === event && t.course === course);
        return time ? time.time : '-';
    };

    //Helper to parse time to seconds for comparison
    const parseTimeToSeconds = (timeStr: string) => {
        if (timeStr === '-' || !timeStr) return Infinity;
        const parts = timeStr.split(':');
        if (parts.length === 2){
            return parseInt(parts[0]) * 60 + parseFloat(parts[1])
        }
        return parseFloat(parts[0]);
    };

    //Helpter to determine fastest time
    const getFastestSwimmer = (eventKey: string): number => {
        let fastestIndex = -1;
        let fastestTime = Infinity;

        swimmers.forEach((swimmer, index) => {
            const timeStr = getTimeForSwimmer(swimmer, eventKey);
            const seconds = parseTimeToSeconds(timeStr);
            if (seconds < fastestTime){
                fastestTime = seconds;
                fastestIndex = index;
            }            
        });

        return fastestIndex;
    };

    return (
        <section className="comparison-section-card">            
            <div className="section-header">
                <h2>Swimmer Comparison ({swimmers.length} swimmers)</h2>
                <button onClick={onClose} className="btn-clear btn-ghost" style={{ color: 'var(--danger)' }}><FontAwesomeIcon icon={faXmark} />Close</button>
            </div>
            <div className="swimmer-comparison-names">
                {swimmers.map((swimmer, index) => (
                    <div key={swimmer.tiref} className="comparison-swimmer-tag" style={{ borderLeftColor: `hsl(${index * 120}, 70%,50%)` }}>
                        <strong>{swimmer.name}</strong>
                        <span>{swimmer.birthYear ? `Born ${swimmer.birthYear}` : ''} • {swimmer.gender || 'Unknown'}</span>
                    </div> 
                ))}
            </div>
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
                        <option value='all'>All Strokes</option>
                        {strokes.map(stroke => (
                            <option key={stroke} value={stroke}>{stroke}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor='distanceFilter'>Distance:</label>
                    <select id='distanceFilter' value={strokeFilter} onChange={(e) => setDistanceFilter(e.target.value)}>
                        <option value='all'>All Distances</option>
                        {distances.map(distance => (
                            <option key={distance} value={distance}>{distance}</option>
                        ))}
                    </select>
                </div>
            </div>
            {filteredEvents.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '2rem' }}><p>No events match the current filters</p></div>
            ) : (
                sortedCourses.map((course, courseIndex) => (
                    <div key={course}>
                        {/* Course Section Header */}
                        <h3 style={{
                            marginTop: courseIndex > 0 ? '2.5rem' : '1rem',
                            marginBottom: '0.75rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--primary-color)',
                            borderRadius: '4px',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            letterSpacing: '0.5px'
                        }}>
                            <FontAwesomeIcon icon={faPersonSwimming} /> {course === '50m' ? 'Long Course (50m)' : 'Short Course (25m)'}
                        </h3>

                        {/* Separate Table for this Course */}
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Event</th>
                                        <th className="hide-on-mobile">Course</th>
                                        {swimmers.map((swimmer, index) => (
                                            <th key={swimmer.tiref} style={{ color: `hsl(${index * 120}, 70%, 40%)` }}>
                                                {swimmer.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedByCourse[course].map(eventKey => {
                                        const [event] = eventKey.split('_');
                                        const fastestIndex = getFastestSwimmer(eventKey);
                                        
                                        return (
                                            <tr key={eventKey}>
                                                <td data-label="Event"><strong>{event}</strong></td>
                                                <td data-label="Course" className="hide-on-mobile">{course}</td>
                                                {swimmers.map((swimmer, index) => {
                                                    const time = getTimeForSwimmer(swimmer, eventKey);
                                                    const isFastest = index === fastestIndex && time !== '-';

                                                    return (
                                                        <td
                                                            key={swimmer.tiref}
                                                            data-label={swimmer.name}
                                                            style={{
                                                                fontWeight: isFastest ? 'bold' : 'normal',
                                                                backgroundColor: isFastest ? 'rgba(5,150,105,0.1)' : 'transparent',
                                                                color: time === '-' ? 'var(--gray-400)' : 'inherit'
                                                            }}
                                                        >
                                                            {time}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}
        </section>
    );
};

export default SwimmerComparison;