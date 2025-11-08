#!/bin/bash

# Test script for n8n booking request format
# This simulates what n8n should send

TOKEN="33ac9162222ceeff1540be3026715d5e1c5fea51fedc6a21a938cbc8df5a5838ebc57d5fc99f296154fbf5a63009016aab8a3aa4cc5b38c4ab95b2f9bfd73f4dc220f41925c7f069b9780b21648930128d46b11733b8c51b5ef1dbbd2e7aa9cc5805c2a1157154ca389e323e5b11684a49e5033cf0003b6b56271913e6fa575b"

# Test booking data (matching your n8n request)
BOOKING_REF="29320685"
ARRIVAL_DATE="08/10/2025"  # MM/DD/YYYY format from n8n
DEPARTURE_DATE="12/10/2025"
ACCOMMODATION="Alnarjis R136"

echo "Testing n8n-style booking request..."
echo "Original dates: Arrival=$ARRIVAL_DATE, Departure=$DEPARTURE_DATE"
echo ""

# Convert MM/DD/YYYY to ISO format
# For macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  # Parse MM/DD/YYYY format
  ARRIVAL_ISO=$(echo "$ARRIVAL_DATE" | awk -F'/' '{printf "%s-%02d-%02dT15:45:00.000Z", $3, $1, $2}')
  DEPARTURE_ISO=$(echo "$DEPARTURE_DATE" | awk -F'/' '{printf "%s-%02d-%02dT12:30:00.000Z", $3, $1, $2}')
else
  # For Linux
  ARRIVAL_ISO=$(date -d "$(echo $ARRIVAL_DATE | awk -F'/' '{print $3"-"$1"-"$2}')" -u +"%Y-%m-%dT15:45:00.000Z" 2>/dev/null || echo "2025-10-08T15:45:00.000Z")
  DEPARTURE_ISO=$(date -d "$(echo $DEPARTURE_DATE | awk -F'/' '{print $3"-"$1"-"$2}')" -u +"%Y-%m-%dT12:30:00.000Z" 2>/dev/null || echo "2025-10-12T12:30:00.000Z")
fi

echo "Converted dates:"
echo "  Arrival: $ARRIVAL_ISO"
echo "  Departure: $DEPARTURE_ISO"
echo ""

# Check if server is running
echo "Checking server status..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:1337/_health > /dev/null 2>&1; then
  echo "✓ Server is running"
else
  echo "✗ Server is not responding!"
  echo ""
  echo "Start the server with:"
  echo "  cd BE-Tenant-app && npm run develop"
  exit 1
fi

echo ""
echo "Sending request..."
echo ""

curl -X POST http://localhost:1337/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"Booking_Reference_Number\": $BOOKING_REF,
      \"Arrival\": \"$ARRIVAL_ISO\",
      \"Departure\": \"$DEPARTURE_ISO\",
      \"Accommodation\": \"$ACCOMMODATION\"
    }
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat


