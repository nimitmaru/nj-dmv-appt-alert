export interface DMVLocation {
  name: string;
  id: number;
  skip?: boolean;
}

export interface Appointment {
  location: string;
  locationId: number;
  date: string;
  dayOfWeek: string;
  times: string[];
  url: string;
}

export interface MonitoringRule {
  name: string;
  enabled: boolean;
  days: string[];
  timeRanges: string[];
}

export interface SearchConfig {
  maxDaysAhead: number;
  maxDatesPerLocation: number;
}

export interface TimeoutConfig {
  pageLoad: number;
  calendarLoad: number;
  dateAvailability: number;
  timeSlotLoad: number;
  betweenBatches: number;
}

export interface MonitoringConfig {
  searchConfig: SearchConfig;
  timeouts?: TimeoutConfig;
  rules: MonitoringRule[];
  presets: Record<string, string>;
}

export interface NotificationRecord {
  appointmentKey: string;
  sentAt: Date;
  expiresAt: Date;
}

export interface CheckResult {
  success: boolean;
  appointments: Appointment[];
  timestamp: Date;
  locationsChecked: number;
  error?: string;
}