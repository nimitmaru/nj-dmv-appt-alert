import { format, parse, isWithinInterval, isWeekend, getDay, addDays, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import type { MonitoringConfig, MonitoringRule, DateRange } from './types';

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

  // Check each enabled rule
  for (const rule of config.rules) {
    if (!rule.enabled) continue;
    
    if (isDayMatching(date, rule) && 
        isTimeMatching(date, rule, config) && 
        isDateInRange(date, rule.dateRange)) {
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

function isDateInRange(date: Date, dateRange?: DateRange): boolean {
  if (!dateRange) return true; // No range specified means all dates are valid
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (dateRange.type) {
    case 'relative':
      if (dateRange.value === 'next-3-weekends') {
        return isInNextNWeekends(date, 3);
      } else if (dateRange.value === 'next-month') {
        const nextMonth = addMonths(today, 1);
        return date >= startOfMonth(nextMonth) && date <= endOfMonth(nextMonth);
      }
      break;
      
    case 'days-ahead':
      const daysAhead = typeof dateRange.value === 'number' ? dateRange.value : parseInt(dateRange.value as string);
      const maxDate = addDays(today, daysAhead);
      return date >= today && date <= maxDate;
      
    case 'absolute':
      if (dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return date >= startDate && date <= endDate;
      }
      break;
  }
  
  return true;
}

function isInNextNWeekends(date: Date, n: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Find the next weekend (or current if today is weekend)
  let currentDate = new Date(today);
  while (!isWeekend(currentDate)) {
    currentDate = addDays(currentDate, 1);
  }
  
  // Get the start of this weekend
  const firstWeekendStart = currentDate.getDay() === 0 ? addDays(currentDate, -1) : currentDate;
  
  // Check n weekends
  for (let i = 0; i < n; i++) {
    const weekendStart = addWeeks(firstWeekendStart, i);
    const weekendEnd = addDays(weekendStart, 1);
    
    if (date >= weekendStart && date <= weekendEnd) {
      return true;
    }
  }
  
  return false;
}