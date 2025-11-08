#!/bin/bash

# Test script to create a booking using curl
# Usage: ./test-create-booking.sh

TOKEN="33ac9162222ceeff1540be3026715d5e1c5fea51fedc6a21a938cbc8df5a5838ebc57d5fc99f296154fbf5a63009016aab8a3aa4cc5b38c4ab95b2f9bfd73f4dc220f41925c7f069b9780b21648930128d46b11733b8c51b5ef1dbbd2e7aa9cc5805c2a1157154ca389e323e5b11684a49e5033cf0003b6b56271913e6fa575b"

# Generate unique booking reference (timestamp-based)
BOOKING_REF=$(date +%s%N | cut -b1-13)

# Calculate dates (arrival: today 3:45 PM, departure: +5 days 12:30 PM)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS date command
  ARRIVAL_DATE=$(date -u -v0d -v15H -v45M -v0S +"%Y-%m-%dT%H:%M:%S.000Z")
  DEPARTURE_DATE=$(date -u -v+5d -v12H -v30M -v0S +"%Y-%m-%dT%H:%M:%S.000Z")
else
  # Linux date command
  ARRIVAL_DATE=$(date -u -d "+0 days 15:45:00" +"%Y-%m-%dT%H:%M:%S.000Z")
  DEPARTURE_DATE=$(date -u -d "+5 days 12:30:00" +"%Y-%m-%dT%H:%M:%S.000Z")
fi

echo "Creating booking..."
echo "Booking Reference: $BOOKING_REF"
echo "Arrival: $ARRIVAL_DATE"
echo "Departure: $DEPARTURE_DATE"
echo ""

curl -X POST http://localhost:1337/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"Booking_Reference_Number\": $BOOKING_REF,
      \"Arrival\": \"$ARRIVAL_DATE\",
      \"Departure\": \"$DEPARTURE_DATE\",
      \"Accommodation\": \"Test Apartment 101\"
    }
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat


