#!/bin/bash

# Test script for creating booking from n8n data
# Usage: ./test-create-booking-n8n.sh

BASE_URL="${STRAPI_URL:-http://localhost:1337}"
API_TOKEN="${STRAPI_API_TOKEN:-33ac9162222ceeff1540be3026715d5e1c5fea51fedc6a21a938cbc8df5a5838ebc57d5fc99f296154fbf5a63009016aab8a3aa4cc5b38c4ab95b2f9bfd73f4dc220f41925c7f069b9780b21648930128d46b11733b8c51b5ef1dbbd2e7aa9cc5805c2a1157154ca389e323e5b11684a49e5033cf0003b6b56271913e6fa575b}"

echo "Testing n8n booking endpoint..."
echo "URL: ${BASE_URL}/api/bookings/create-from-n8n"
echo ""

# Test with DD/MM/YYYY format (as provided by user)
curl -X POST "${BASE_URL}/api/bookings/create-from-n8n" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "arrival": "08/10/2025",
    "departure": "12/10/2025",
    "bookingReference": 29320685,
    "accommodation": "Alnarjis R136"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat

echo ""
echo "---"
echo ""

# Test with wrapped data format
echo "Testing with wrapped data format..."
curl -X POST "${BASE_URL}/api/bookings/create-from-n8n" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "Arrival": "08/10/2025",
      "Departure": "12/10/2025",
      "Booking_Reference_Number": 29320686,
      "Accommodation": "Alnarjis R137"
    }
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat

echo ""
echo "Done!"


