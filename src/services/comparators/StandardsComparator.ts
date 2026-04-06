import { SwimmerData, SwimTime, CountyTimes, ComparisonResult, TimeComparison } from '../../types'
import { TimeConverter } from "../utils/TimeConverter";
import { compareEvents } from '../utils/EventOrdering';

export class StandardsComparator{
    constructor(private timeConverter: TimeConverter){}

    compareWithStandards(swimmerData: SwimmerData, standards: CountyTimes): ComparisonResult{
        const eventTimesMap = this.groupTimesByEvent(swimmerData.times);
        const comparisons = this.generateComparisons(eventTimesMap, standards);

        return {
            swimmerName: swimmerData.name,
            tiref: swimmerData.tiref,
            comparisons
        };
    }


    private groupTimesByEvent(times: SwimTime[]): Map<string, {lc?: SwimTime; sc?: SwimTime}>{
        const evntTimesMap = new Map<string, {lc?: SwimTime, sc?: SwimTime}>();

        times.forEach(swimTime => {
            const event = swimTime.event;

            if (!evntTimesMap.has(event)) {
                evntTimesMap.set(event, {});
            }

            const eventTimes = evntTimesMap.get(event)!;
            if (swimTime.course === '50m') {
                eventTimes.lc = swimTime;
            } else if (swimTime.course === '25m') {
                eventTimes.sc = swimTime;
            }
        })

        return evntTimesMap;
    }

    private generateComparisons(eventTimesMap: Map<string, {lc?: SwimTime; sc?: SwimTime}>, standards: CountyTimes): TimeComparison[]{
        const comparisons: TimeComparison[] = [];
        const sortedEvents = Array.from(eventTimesMap.keys()).sort(compareEvents);
        sortedEvents.forEach(event => {
            const eventTimes = eventTimesMap.get(event)!;
            const key = `${event}_50m`;
     
            if (standards[key]) {
                const comparison = this.compareEventWithStandard(event, eventTimes, standards[key]);
                if (comparison){
                    comparisons.push(comparison);
                }
            }
        });

        return comparisons;
    }
    
    private compareEventWithStandard(
        event: string,
        eventTimes: {lc?: SwimTime; sc?: SwimTime}, 
        countyEntry: { time: string; ageCategory: string; considerationTime?: string }
    ): TimeComparison | null{
        const possibleTimes = this.collectPossibleTimes(eventTimes);

        if (possibleTimes.length === 0) {
            return this.createUnavailableComparison(event, eventTimes, countyEntry);
        }

        const fastestOption = this.findFastestTime(possibleTimes);
        return this.createComparison(event, fastestOption, countyEntry);
    }
    
    private collectPossibleTimes(eventTimes: {lc?: SwimTime; sc?: SwimTime}) 
        : Array<{time: string; label: string; date: string; venue: string}>
    {
        const possibleTimes : Array<{time: string; label: string; date: string; venue: string}> = [];
        
        if (eventTimes.lc) {
            possibleTimes.push({
                time: eventTimes.lc.time,
                label: '50m',
                date: eventTimes.lc.date,
                venue: eventTimes.lc.venue
            });
        }

        if (eventTimes.sc && eventTimes.sc.convertedToLC) {
            possibleTimes.push({
                time: eventTimes.sc.convertedToLC,
                label: '25→50m',
                date: eventTimes.sc.date,
                venue: eventTimes.sc.venue
            });
        }

        return possibleTimes;
    }

    private findFastestTime(possibleTimes: Array<{time: string; label: string; date: string; venue: string}>){
        let fastestOption = possibleTimes[0];
        let fastestSeconds = this.timeConverter.parseTimeToSeconds(fastestOption.time);

        for (let i = 1; i < possibleTimes.length; i++){
            const currentSeconds = this.timeConverter.parseTimeToSeconds(possibleTimes[i].time);
            if(currentSeconds < fastestSeconds){
                fastestOption = possibleTimes[i];
                fastestSeconds = currentSeconds;
            }
        }

        return fastestOption;
    }

    private createUnavailableComparison(
        event:string, 
        eventTimes:{ lc?:SwimTime; sc?: SwimTime},
        countyEntry: {time: string, ageCategory: string; considerationTime? : string}
    ): TimeComparison | null {
        const swimTime = eventTimes.lc || eventTimes.sc;
        if (!swimTime)
            return null;

        return {
            event,
            course: '50m',
            swimmerTime: `${swimTime.time} (${swimTime.course}, no conversion)`,
            standardTime:countyEntry.time,
            considerationTime: countyEntry.considerationTime,
            meetsConsideration: undefined,
            difference:'N/A',
            isFaster: null,
            percentDiff: 'N/A',
            ageCategory: countyEntry.ageCategory,
            date: swimTime.date,
            venue: swimTime.venue,
        };
    }

    
    private createComparison(
        event:string, 
        fastestOption: {time: string; label: string; date: string; venue: string},
        countyEntry: {time: string, ageCategory: string; considerationTime? : string}
    ): TimeComparison {
        const fastestSeconds = this.timeConverter.parseTimeToSeconds(fastestOption.time);
        const standardSeconds = this.timeConverter.parseTimeToSeconds(countyEntry.time);
        const difference = fastestSeconds - standardSeconds;
        const percentDiff = ((difference/standardSeconds) * 100).toFixed(2);

        const meetsConsideration = countyEntry.considerationTime != null
            ? fastestSeconds <= this.timeConverter.parseTimeToSeconds(countyEntry.considerationTime!)
            : undefined;
        
            return {
                event,
                course: fastestOption.label,
                swimmerTime: fastestOption.time,
                standardTime: countyEntry.time,
                considerationTime: countyEntry.considerationTime,
                meetsConsideration,
                difference: this.timeConverter.formatSecondsToTime(Math.abs(difference)),
                isFaster: difference < 0,
                percentDiff,        
                ageCategory: countyEntry.ageCategory,
                date: fastestOption.date,
                venue: fastestOption.venue,
            };
    }

}