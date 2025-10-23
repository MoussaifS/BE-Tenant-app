// Sample booking data for testing the tenant authentication system
// Run this script to populate your Strapi database with test data

const sampleBookings = [
  {
    Booking_Reference_Number: 544433,
    Arrival: new Date('2024-12-20T15:45:00.000Z'), // Today at 3:45 PM
    Departure: new Date('2024-12-25T12:00:00.000Z'), // 5 days later at 12:00 PM
    Accommodation: "Apartment 101"
  },
  {
    Booking_Reference_Number: 123456,
    Arrival: new Date('2024-12-18T15:45:00.000Z'), // Yesterday at 3:45 PM
    Departure: new Date('2024-12-22T12:00:00.000Z'), // 3 days later at 12:00 PM
    Accommodation: "Studio 205"
  },
  {
    Booking_Reference_Number: 789012,
    Arrival: new Date('2024-12-22T15:45:00.000Z'), // Future arrival
    Departure: new Date('2024-12-28T12:00:00.000Z'), // Future departure
    Accommodation: "Penthouse 301"
  },
  {
    Booking_Reference_Number: 345678,
    Arrival: new Date('2024-12-10T15:45:00.000Z'), // Past arrival
    Departure: new Date('2024-12-15T12:00:00.000Z'), // Past departure
    Accommodation: "Suite 150"
  }
];

// Test scenarios:
// 1. Booking 544433: Valid current booking (should work)
// 2. Booking 123456: Valid current booking (should work)
// 3. Booking 789012: Future booking (should show "too early" error)
// 4. Booking 345678: Past booking (should show "too late" error)
// 5. Booking 999999: Non-existent booking (should show "invalid reference" error)

console.log('Sample booking data created. Use these reference numbers for testing:');
sampleBookings.forEach(booking => {
  console.log(`Reference: ${booking.Booking_Reference_Number}, Accommodation: ${booking.Accommodation}`);
});

module.exports = sampleBookings;
