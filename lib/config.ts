import { readFileSync } from 'fs';
import { join } from 'path';
import type { DMVLocation, MonitoringConfig } from './types';

const configDir = join(process.cwd(), 'config');

export function loadDMVLocations(): DMVLocation[] {
  try {
    const locationsPath = join(configDir, 'locations.json');
    const data = readFileSync(locationsPath, 'utf-8');
    return JSON.parse(data) as DMVLocation[];
  } catch (error) {
    console.error('Failed to load DMV locations:', error);
    // Fallback to default locations
    return [
      { name: 'Edison', id: 52 },
      { name: 'Rahway', id: 60 },
      { name: 'Newark', id: 56 },
      { name: 'Paterson', id: 59 }
    ];
  }
}

export function loadMonitoringRules(): MonitoringConfig {
  try {
    const rulesPath = join(configDir, 'monitoring-rules.json');
    const data = readFileSync(rulesPath, 'utf-8');
    const config = JSON.parse(data);
    
    // Ensure searchConfig exists
    if (!config.searchConfig) {
      config.searchConfig = {
        maxDaysAhead: 15,
        maxDatesPerLocation: 10
      };
    }
    
    // Set default timeouts if not provided
    if (!config.timeouts) {
      config.timeouts = {
        pageLoad: 20000,
        calendarLoad: 10000,
        dateAvailability: 3000,
        timeSlotLoad: 1500,
        betweenBatches: 1000
      };
    }
    
    return config as MonitoringConfig;
  } catch (error) {
    console.error('Failed to load monitoring rules:', error);
    // Fallback to default rules
    return {
      searchConfig: {
        maxDaysAhead: 15,
        maxDatesPerLocation: 10
      },
      timeouts: {
        pageLoad: 20000,
        calendarLoad: 10000,
        dateAvailability: 3000,
        timeSlotLoad: 1500,
        betweenBatches: 1000
      },
      rules: [
        {
          name: 'Weekend Appointments',
          enabled: true,
          days: ['Saturday', 'Sunday'],
          timeRanges: ['all']
        }
      ],
      presets: {
        all: '00:00-23:59'
      }
    };
  }
}

export const DMV_LOCATIONS = loadDMVLocations();
export const MONITORING_CONFIG = loadMonitoringRules();

// For Vercel deployment, we'll use environment variables as override
export function getDMVLocations(): DMVLocation[] {
  let locations: DMVLocation[];
  
  if (process.env.DMV_LOCATIONS) {
    try {
      locations = JSON.parse(process.env.DMV_LOCATIONS);
    } catch (error) {
      console.error('Failed to parse DMV_LOCATIONS env var:', error);
      locations = DMV_LOCATIONS;
    }
  } else {
    locations = DMV_LOCATIONS;
  }
  
  // Filter out skipped locations
  return locations.filter(loc => !loc.skip);
}

export function getMonitoringConfig(): MonitoringConfig {
  if (process.env.MONITORING_RULES) {
    try {
      return JSON.parse(process.env.MONITORING_RULES);
    } catch (error) {
      console.error('Failed to parse MONITORING_RULES env var:', error);
    }
  }
  return MONITORING_CONFIG;
}