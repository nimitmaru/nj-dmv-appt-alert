import { DMVChecker } from '../lib/scraper';
import { getDMVLocations } from '../lib/config';
import { Notifier } from '../lib/notifier';
import type { DMVLocation } from '../lib/types';

// Test configuration
const TEST_SINGLE_LOCATION = false; // Set to true to test just one location
const TEST_SEND_EMAIL = false; // Set to true to test email sending

async function testDMVChecker() {
  console.log('=== NJ DMV Appointment Checker - Local Test ===\n');
  
  try {
    // Load locations
    let locations = getDMVLocations();
    console.log(`Loaded ${locations.length} locations:`, locations.map(l => l.name).join(', '));
    
    // Optionally test just one location
    if (TEST_SINGLE_LOCATION) {
      locations = [locations[0]]; // Just test Edison
      console.log(`\nTesting single location: ${locations[0].name}`);
    }
    
    // Create checker instance
    const checker = new DMVChecker(locations);
    
    console.log('\nStarting appointment check...\n');
    const startTime = Date.now();
    
    // Check appointments
    const appointments = await checker.checkAllLocations();
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Check completed in ${duration}ms\n`);
    
    // Display results
    if (appointments.length === 0) {
      console.log('❌ No weekend appointments found');
    } else {
      console.log(`✅ Found ${appointments.length} appointment(s):\n`);
      
      appointments.forEach((appt, index) => {
        console.log(`${index + 1}. ${appt.location}`);
        console.log(`   Date: ${appt.date} (${appt.dayOfWeek})`);
        console.log(`   Times: ${appt.times.join(', ')}`);
        console.log(`   URL: ${appt.url}\n`);
      });
      
      // Optionally test email sending
      if (TEST_SEND_EMAIL && process.env.RESEND_API_KEY && process.env.NOTIFICATION_EMAIL) {
        console.log('📧 Testing email notification...');
        try {
          const notifier = new Notifier();
          await notifier.sendNotification(appointments);
          console.log('✅ Email sent successfully!');
        } catch (error) {
          console.error('❌ Email failed:', error);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
console.log('Starting test...\n');
console.log('Environment variables:');
console.log('- RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set');
console.log('- NOTIFICATION_EMAIL:', process.env.NOTIFICATION_EMAIL ? '✅ Set' : '❌ Not set');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('\n');

testDMVChecker().then(() => {
  console.log('\n✅ Test completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});