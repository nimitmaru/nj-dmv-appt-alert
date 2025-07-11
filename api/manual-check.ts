import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DMVChecker } from '../lib/scraper';
import { getDMVLocations } from '../lib/config';
import type { CheckResult, DMVLocation } from '../lib/types';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Add API key authentication
  const apiKey = req.headers['x-api-key'];
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  const result: CheckResult = {
    success: false,
    appointments: [],
    timestamp: new Date(),
    locationsChecked: 0
  };

  try {
    // Get location filter from query params
    const locationIdParam = req.query.location as string | undefined;
    let locations = getDMVLocations();
    
    // Filter locations if specific one requested
    if (locationIdParam) {
      const locationId = parseInt(locationIdParam);
      locations = locations.filter(loc => loc.id === locationId);
      
      if (locations.length === 0) {
        return res.status(400).json({ 
          error: `Location with ID ${locationId} not found` 
        });
      }
    }
    
    result.locationsChecked = locations.length;
    
    console.log(`Manual check requested for ${locations.length} location(s)`);
    
    const checker = new DMVChecker(locations);
    const appointments = await checker.checkAllLocations();
    result.appointments = appointments;
    result.success = true;
    
    // Add execution time
    const duration = Date.now() - startTime;
    
    return res.status(200).json({
      ...result,
      duration: `${duration}ms`
    });
  } catch (error) {
    console.error('Manual check failed:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json(result);
  }
}