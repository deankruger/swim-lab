export const STROKE_ORDER = [
  'Freestyle',
  'Breaststroke',
  'Butterfly',
  'Backstroke',
  'Individual Medley',
];

const normalizeStroke = (stroke: string): string => stroke.trim().replace(/\s+/g, ' ');

export const parseEventName = (event: string): { distance: number; stroke: string } => {
  const match = event.match(/^\s*(\d+)\s*(.+)$/);
  if (match) {
    return {
      distance: parseInt(match[1], 10),
      stroke: normalizeStroke(match[2]),
    };
  }

  return {
    distance: Number.POSITIVE_INFINITY,
    stroke: normalizeStroke(event),
  };
};

export const getStrokePriority = (stroke: string): number => {
  const normalized = normalizeStroke(stroke).toLowerCase();
  const index = STROKE_ORDER.findIndex(order => order.toLowerCase() === normalized);
  return index !== -1 ? index : STROKE_ORDER.length;
};

export const compareEvents = (aEvent: string, bEvent: string): number => {
  const a = parseEventName(aEvent);
  const b = parseEventName(bEvent);

  const aStrokePriority = getStrokePriority(a.stroke);
  const bStrokePriority = getStrokePriority(b.stroke);

  if (aStrokePriority !== bStrokePriority) {
    return aStrokePriority - bStrokePriority;
  }

  if (a.distance !== b.distance) {
    return a.distance - b.distance;
  }

  return a.stroke.localeCompare(b.stroke);
};

export const sortStrokeValues = (strokes: string[]): string[] => {
  return [...strokes].sort((a, b) => {
    const aPriority = getStrokePriority(a);
    const bPriority = getStrokePriority(b);
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.localeCompare(b);
  });
};

export const sortDistances = (distances: string[]): string[] => {
  return [...distances].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
};
