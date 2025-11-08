# n8n HTTP Request Configuration for Creating Bookings

## Issues with Current Request

1. **Data in Query Parameters**: The booking data is being sent in `qs` (query string) instead of the request body
2. **Wrong Date Format**: Dates are `08/10/2025` but need ISO datetime format: `2025-10-08T15:45:00.000Z`
3. **JSON Disabled**: `json: false` prevents proper JSON formatting
4. **Missing Data Wrapper**: Strapi requires data wrapped in a `data` object

## Correct n8n HTTP Request Configuration

### Node Settings:
- **Method**: `POST`
- **URL**: `http://localhost:1337/api/bookings`
- **Authentication**: `Generic Credential Type`
  - **Name**: `Authorization`
  - **Value**: `Bearer 33ac9162222ceeff1540be3026715d5e1c5fea51fedc6a21a938cbc8df5a5838ebc57d5fc99f296154fbf5a63009016aab8a3aa4cc5b38c4ab95b2f9bfd73f4dc220f41925c7f069b9780b21648930128d46b11733b8c51b5ef1dbbd2e7aa9cc5805c2a1157154ca389e323e5b11684a49e5033cf0003b6b56271913e6fa575b`

### Headers:
```
Content-Type: application/json
```

### Body (JSON):
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

### Important Notes:

1. **Date Format**: Convert `08/10/2025` to ISO format `2025-10-08T15:45:00.000Z`
   - Use arrival time: `15:45:00` (3:45 PM)
   - Use departure time: `12:30:00` (12:30 PM)

2. **Request Body**: 
   - Set **Send Body** to `Yes`
   - Set **Body Content Type** to `JSON`
   - Put all data in the request body, NOT in query parameters

3. **Booking Reference Number**: Must be unique (big integer)

4. **Example n8n Expression for Date Conversion**:
   If you have dates like `08/10/2025` from a previous node, use this expression:
   ```
   {{ $json.ArrivalDate.split('/').reverse().join('-') }}T15:45:00.000Z
   ```
   For departure:
   ```
   {{ $json.DepartureDate.split('/').reverse().join('-') }}T12:30:00.000Z
   ```

## Complete n8n HTTP Request Node Configuration:

```json
{
  "parameters": {
    "method": "POST",
    "url": "http://localhost:1337/api/bookings",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "Authorization",
          "value": "Bearer 33ac9162222ceeff1540be3026715d5e1c5fea51fedc6a21a938cbc8df5a5838ebc57d5fc99f296154fbf5a63009016aab8a3aa4cc5b38c4ab95b2f9bfd73f4dc220f41925c7f069b9780b21648930128d46b11733b8c51b5ef1dbbd2e7aa9cc5805c2a1157154ca389e323e5b11684a49e5033cf0003b6b56271913e6fa575b"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": []
    },
    "contentType": "json",
    "specifyBody": "json",
    "jsonBody": "{\n  \"data\": {\n    \"Booking_Reference_Number\": {{ $json.Booking_Reference_Number }},\n    \"Arrival\": \"{{ $json.Arrival }}\",\n    \"Departure\": \"{{ $json.Departure }}\",\n    \"Accommodation\": \"{{ $json.Accommodation }}\"\n  }\n}"
  }
}
```

## If Server is Not Running

If you get `ECONNREFUSED`, start the Strapi server:

```bash
cd BE-Tenant-app
npm run develop
```

Or if you want to run it in the background:

```bash
cd BE-Tenant-app
nohup npm run develop > server.log 2>&1 &
```

## Testing the Request

You can test with curl:

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


