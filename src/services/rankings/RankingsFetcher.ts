import { HttpClient } from '../http/HttpClient';
import { RankingsParser } from '../parsers/RankingsParser';
import { SwimmerData, SwimmerRankings, EventRanking, RankingEntry } from '../../types';

/**
 * StrokeMapper - Maps event names to stroke IDs for rankings API
 */
class StrokeMapper {
  private strokeMap: { [key: string]: number } = {
    '50 Freestyle': 1,
    '100 Freestyle': 2,
    '200 Freestyle': 3,
    '400 Freestyle': 4,
    '800 Freestyle': 5,
    '1500 Freestyle': 6,
    '50 Breaststroke': 7,
    '100 Breaststroke': 8,
    '200 Breaststroke': 9,
    '50 Butterfly': 10,
    '100 Butterfly': 11,
    '200 Butterfly': 12,
    '50 Backstroke': 13,
    '100 Backstroke': 14,
    '200 Backstroke': 15,
    '200 Individual Medley': 16,
    '400 Individual Medley': 17,
    '100 Individual Medley': 18,
    '150 Individual Medley': 19
  };

  getStrokeId(event: string): number | undefined {
    return this.strokeMap[event];
  }
}

/**
 * GenderNormalizer - Normalizes gender strings to M/F
 */
class GenderNormalizer {
  normalize(gender: string): 'M' | 'F' {
    const genderUpper = gender.toUpperCase();
    const isMale = genderUpper.includes('MALE') && !genderUpper.includes('FEMALE') ||
                   genderUpper.includes('M') && !genderUpper.includes('F');
    return isMale ? 'M' : 'F';
  }
}

/**
 * RankingsFetcher - Single Responsibility: Fetch rankings from API
 * Fetches and parses swimmer rankings from swimmingresults.org
 */
export class RankingsFetcher {
  private baseUrl = 'https://www.swimmingresults.org';
  private strokeMapper = new StrokeMapper();
  private genderNormalizer = new GenderNormalizer();

  constructor(
    private httpClient: HttpClient,
    private rankingsParser: RankingsParser
  ) {}

  /**
   * Get swimmer rankings for a county and/or National levels
   * @param swimmerData Swimmer data
   * @param level Optional level filter: 'C' for County, 'N' for National
   * @param forecast If true, shows next year's forecast for 10-11 championship (current 9 & 10 year olds)
   * @param countyCode The county code to use for county rankings (e.g. 'KNTQ' for Kent). Defaults to 'KNTQ'.
   * @returns Swimmer rankings
   */
  async getSwimmerRankings(swimmerData: SwimmerData, level?: 'C' | 'N', forecast?: boolean, countyCode: string = 'KNTQ'): Promise<SwimmerRankings> {
    if (!swimmerData.birthYear || !swimmerData.gender) {
      console.warn('Cannot fetch rankings: missing birth year or gender');
      return {
        swimmerName: swimmerData.name,
        tiref: swimmerData.tiref,
        rankings: []
      };
    }

    const currentYear = new Date().getFullYear();
    const ageAtEndOfYear = currentYear - parseInt(swimmerData.birthYear);
    const sex = this.genderNormalizer.normalize(swimmerData.gender);

    console.log(`Gender detection: "${swimmerData.gender}" -> "${sex}"`);

    const uniqueEvents = this.getUniqueEvents(swimmerData);
    const levelDesc = this.getLevelDescription(level, countyCode);
    const forecastDesc = forecast ? ' (FORECAST NEXT YEAR)' : '';
    console.log(`Fetching ${levelDesc} rankings for ${swimmerData.name} (Age: ${ageAtEndOfYear}, Gender: ${sex})${forecastDesc}`);

    const rankings = await this.fetchAllRankings(
      swimmerData,
      uniqueEvents,
      ageAtEndOfYear,
      sex,
      level,
      forecast,
      countyCode
    );

    return {
      swimmerName: swimmerData.name,
      tiref: swimmerData.tiref,
      rankings
    };
  }

  /**
   * Get unique events from swimmer data
   */
  private getUniqueEvents(swimmerData: SwimmerData): Set<string> {
    const uniqueEvents = new Set<string>();
    swimmerData.times.forEach(time => uniqueEvents.add(time.event));
    return uniqueEvents;
  }

  /**
   * Get description for level
   */
  private getLevelDescription(level?: 'C' | 'N', countyCode: string = 'KNTQ'): string {
    const countyNames: Record<string, string> = {
      KNTQ: 'Kent County', HRTT: 'Hertfordshire', HNTS: 'Hampshire', MDXL: 'Middlesex', SRYQ: 'Surrey'
    };
    const countyName = countyNames[countyCode] || countyCode;
    if (level === 'C') return countyName;
    if (level === 'N') return 'National';
    return `${countyName} and National`;
  }

  /**
   * Fetch rankings for all events
   */
  private async fetchAllRankings(
    swimmerData: SwimmerData,
    uniqueEvents: Set<string>,
    ageAtEndOfYear: number,
    sex: 'M' | 'F',
    level?: 'C' | 'N',
    forecast?: boolean,
    countyCode: string = 'KNTQ'
  ): Promise<EventRanking[]> {
    const rankings: EventRanking[] = [];

    for (const event of uniqueEvents) {
      const strokeId = this.strokeMapper.getStrokeId(event);

      if (!strokeId) {
        console.log(`No stroke ID mapping found for event: ${event}`);
        continue;
      }

      const eventTimes = swimmerData.times.filter(t => t.event === event);

      for (const swimTime of eventTimes) {
        try {
          const ranking = await this.fetchRankingForEvent(
            swimTime,
            strokeId,
            sex,
            ageAtEndOfYear,
            level,
            swimmerData.name,
            swimmerData.club,
            forecast,
            countyCode
          );

          rankings.push(ranking);
        } catch (error) {
          console.error(`Error fetching rankings for ${event} (${swimTime.course}):`, error);
        }
      }
    }

    return rankings;
  }

  /**
   * Fetch ranking for a single event
   */
  private async fetchRankingForEvent(
    swimTime: { event: string; course: '25m' | '50m' },
    strokeId: number,
    sex: 'M' | 'F',
    ageGroup: number,
    level: 'C' | 'N' | undefined,
    swimmerName: string,
    swimmerClub: string,
    forecast?: boolean,
    countyCode: string = 'KNTQ'
  ): Promise<EventRanking> {
    const pool = swimTime.course === '50m' ? 'L' : 'S';

    let kentRanking: { entry: RankingEntry | null; total: number } | null = null;
    let nationalRanking: { entry: RankingEntry | null; total: number } | null = null;

    // Track age groups used
    let kentCountyAgeGroup: string | undefined;
    let nationalAgeGroup: string | undefined;

    // Fetch Kent County if requested
    if (!level || level === 'C') {
      // Determine if combined ranking should be used based on age and forecast mode
      const shouldUseCombined = forecast
        ? (ageGroup === 9 || ageGroup === 10)  // Forecast: current 9&10 will be 10&11 next year
        : (ageGroup === 10 || ageGroup === 11); // Current: ages 10&11 compete together

      if (shouldUseCombined) {
        const modeDesc = forecast ? 'forecast (next year\'s 10-11)' : 'current (10-11)';
        console.log(`Fetching combined ranking for ${modeDesc} County Championships (age ${ageGroup})`);
        kentRanking = await this.fetchCombinedRanking(
          pool,
          strokeId,
          sex,
          swimmerName,
          swimmerClub,
          forecast || false,
          countyCode
        );
        kentCountyAgeGroup = forecast ? '9-10 → 10-11' : '10-11';
      } else {
        console.log(`Fetching single age ranking for age ${ageGroup} for County Championships`);
        kentRanking = await this.fetchSingleRanking(
          pool,
          strokeId,
          sex,
          ageGroup,
          'C',
          swimmerName,
          swimmerClub,
          countyCode
        );
        kentCountyAgeGroup = ageGroup.toString();
      }
    }

    // Fetch National if requested
    if (!level || level === 'N') {
      nationalRanking = await this.fetchSingleRanking(
        pool,
        strokeId,
        sex,
        ageGroup,
        'N',
        swimmerName,
        swimmerClub
      );
      nationalAgeGroup = ageGroup.toString();
    }

    return {
      event: swimTime.event,
      course: swimTime.course,
      kentCountyRanking: kentRanking?.entry || null,
      nationalRanking: nationalRanking?.entry || null,
      totalKentCounty: kentRanking?.total || 0,
      totalNational: nationalRanking?.total || 0,
      kentCountyAgeGroup,
      nationalAgeGroup
    };
  }

  /**
   * Fetch a single ranking from the API
   */
  private async fetchSingleRanking(
    pool: 'L' | 'S',
    strokeId: number,
    sex: string,
    ageGroup: number,
    level: 'C' | 'N',
    swimmerName: string,
    swimmerClub: string,
    countyCode: string = 'KNTQ'
  ): Promise<{ entry: RankingEntry | null; total: number }> {
    try {
      const url = this.buildRankingUrl(pool, strokeId, sex, ageGroup, level, countyCode);
      console.log(`Fetching ranking from: ${url}`);

      const html = await this.httpClient.get(url);
      return this.rankingsParser.parse(html, swimmerName, swimmerClub);
    } catch (error) {
      console.error('Error fetching ranking:', error);
      return { entry: null, total: 0 };
    }
  }

  /**
   * Build ranking URL with appropriate parameters
   */
  private buildRankingUrl(
    pool: 'L' | 'S',
    strokeId: number,
    sex: string,
    ageGroup: number,
    level: 'C' | 'N',
    countyCode: string = 'KNTQ'
  ): string {
    const date = new Date();
    const dateStr = `31/12/${date.getFullYear()}`;

    let url = `${this.baseUrl}/12months/last12.php?Pool=${pool}&Stroke=${strokeId}&Sex=${sex}&AgeGroup=${ageGroup}&date=${encodeURIComponent(dateStr)}&StartNumber=1&RecordsToView=100`;

    if (level === 'C') {
      // County parameters
      url += `&TargetNationality=P&TargetRegion=P&Level=C&TargetCounty=${countyCode}&TargetClub=XXXX`;
    } else {
      // National parameters
      url += '&Level=N&TargetNationality=X&TargetRegion=P&TargetCounty=XXXX&TargetClub=XXXX';
    }

    return url;
  }

  /**
   * Fetch combined ranking for ages 10 and 11 (County Championships)
   * In County Championships, ages 10 and 11 compete together
   * @param forecast Whether this is a forecast ranking (default false)
   *   - If false: combines ages 10 and 11 (current year championship)
   *   - If true: combines ages 9 and 10 (forecast for next year's 10-11 championship)
   */
  private async fetchCombinedRanking(
    pool: 'L' | 'S',
    strokeId: number,
    sex: string,
    swimmerName: string,
    swimmerClub: string,
    forecast?: boolean,
    countyCode: string = 'KNTQ'
  ): Promise<{ entry: RankingEntry | null; total: number }> {
    try {
      // Determine the two age groups to combine
      // For forecast: combine ages 9 and 10 (who will be 10-11 next year)
      // For current: combine ages 10 and 11 (who compete together this year)
      const [age1, age2] = forecast ? [9, 10] : [10, 11];
      const modeDesc = forecast ? 'forecast (next year)' : 'current year';
      console.log(`Fetching combined ${age1}-${age2} age group ranking for County Championships (${modeDesc})`);

      // Fetch both age groups
      const url1 = this.buildRankingUrl(pool, strokeId, sex, age1, 'C', countyCode);
      const url2 = this.buildRankingUrl(pool, strokeId, sex, age2, 'C', countyCode);

      console.log(`Fetching age ${age1}: ${url1}`);
      console.log(`Fetching age ${age2}: ${url2}`);

      const [html1, html2] = await Promise.all([
        this.httpClient.get(url1),
        this.httpClient.get(url2)
      ]);

      // Parse all entries from both age groups
      const entries1 = this.rankingsParser.parseAll(html1);
      const entries2 = this.rankingsParser.parseAll(html2);

      console.log(`Found ${entries1.length} entries for age ${age1}, ${entries2.length} entries for age ${age2}`);

      // Combine all entries
      const allEntries = [...entries1, ...entries2];

      // Sort by time (fastest first)
      allEntries.sort((a, b) => {
        const timeA = this.parseTimeToSeconds(a.time);
        const timeB = this.parseTimeToSeconds(b.time);
        return timeA - timeB;
      });

      // Recalculate positions based on combined ranking
      allEntries.forEach((entry, index) => {
        entry.position = index + 1;
      });

      // Find swimmer in combined ranking
      let swimmerEntry: RankingEntry | null = null;
      const nameMatches = allEntries.filter(entry => this.isMatchingName(entry.name, swimmerName));

      if (nameMatches.length === 1) {
        swimmerEntry = nameMatches[0];
        swimmerEntry.isSwimmer = true;
        console.log(`Matched swimmer in combined ${age1}-${age2} ranking: Position #${swimmerEntry.position} of ${allEntries.length}`);
      } else if (nameMatches.length > 1) {
        const clubMatches = nameMatches.filter(entry => this.isMatchingClub(entry.club, swimmerClub));
        if (clubMatches.length > 0) {
          swimmerEntry = clubMatches[0];
          swimmerEntry.isSwimmer = true;
          console.log(`Matched swimmer in combined ${age1}-${age2} ranking (by club): Position #${swimmerEntry.position} of ${allEntries.length}`);
        } else {
          swimmerEntry = nameMatches[0];
          swimmerEntry.isSwimmer = true;
          console.log(`Matched swimmer in combined ${age1}-${age2} ranking (no club match): Position #${swimmerEntry.position} of ${allEntries.length}`);
        }
      }

      return {
        entry: swimmerEntry,
        total: allEntries.length
      };
    } catch (error) {
      console.error('Error fetching combined ranking:', error);
      return { entry: null, total: 0 };
    }
  }

  /**
   * Parse swim time string to seconds for comparison
   * Formats: "1:23.45", "23.45", "12:34.56"
   */
  private parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':');

    if (parts.length === 1) {
      // Format: "23.45" (seconds only)
      return parseFloat(parts[0]);
    } else if (parts.length === 2) {
      // Format: "1:23.45" (minutes:seconds)
      const minutes = parseInt(parts[0]);
      const seconds = parseFloat(parts[1]);
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // Format: "1:12:34.56" (hours:minutes:seconds) - rare but possible
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parseFloat(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    }

    return Infinity; // Invalid format, sort to end
  }

  /**
   * Check if name matches the swimmer
   */
  private isMatchingName(name: string, swimmerName: string): boolean {
    return name.toLowerCase().includes(swimmerName.toLowerCase()) ||
           swimmerName.toLowerCase().includes(name.toLowerCase());
  }

  /**
   * Check if club matches the swimmer's club
   */
  private isMatchingClub(club: string, swimmerClub: string): boolean {
    return swimmerClub.toLowerCase().startsWith(club.toLowerCase());
  }
}
