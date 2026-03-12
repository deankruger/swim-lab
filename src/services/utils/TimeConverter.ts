export class TimeConverter {

    parseTimeToSeconds(timeStr: string): number {
        if (!timeStr || typeof timeStr !== 'string') {            
            return Infinity;
        }

        const parts = timeStr.split(':');
        let seconds = 0;
        if (parts.length === 2) {
            //Format MM:SS.SS
            seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
        }
        else if (parts.length === 1) {
            //Format SS.SS
            seconds = parseFloat(parts[0]);
        }

        return seconds;
    }

    formatSecondsToTime(seconds: number): string {
        if (!isFinite(seconds)){
            return '';            
        }
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(2);

        if (mins > 0){
            return `${mins}:${secs.padStart(5, '0')}`;
        }

        return secs;
    }

    compareSwimTimes(time1: string, time2: string): number {
        const seconds1 = this.parseTimeToSeconds(time1);
        const seconds2 = this.parseTimeToSeconds(time2);

        if (seconds1 < seconds2) return -1;
        if (seconds1 > seconds2) return 1        
        return 0;
    }

    excelTimeToString(excelTime: number): string {        
        const totalSeconds = excelTime * 864000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes > 0){
            return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
        }

        return seconds.toFixed(2);
    }
}