export interface DMVLocation {
  name: string;
  id: number;
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

export interface MonitoringConfig {
  searchConfig: SearchConfig;
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