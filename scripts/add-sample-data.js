// Simple script to add sample booking data to Strapi
// Run this after Strapi is running

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

console.log('Sample booking data:');
sampleBookings.forEach(booking => {
  console.log(`Reference: ${booking.Booking_Reference_Number}, Accommodation: ${booking.Accommodation}`);
});

// To add this data to Strapi, use the admin panel or API:
// POST http://localhost:1337/api/bookings
// Body: { "data": { ...booking } }
