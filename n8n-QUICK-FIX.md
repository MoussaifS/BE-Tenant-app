# 🚨 QUICK FIX for n8n Booking Request

## ✅ Server Status: RUNNING
The Strapi server is now running on `http://localhost:1337`

## 🔧 Fix Your n8n HTTP Request Node

### Current Issues:
1. ❌ Body has typo: `"aravial"` → should be `"Arrival"`
2. ❌ Missing `"data"` wrapper around the booking fields
3. ❌ Missing required fields: `Booking_Reference_Number`, `Departure`, `Accommodation`
4. ❌ Wrong date format: needs ISO datetime with time
5. ❌ `json: false` → should be enabled for JSON body

### ✅ CORRECT Configuration:

#### In n8n HTTP Request Node:

**1. URL**: `http://localhost:1337/api/bookings`

**2. Method**: `POST`

**3. Headers:**
```
Authorization: Bearer 33ac9162222ceeff1540be3026715d5e1c5fea51fedc6a21a938cbc8df5a5838ebc57d5fc99f296154fbf5a63009016aab8a3aa4cc5b38c4ab95b2f9bfd73f4dc220f41925c7f069b9780b21648930128d46b11733b8c51b5ef1dbbd2e7aa9cc5805c2a1157154ca389e323e5b11684a49e5033cf0003b6b56271913e6fa575b
Content-Type: application/json
```

**4. Body Settings:**
- ✅ Send Body: `Yes`
- ✅ Body Content Type: `JSON`
- ✅ Specify Body: `JSON`

**5. JSON Body (use this exact format):**
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

### 📝 If Using Dynamic Data:

If your dates come as `08/10/2025` (MM/DD/YYYY), use this expression:

```json
{
  "data": {
    "Booking_Reference_Number": {{ $json.Booking_Reference_Number }},
    "Arrival": "2025-{{ ($json.ArrivalDate || $json.aravial).split('/')[0] | padStart: 2, '0' }}-{{ ($json.ArrivalDate || $json.aravial).split('/')[1] | padStart: 2, '0' }}T15:45:00.000Z",
    "Departure": "2025-{{ ($json.DepartureDate || $json.Departure).split('/')[0] | padStart: 2, '0' }}-{{ ($json.DepartureDate || $json.Departure).split('/')[1] | padStart: 2, '0' }}T12:30:00.000Z",
    "Accommodation": "{{ $json.Accommodation || 'Alnarjis R136' }}"
  }
}
```

**Note:** Replace `$json.aravial` with the correct field name from your previous node.

### ✅ Test It Now:

The server is running! Your request should work once you:
1. Fix the typo (`aravial` → `Arrival`)
2. Wrap everything in `"data": {...}`
3. Add all required fields
4. Convert dates to ISO format

### Expected Response:
```json
{
  "data": {
    "id": 15,
    "documentId": "...",
    "Booking_Reference_Number": "29320685",
    "Arrival": "2025-10-08T15:45:00.000Z",
    "Departure": "2025-10-12T12:30:00.000Z",
    "Accommodation": "Alnarjis R136",
    "createdAt": "...",
    "updatedAt": "...",
    "publishedAt": "..."
  }
}
```

HTTP Status: **201 Created**


