export interface SwimmerSearchResult{
    name: string;
    tiref: string;
    club: string;
    birthYear:string;
    gender: string;
    knownName: string;
}

export interface SwimTime{
    event: string;
    course: '25m' | '50m';
    time: string;
    convertedToSC?: string; //Converted to Short Course (25m)
    convertedToLC?: string; //Converted to Long Course (50m)
    date: string;
    venue: string;
}

export interface SwimmerData{
    tiref: string;
    name: string;
    club: string;
    region: string;
    birthYear?: string
    gender?: string;
    times: SwimTime[];    
    tags?: string[]; // Optional tags for categorization
    preferredCounty?: string; // Optional preferred county for filtering purposes
    selectedCountyCode?: string; // Optional selected county code for filtering purposes
    rankings?: Record<string, {
        kentCounty?: {entry: RankingEntry | null; total: number; ageGroup?: string};
        national?: {entry: RankingEntry | null; total: number; ageGroup?: string};
    }>;
    forecastRankings?: Record<string, {
        kentCounty?: {entry: RankingEntry | null; total: number; ageGroup?: string};
        national?: {entry: RankingEntry | null; total: number; ageGroup?: string};
    }>;
}

export interface CountyTimeEntry{
    time: string;
    considerationTime?: string;
    ageFrom: number;
    ageTo: number;
    ageCategory: string; //Display formt like "10-11" or "12"
}

export interface CountyTimes{
    [key: string]: CountyTimeEntry; // Format 'Even_Course_Gender_Age': CountyTimeEntry
}

export type CountyTimesStore = Record<string, CountyTimes>;

export type KentTimeEntry = CountyTimeEntry;
export type KentTimes = CountyTimes;

export interface TimeComparison{
    event: string;
    course: string;
    swimmerTime: string;
    standardTime: string;
    considerationTime?: string;
    meetsConsideration?: boolean;
    difference: string; // Time difference between swimmer's time and standard time
    isFaster: boolean | null;
    percentDiff: string;
    date: string;
    venue: string;
    ageCategory?: string;
}

export interface ComparisonResult{
    swimmerName: string;
    tiref:string
    comparisons: TimeComparison[];
}

export interface ConvertedTime{
    to25m: string;
    to50m: string;
}

export interface RankingEntry{
    position: number;
    name: string;
    club: string;
    time: string;
    date: string;
    venue: string;
    fina: string;
    isSwimmer: boolean; //Highlights if this ist the current swimmer
    isTied: boolean; //Indicates if this entry is tied with one or more swimmers
}

export interface EventRanking{
    event: string;
    course: '25m' | '50m';
    kentCountyRanking: RankingEntry | null;
    nationalRanking: RankingEntry | null;
    totalKentCounty: number;
    totalNational: number;
    kentCountyAgeGroup?: string;
    nationalAgeGroup?: string;
}

export interface SwimmerRankings{
    swimmerName: string;
    tiref: string;
    rankings: EventRanking[];
}
