# 📥 n8n → Booking Endpoint Guide

## Overview

This guide explains how to configure n8n to send booking data to the Strapi backend using the custom `/api/bookings/create-from-n8n` endpoint.

## Endpoint Details

- **URL**: `POST /api/bookings/create-from-n8n`
- **Authentication**: Bearer token (Strapi API token)
- **Content-Type**: `application/json`

## 🔑 How to Get the Strapi API Token

The Strapi API token (Bearer token) is used to authenticate requests from n8n to your Strapi backend. Here's how to find or create one:

### Option 1: Create a New API Token in Strapi Admin Panel

1. **Access Strapi Admin Panel**
   - Open your Strapi admin URL (usually `http://localhost:1337/admin`)
   - Log in with your admin credentials

2. **Navigate to API Tokens**
   - Click on **Settings** (gear icon) in the left sidebar
   - Go to **API Tokens** under **Users & Permissions Plugin**

3. **Create New Token**
   - Click the **Create new API Token** button
   - Fill in the form:
     - **Name**: e.g., "n8n Booking Integration"
     - **Token duration**: Choose "Unlimited" or set an expiration date
     - **Token type**: Select **"Full access"** (or "Custom" with appropriate permissions)
     - **Description**: Optional - e.g., "Token for n8n to create bookings"

4. **Copy the Token**
   - After creation, Strapi will display the token **ONCE**
   - ⚠️ **IMPORTANT**: Copy and save it immediately - you won't be able to see it again!
   - Format: A long string like `33ac9162222ceeff1540be3026715d5e1c5fea51fedc6a21a938cbc8df5a5838ebc57d5fc99f296154fbf5a63009016aab8a3aa4cc5b38c4ab95b2f9bfd73f4dc220f41925c7f069b9780b21648930128d46b11733b8c51b5ef1dbbd2e7aa9cc5805c2a1157154ca389e323e5b11684a49e5033cf0003b6b56271913e6fa575b`

5. **Use in n8n**
   - In your n8n HTTP Request node, use: `Bearer YOUR_TOKEN_HERE`
   - Example: `Bearer 33ac9162222ceeff1540be3026715d5e1c5fea51fedc6a21a938cbc8df5a5838ebc57d5fc99f296154fbf5a63009016aab8a3aa4cc5b38c4ab95b2f9bfd73f4dc220f41925c7f069b9780b21648930128d46b11733b8c51b5ef1dbbd2e7aa9cc5805c2a1157154ca389e323e5b11684a49e5033cf0003b6b56271913e6fa575b`

### Option 2: View Existing Tokens

If you already have API tokens created:

1. Go to **Settings** → **API Tokens**
2. You'll see a list of existing tokens
3. ⚠️ **Note**: Strapi doesn't show the full token value for security reasons
4. If you need to use an existing token, you'll need to:
   - Either remember where you saved it
   - Or create a new token and revoke the old one

### Option 3: Check Your Environment Variables

If you're using environment variables, check your `.env` file for:
- `STRAPI_API_TOKEN` (if you've set it up)
- Or check your deployment platform's environment variables

### Token Permissions

For the `/api/bookings/create-from-n8n` endpoint, the token needs:
- **Full access** (recommended), OR
- **Custom permissions** with:
  - `api::booking.booking.create` permission
  - `api::booking.booking.update` permission
  - `api::booking.booking.find` permission

### Security Best Practices

1. ✅ Use **Full access** tokens only for trusted integrations
2. ✅ Set an **expiration date** if possible
3. ✅ Use **Custom permissions** with minimal required access when possible
4. ✅ Store tokens securely (environment variables, n8n credentials)
5. ✅ Rotate tokens periodically
6. ✅ Revoke unused tokens

## Supported Data Formats

The endpoint accepts booking data in multiple formats and field naming conventions:

### Format 1: Direct Fields (Recommended)
```json
{
  "arrival": "08/10/2025",
  "departure": "12/10/2025",
  "bookingReference": 29320685,
  "accommodation": "Alnarjis R136"
}
```

### Format 2: Wrapped Data
```json
{
  "data": {
    "Arrival": "08/10/2025",
    "Departure": "12/10/2025",
    "Booking_Reference_Number": 29320685,
    "Accommodation": "Alnarjis R136"
  }
}
```

### Format 3: Mixed Case
```json
{
  "Arrival": "08/10/2025",
  "Departure": "12/10/2025",
  "Booking_Reference_Number": 29320685,
  "Accommodation": "Alnarjis R136"
}
```

## Field Mapping

The endpoint accepts various field name variations:

| Field | Accepted Names |
|-------|---------------|
| Booking Reference | `Booking_Reference_Number`, `bookingReference`, `booking_reference_number` |
| Arrival Date | `Arrival`, `arrival`, `aravial` (handles typo) |
| Departure Date | `Departure`, `departure` |
| Accommodation | `Accommodation`, `accommodation` |

## Date Format

### Input Formats Supported:
- **DD/MM/YYYY**: `08/10/2025` → October 8, 2025
- **ISO Format**: `2025-10-08T15:45:00.000Z` (accepted as-is)

### Output Format:
- **Arrival**: Automatically set to `15:45:00` (3:45 PM)
- **Departure**: Automatically set to `12:30:00` (12:30 PM)

**Example Conversion:**
- Input: `08/10/2025`
- Output: `2025-10-08T15:45:00.000Z` (for arrival)
- Output: `2025-10-08T12:30:00.000Z` (for departure)

## n8n HTTP Request Node Configuration

### Basic Settings:
- **Method**: `POST`
- **URL**: `http://127.0.0.1:1337/api/bookings/create-from-n8n` (use `127.0.0.1` instead of `localhost` to avoid IPv6 issues)
  - ⚠️ **Note**: If you get `ECONNREFUSED` errors, use `127.0.0.1` instead of `localhost`
  - For production: Use your actual Strapi server URL

### Authentication:
- **Type**: `Header Auth` or `Generic Credential Type`
- **Name**: `Authorization`
- **Value**: `Bearer YOUR_STRAPI_API_TOKEN`

### Headers:
- **Content-Type**: `application/json`

### Body Configuration:
- **Send Body**: `Yes`
- **Body Content Type**: `JSON`
- **Specify Body**: `JSON`

### JSON Body Examples:

#### Example 1: Using Variables from Previous Nodes
```json
{
  "arrival": "{{ $json.arrival }}",
  "departure": "{{ $json.departure }}",
  "bookingReference": {{ $json.bookingReference }},
  "accommodation": "{{ $json.accommodation }}"
}
```

#### Example 2: Static Data
```json
{
  "arrival": "08/10/2025",
  "departure": "12/10/2025",
  "bookingReference": 29320685,
  "accommodation": "Alnarjis R136"
}
```

#### Example 3: With Data Wrapper
```json
{
  "data": {
    "Arrival": "{{ $json.ArrivalDate }}",
    "Departure": "{{ $json.DepartureDate }}",
    "Booking_Reference_Number": {{ $json.BookingReference }},
    "Accommodation": "{{ $json.Accommodation }}"
  }
}
```

## Response Format

### Success Response (201 Created):
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": 1,
    "Booking_Reference_Number": 29320685,
    "Arrival": "2025-10-08T15:45:00.000Z",
    "Departure": "2025-10-12T12:30:00.000Z",
    "Accommodation": "Alnarjis R136",
    "createdAt": "2025-11-06T13:31:42.277Z",
    "updatedAt": "2025-11-06T13:31:42.277Z"
  }
}
```

### Update Response (200 OK):
```json
{
  "success": true,
  "message": "Booking updated successfully",
  "data": {
    "id": 1,
    "Booking_Reference_Number": 29320685,
    "Arrival": "2025-10-08T15:45:00.000Z",
    "Departure": "2025-10-12T12:30:00.000Z",
    "Accommodation": "Alnarjis R136",
    "updatedAt": "2025-11-06T13:31:42.277Z"
  }
}
```

### Error Responses:

#### Missing Field (400):
```json
{
  "error": "Booking reference is required",
  "code": "MISSING_BOOKING_REFERENCE"
}
```

#### Invalid Date Format (400):
```json
{
  "error": "Invalid date format. Expected DD/MM/YYYY or ISO format.",
  "code": "INVALID_DATE_FORMAT",
  "received": {
    "arrival": "invalid-date",
    "departure": "12/10/2025"
  }
}
```

#### Duplicate Booking (409):
```json
{
  "error": "Booking reference already exists",
  "code": "DUPLICATE_BOOKING_REFERENCE"
}
```

## Behavior

- **Create**: If booking reference doesn't exist, creates a new booking
- **Update**: If booking reference exists, updates the existing booking
- **Unique Constraint**: Booking reference number must be unique

## Testing

### Using curl:
```bash
curl -X POST http://localhost:1337/api/bookings/create-from-n8n \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arrival": "08/10/2025",
    "departure": "12/10/2025",
    "bookingReference": 29320685,
    "accommodation": "Alnarjis R136"
  }'
```

### Using the test script:
```bash
./test-create-booking-n8n.sh
```

## Complete n8n Workflow Example

```
┌─────────────────┐
│  Trigger Node   │ ← Your workflow trigger
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Code Node     │ ← Optional: Transform/Validate data
│  (Optional)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Request   │ → POST /api/bookings/create-from-n8n
│      Node       │   With booking data
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Error Handle  │ ← Handle errors if needed
│   (Optional)    │
└─────────────────┘
```

## Notes

1. **Date Parsing**: The endpoint assumes **DD/MM/YYYY** format for dates with slashes
2. **Time Setting**: Arrival and departure times are automatically set:
   - Arrival: 15:45:00 (3:45 PM)
   - Departure: 12:30:00 (12:30 PM)
3. **Idempotent**: Calling the endpoint multiple times with the same booking reference will update the existing booking
4. **Flexible Field Names**: The endpoint accepts various field name formats for compatibility

## Troubleshooting

### Issue: `ECONNREFUSED` or `connect ECONNREFUSED ::1:1337` error
**Problem**: n8n is trying to connect via IPv6 (`::1`) but Strapi is only listening on IPv4 (`127.0.0.1`)

**Solutions**:
1. **Use IPv4 address instead of localhost** (Recommended):
   - Change URL from: `http://localhost:1337/api/bookings/create-from-n8n`
   - To: `http://127.0.0.1:1337/api/bookings/create-from-n8n`
   
2. **Verify Strapi is running**:
   ```bash
   # Check if Strapi is running
   lsof -ti:1337
   
   # Test the endpoint
   curl http://127.0.0.1:1337/api/bookings
   ```

3. **Start Strapi if not running**:
   ```bash
   cd BE-Tenant-app
   npm run develop
   ```

4. **For production**: Use the full domain/IP address instead of `localhost`

### Issue: "Invalid date format" error
**Solution**: Ensure dates are in DD/MM/YYYY format (e.g., `08/10/2025`) or ISO format

### Issue: "Booking reference already exists" error
**Solution**: This is expected if the booking exists. The endpoint will update it on the next call.

### Issue: Authentication error
**Solution**: Verify your API token is correct and includes the `Bearer ` prefix

### Issue: Field not recognized
**Solution**: Check that field names match one of the accepted variations listed above

