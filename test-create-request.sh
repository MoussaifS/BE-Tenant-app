#!/bin/bash

# Test script to create a request with booking validation
# Usage: ./test-create-request.sh

TOKEN="33ac9162222ceeff1540be3026715d5e1c5fea51fedc6a21a938cbc8df5a5838ebc57d5fc99f296154fbf5a63009016aab8a3aa4cc5b38c4ab95b2f9bfd73f4dc220f41925c7f069b9780b21648930128d46b11733b8c51b5ef1dbbd2e7aa9cc5805c2a1157154ca389e323e5b11684a49e5033cf0003b6b56271913e6fa575b"

BASE_URL="http://localhost:1337"

echo "=========================================="
echo "Testing Request Creation with Validation"
echo "=========================================="
echo ""

# Check if server is running
echo "Checking server status..."
if curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/_health > /dev/null 2>&1; then
  echo "✓ Server is running"
else
  echo "✗ Server is not responding!"
  echo ""
  echo "Start the server with:"
  echo "  cd BE-Tenant-app && npm run develop"
  exit 1
fi

echo ""
echo "=========================================="
echo "Step 1: Create a test booking"
echo "=========================================="

# Generate unique booking reference
BOOKING_REF=$(date +%s%N | cut -b1-13)

# Calculate dates
if [[ "$OSTYPE" == "darwin"* ]]; then
  ARRIVAL_DATE=$(date -u -v0d -v15H -v45M -v0S +"%Y-%m-%dT%H:%M:%S.000Z")
  DEPARTURE_DATE=$(date -u -v+5d -v12H -v30M -v0S +"%Y-%m-%dT%H:%M:%S.000Z")
else
  ARRIVAL_DATE=$(date -u -d "+0 days 15:45:00" +"%Y-%m-%dT%H:%M:%S.000Z")
  DEPARTURE_DATE=$(date -u -d "+5 days 12:30:00" +"%Y-%m-%dT%H:%M:%S.000Z")
fi

echo "Creating booking with Reference Number: $BOOKING_REF"
echo ""

BOOKING_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"Booking_Reference_Number\": $BOOKING_REF,
      \"Arrival\": \"$ARRIVAL_DATE\",
      \"Departure\": \"$DEPARTURE_DATE\",
      \"Accommodation\": \"Test Apartment 101\"
    }
  }")

echo "$BOOKING_RESPONSE" | jq '.' 2>/dev/null || echo "$BOOKING_RESPONSE"
echo ""

# Extract booking ID from response
BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.data.id' 2>/dev/null)

if [ -z "$BOOKING_ID" ] || [ "$BOOKING_ID" == "null" ]; then
  echo "✗ Failed to create booking. Trying to get existing booking..."
  
  # Try to get an existing booking
  EXISTING_BOOKINGS=$(curl -s -X GET "${BASE_URL}/api/bookings?pagination[limit]=1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  BOOKING_ID=$(echo "$EXISTING_BOOKINGS" | jq -r '.data[0].id' 2>/dev/null)
  BOOKING_REF=$(echo "$EXISTING_BOOKINGS" | jq -r '.data[0].attributes.Booking_Reference_Number' 2>/dev/null)
  
  if [ -z "$BOOKING_ID" ] || [ "$BOOKING_ID" == "null" ]; then
    echo "✗ No bookings found. Please create a booking first."
    exit 1
  fi
  
  echo "✓ Using existing booking: ID=$BOOKING_ID, Reference=$BOOKING_REF"
else
  echo "✓ Booking created successfully: ID=$BOOKING_ID, Reference=$BOOKING_REF"
fi

echo ""
echo "=========================================="
echo "Step 2: Test 1 - Create request with valid booking"
echo "=========================================="

REQUEST_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

echo "Creating request with:"
echo "  - Booking ID: $BOOKING_ID"
echo "  - Reference_Number: $BOOKING_REF (should match booking)"
echo "  - Type: maintenance"
echo ""

curl -X POST ${BASE_URL}/api/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"booking\": $BOOKING_ID,
      \"Reference_Number\": $BOOKING_REF,
      \"type\": \"maintenance\",
      \"Phone_Number\": \"+1234567890\",
      \"date\": \"$REQUEST_DATE\",
      \"details\": \"Test request for maintenance\"
    }
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo ""
echo "=========================================="
echo "Step 3: Test 2 - Create request with INVALID booking ID"
echo "=========================================="

INVALID_BOOKING_ID=99999
echo "Attempting to create request with non-existent booking ID: $INVALID_BOOKING_ID"
echo ""

curl -X POST ${BASE_URL}/api/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"booking\": $INVALID_BOOKING_ID,
      \"Reference_Number\": $BOOKING_REF,
      \"type\": \"cleaning\",
      \"Phone_Number\": \"+1234567890\",
      \"details\": \"This should fail\"
    }
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo ""
echo "=========================================="
echo "Step 4: Test 3 - Create request with MISMATCHED Reference_Number"
echo "=========================================="

WRONG_REF=999999999
echo "Attempting to create request with:"
echo "  - Valid Booking ID: $BOOKING_ID"
echo "  - Wrong Reference_Number: $WRONG_REF (doesn't match booking's $BOOKING_REF)"
echo ""

curl -X POST ${BASE_URL}/api/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"booking\": $BOOKING_ID,
      \"Reference_Number\": $WRONG_REF,
      \"type\": \"extending\",
      \"Phone_Number\": \"+1234567890\",
      \"details\": \"This should fail - Reference_Number mismatch\"
    }
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo ""
echo "=========================================="
echo "Step 5: Test 4 - Create request MISSING required fields"
echo "=========================================="

echo "Attempting to create request without booking and Reference_Number"
echo ""

curl -X POST ${BASE_URL}/api/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"type\": \"maintenance\",
      \"Phone_Number\": \"+1234567890\",
      \"details\": \"This should fail - missing required fields\"
    }
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "=========================================="
echo "Testing Complete!"
echo "=========================================="





