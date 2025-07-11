import { format, parse, isWithinInterval, isWeekend, getDay, addDays } from 'date-fns';
import type { MonitoringConfig, MonitoringRule } from './types';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function isDateMatchingRules(dateStr: string, config: MonitoringConfig): boolean {
  // Parse the date string
  let date: Date;
  try {
    // Try common date formats
    date = parse(dateStr, 'MM/dd/yyyy', new Date());
    if (isNaN(date.getTime())) {
      date = parse(dateStr, 'yyyy-MM-dd', new Date());
    }
    if (isNaN(date.getTime())) {
      date = new Date(dateStr);
    }
  } catch {
    console.error(`Failed to parse date: ${dateStr}`);
    return false;
  }

  // First check if date is within the global max days ahead limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const maxDate = addDays(today, config.searchConfig.maxDaysAhead);
  if (date > maxDate) {
    return false;
  }
  
  // Check each enabled rule
  for (const rule of config.rules) {
    if (!rule.enabled) continue;
    
    if (isDayMatching(date, rule) && isTimeMatching(date, rule, config)) {
      return true;
    }
  }
  
  return false;
}

function isDayMatching(date: Date, rule: MonitoringRule): boolean {
  const dayName = DAYS_OF_WEEK[getDay(date)];
  return rule.days.includes(dayName);
}

function isTimeMatching(date: Date, rule: MonitoringRule, config: MonitoringConfig): boolean {
  // If timeRanges includes "all", always match
  if (rule.timeRanges.includes('all')) {
    return true;
  }
  
  // For appointment checking, we assume any time slot is valid
  // since we're checking the date, not specific times
  // The actual time filtering will happen when parsing appointment slots
  return true;
}

export function parseTimeRange(timeRange: string, presets: Record<string, string>): { start: string; end: string } | null {
  // Check if it's a preset
  if (presets[timeRange]) {
    timeRange = presets[timeRange];
  }
  
  // Parse time range format "HH:MM-HH:MM"
  const match = timeRange.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!match) {
    return null;
  }
  
  return {
    start: match[1],
    end: match[2]
  };
}

export function isWeekendDate(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    return isWeekend(date);
  } catch {
    return false;
  }
}

export function formatAppointmentDate(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy');
}