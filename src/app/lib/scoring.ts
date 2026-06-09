// Production Level labels (no tier numbers for Ops)
export const TIER_LABELS: Record<number, string> = {
  1: "Raw · Shaky cam, no structure",
  2: "Emerging · Improving, uneven quality",
  3: "Practiced · Reliable, brand-safe",
  4: "Fluent · Strong alignment, minor style gaps",
  5: "Studio · Top performer, premium quality content",
};

export const TIER_SHORT: Record<number, string> = {
  1: "Raw",
  2: "Emerging",
  3: "Practiced",
  4: "Fluent",
  5: "Studio",
};

// Content Match labels (with "Brief match:" prefix for Ops)
export const CONTENT_MATCH_LABELS: Record<number, string> = {
  1: "Brief match: Off entirely",
  2: "Brief match: Loosely related",
  3: "Brief match: On topic, average",
  4: "Brief match: Strong",
  5: "Brief match: Perfect",
};

export const CONTENT_MATCH_SHORT: Record<number, string> = {
  1: "Off brief",
  2: "Loose",
  3: "Average",
  4: "Strong",
  5: "Perfect",
};

// Audience Fit labels (with "Audience fit:" prefix for Ops)
export const AUDIENCE_FIT_LABELS: Record<number, string> = {
  1: "Audience fit: Wrong demographic",
  2: "Audience fit: Partial overlap",
  3: "Audience fit: Decent match",
  4: "Audience fit: Strong",
  5: "Audience fit: Ideal",
};

export const AUDIENCE_FIT_SHORT: Record<number, string> = {
  1: "Wrong",
  2: "Partial",
  3: "Decent",
  4: "Strong",
  5: "Ideal",
};

// Get full display label (no "Tier X" for Ops)
export function getTierLabel(tier: number): string {
  return TIER_LABELS[tier];
}

// NEG_TIERS formula - Calculate recommended range (legacy string version)
export function calculateRecommendedRange(ask: number): string {
  let minPercent: number;
  let maxPercent: number;

  if (ask <= 500) {
    minPercent = 60;
    maxPercent = 80;
  } else if (ask <= 800) {
    minPercent = 50;
    maxPercent = 60;
  } else if (ask <= 1500) {
    minPercent = 40;
    maxPercent = 60;
  } else if (ask <= 3000) {
    minPercent = 40;
    maxPercent = 50;
  } else if (ask <= 7000) {
    minPercent = 30;
    maxPercent = 50;
  } else {
    minPercent = 25;
    maxPercent = 40;
  }

  const min = Math.round((ask * minPercent) / 100 / 50) * 50;
  const max = Math.round((ask * maxPercent) / 100 / 50) * 50;

  return `$${min}–$${max}`;
}

export function parseFollowers(raw: string): number {
  if (!raw) return 0;
  const s = raw.trim().toUpperCase().replace(/,/g, "");
  if (s.endsWith("M")) return Math.round(parseFloat(s) * 1_000_000);
  if (s.endsWith("K")) return Math.round(parseFloat(s) * 1_000);
  return parseInt(s) || 0;
}

export function getTier(followers: number): { tier: string; floor: number } {
  if (followers >= 500_000) return { tier: "Mega", floor: 10000 };
  if (followers >= 100_000) return { tier: "Mid-Tier", floor: 2500 };
  if (followers >= 10_000) return { tier: "Micro", floor: 500 };
  return { tier: "Nano", floor: 100 };
}

export function getRecommendedRange(
  ask: number,
  followers: number
): { low: number; high: number; tier: string; floor: number; belowFloor: boolean } | null {
  if (!ask || ask <= 0) return null;

  let minPercent: number;
  let maxPercent: number;

  if (ask <= 500) {
    minPercent = 60; maxPercent = 80;
  } else if (ask <= 800) {
    minPercent = 50; maxPercent = 60;
  } else if (ask <= 1500) {
    minPercent = 40; maxPercent = 60;
  } else if (ask <= 3000) {
    minPercent = 40; maxPercent = 50;
  } else if (ask <= 7000) {
    minPercent = 30; maxPercent = 50;
  } else {
    minPercent = 25; maxPercent = 40;
  }

  let low = Math.round((ask * minPercent) / 100 / 50) * 50;
  let high = Math.round((ask * maxPercent) / 100 / 50) * 50;

  const { tier, floor } = getTier(followers);
  const belowFloor = ask < floor;
  low = Math.max(low, floor);

  high = Math.max(low, high);
  low = Math.round(low / 50) * 50;
  high = Math.round(high / 50) * 50;

  return { low, high, tier, floor, belowFloor };
}

export type PipelineBucket = 'new' | 'scoring' | 'negotiating' | 'finalBidSet' | 'silent';

export function getPipelineBucket(creator: any): PipelineBucket {
  const ask = Number(creator.theirAsk) || 0;
  const finalBid = Number(creator.finalBidAmount) || 0;
  const status = creator.status;

  if (status === 'Negotiating') return 'negotiating';
  if (finalBid > 0) return 'finalBidSet';
  if (ask > 0) return 'scoring';
  return 'new';
}
