# Fixed n8n HTTP Request Configuration

## Current Issues in Your Request:

1. ❌ **Typo**: `"aravial"` should be `"Arrival"`
2. ❌ **Missing `data` wrapper**: Strapi requires data to be wrapped in `"data": {...}`
3. ❌ **Missing required fields**: `Booking_Reference_Number`, `Departure`, `Accommodation`
4. ❌ **Wrong date format**: `08/10/2025` needs to be ISO datetime `2025-10-08T15:45:00.000Z`
5. ❌ **`json: false`**: Should be `true` to send proper JSON

## ✅ Correct n8n HTTP Request Node Configuration

### 1. Basic Settings:
- **Method**: `POST`
- **URL**: `http://localhost:1337/api/bookings`

### 2. Authentication:
- **Authentication**: `Header Auth` or `Generic Credential Type`
- **Name**: `Authorization`
- **Value**: `Bearer 33ac9162222ceeff1540be3026715d5e1c5fea51fedc6a21a938cbc8df5a5838ebc57d5fc99f296154fbf5a63009016aab8a3aa4cc5b38c4ab95b2f9bfd73f4dc220f41925c7f069b9780b21648930128d46b11733b8c51b5ef1dbbd2e7aa9cc5805c2a1157154ca389e323e5b11684a49e5033cf0003b6b56271913e6fa575b`

### 3. Headers:
Add manually:
- **Name**: `Content-Type`
- **Value**: `application/json`

### 4. Body Configuration:
- **Send Body**: `Yes` ✅
- **Body Content Type**: `JSON` ✅
- **Specify Body**: `JSON`
- **JSON Body**: Use one of these options:

#### Option A: Static Example
```json
{
  "data": {
    "Booking_Reference_Number": 29320685,
    "Arrival": "2025-10-08T15:45:00.000Z",
    "Departure": "2025-10-12T12:30:00.000Z",
    "Accommodation": "Alnarjis R136"
  }
}
```

#### Option B: Dynamic (from previous nodes)
If you have data coming from previous nodes, use expressions:

```json
{
  "data": {
    "Booking_Reference_Number": {{ $json.Booking_Reference_Number }},
    "Arrival": "{{ $json.ArrivalDate | date: 'yyyy-MM-dd' }}T15:45:00.000Z",
    "Departure": "{{ $json.DepartureDate | date: 'yyyy-MM-dd' }}T12:30:00.000Z",
    "Accommodation": "{{ $json.Accommodation }}"
  }
}
```

#### Option C: Convert MM/DD/YYYY Format
If your dates come as `08/10/2025` format:

```json
{
  "data": {
    "Booking_Reference_Number": {{ $json.Booking_Reference_Number }},
    "Arrival": "{{ ($json.ArrivalDate || $json.aravial).split('/')[2] }}-{{ ($json.ArrivalDate || $json.aravial).split('/')[0] | padStart: 2, '0' }}-{{ ($json.ArrivalDate || $json.aravial).split('/')[1] | padStart: 2, '0' }}T15:45:00.000Z",
    "Departure": "{{ ($json.DepartureDate || $json.Departure).split('/')[2] }}-{{ ($json.DepartureDate || $json.Departure).split('/')[0] | padStart: 2, '0' }}-{{ ($json.DepartureDate || $json.Departure).split('/')[1] | padStart: 2, '0' }}T12:30:00.000Z",
    "Accommodation": "{{ $json.Accommodation }}"
  }
}
```

### 5. Important Settings:
- ✅ **Send Body**: `Yes`
- ✅ **Body Content Type**: `JSON`
- ✅ **JSON**: Should be enabled (not `false`)
- ❌ **Query Parameters**: Should be EMPTY (remove all query params)

## Field Requirements:

| Field | Type | Required | Format | Example |
|-------|------|----------|--------|---------|
| `Booking_Reference_Number` | biginteger | ✅ Yes | Number | `29320685` |
| `Arrival` | datetime | ✅ Yes | ISO 8601 | `2025-10-08T15:45:00.000Z` |
| `Departure` | datetime | ✅ Yes | ISO 8601 | `2025-10-12T12:30:00.000Z` |
| `Accommodation` | string | ✅ Yes | Text | `"Alnarjis R136"` |

## Date Format Conversion:

Your dates come as `08/10/2025` (MM/DD/YYYY), but Strapi needs:
- **Arrival**: `2025-10-08T15:45:00.000Z` (with time 15:45)
- **Departure**: `2025-10-12T12:30:00.000Z` (with time 12:30)

## Testing After Configuration:

Once configured, test with this curl command:

```bash
curl -X POST http://localhost:1337/api/bookings \
  -H "Authorization: Bearer 33ac9162222ceeff1540be3026715d5e1c5fea51fedc6a21a938cbc8df5a5838ebc57d5fc99f296154fbf5a63009016aab8a3aa4cc5b38c4ab95b2f9bfd73f4dc220f41925c7f069b9780b21648930128d46b11733b8c51b5ef1dbbd2e7aa9cc5805c2a1157154ca389e323e5b11684a49e5033cf0003b6b56271913e6fa575b" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "Booking_Reference_Number": 29320685,
      "Arrival": "2025-10-08T15:45:00.000Z",
      "Departure": "2025-10-12T12:30:00.000Z",
      "Accommodation": "Alnarjis R136"
    }
  }'
```

Expected response: HTTP 201 with booking data.


