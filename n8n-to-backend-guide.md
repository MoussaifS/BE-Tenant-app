# 📡 n8n → Backend Data Retrieval Guide

## Overview

This guide explains how to configure n8n to retrieve data from Google Sheets and send it back to the Strapi backend via HTTPS Request/Response.

## Current Flow

```
Frontend → Backend → n8n Webhook → Google Sheets → n8n Response → Backend → Frontend
```

## Step-by-Step n8n Configuration

### 1. Webhook Node (Receives Request)

**Configuration:**
- **Method**: `POST`
- **Path**: `/webhook-test/eb0854af-6a79-47ff-a9cd-924ee3762571`
- **Response Mode**: `When Last Node Finishes` ⚠️ **IMPORTANT**
- **Authentication**: None (No authentication required)

**What it receives:**
```
col_2=R217
```
(Form-urlencoded data)

---

### 2. Google Sheets Node (Filter Data)

**Configuration:**
- **Operation**: `Read Rows` or `Read Rows with Filter`
- **Spreadsheet**: Select your Google Sheet
- **Sheet Name**: Your sheet name (e.g., "Sheet1")

**Filter Configuration:**
- **Filter**: Manual
- **Column**: `col_2` (or column name if using headers)
- **Operation**: `equal`
- **Value**: `{{ $json.col_2 }}` (value from webhook)

**Alternative: Using "Read Rows" with Filter Expression:**
```
col_2={{ $json.col_2 }}
```

**Expected Output:**
```json
{
  "col_2": "R217",
  "col_3": "",
  "col_4": "Details Alaredh",
  "col_5": "D5",
  "col_6": "#2580#",
  "col_7": "199414#"
}
```

---

### 3. Respond to Webhook Node (Send Response)

**Configuration:**
- **Response Code**: `200`
- **Response Headers**: 
  - `Content-Type`: `application/json`

**Response Body (JSON):**

**Option A: Return the entire row as-is**
```json
{{ $json }}
```

**Option B: Format explicitly**
```json
{
  "col_2": "{{ $json.col_2 }}",
  "col_3": "{{ $json.col_3 }}",
  "col_4": "{{ $json.col_4 }}",
  "col_5": "{{ $json.col_5 }}",
  "col_6": "{{ $json.col_6 }}",
  "col_7": "{{ $json.col_7 }}"
}
```

**Option C: Handle empty results**
```javascript
// Use Code/Function node before Respond to Webhook
const input = $input.item.json;

if (!input || Object.keys(input).length === 0) {
  return {
    col_2: null,
    col_3: null,
    col_4: null,
    col_5: null,
    col_6: null,
    col_7: null
  };
}

return input;
```

---

## Backend Processing

### How Backend Receives Data

1. **Backend sends POST request** to n8n webhook:
   ```javascript
   POST http://localhost:5678/webhook-test/eb0854af-6a79-47ff-a9cd-924ee3762571
   Content-Type: application/x-www-form-urlencoded
   
   col_2=R217
   ```

2. **Backend receives JSON response** from n8n:
   ```json
   {
     "col_2": "R217",
     "col_3": "",
     "col_4": "Details Alaredh",
     "col_5": "D5",
     "col_6": "#2580#",
     "col_7": "199414#"
   }
   ```

3. **Backend transforms** the response using `transformN8nResponse()`:
   ```javascript
   {
     unit: "R217/D5",
     development: "Details Alaredh",
     buildingPassword: "2580",
     apartmentPassword: "199414"
   }
   ```

4. **Backend returns** to frontend:
   ```json
   {
     "data": {
       "unit": "R217/D5",
       "development": "Details Alaredh",
       "buildingPassword": "2580",
       "apartmentPassword": "199414"
     }
   }
   ```

---

## Complete n8n Workflow Example

```
┌─────────────────┐
│  Webhook Node   │ ← Receives: col_2=R217
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Google Sheets   │ ← Filters by col_2
│   Read Rows     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Code Node     │ ← Optional: Transform/Validate
│  (Optional)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Respond to      │ → Returns: JSON with col_2-col_7
│   Webhook       │
└─────────────────┘
```

---

## Testing with Postman

### Test Request:
```
POST http://localhost:5678/webhook-test/eb0854af-6a79-47ff-a9cd-924ee3762571
Content-Type: application/x-www-form-urlencoded

col_2=R217
```

### Expected Response:
```json
{
  "col_2": "R217",
  "col_3": "",
  "col_4": "Details Alaredh",
  "col_5": "D5",
  "col_6": "#2580#",
  "col_7": "199414#"
}
```

---

## Error Handling in n8n

### Handle "No Rows Found" Case

Add a **Switch** or **IF** node after Google Sheets:

**IF Node Configuration:**
- **Condition**: `{{ $json.col_2 }}` exists
- **True Path**: Continue to Respond to Webhook
- **False Path**: Return error response

**Error Response (False Path):**
```json
{
  "error": "Unit not found",
  "col_2": null,
  "col_3": null,
  "col_4": null,
  "col_5": null,
  "col_6": null,
  "col_7": null
}
```

---

## Response Format Requirements

### ✅ Correct Format (Single Object)
```json
{
  "col_2": "R217",
  "col_3": "",
  "col_4": "Details Alaredh",
  "col_5": "D5",
  "col_6": "#2580#",
  "col_7": "199414#"
}
```

### ✅ Correct Format (Array - First Element Used)
```json
[
  {
    "col_2": "R217",
    "col_3": "",
    "col_4": "Details Alaredh",
    "col_5": "D5",
    "col_6": "#2580#",
    "col_7": "199414#"
  }
]
```

### ❌ Incorrect Format (Nested in data property)
```json
{
  "data": {
    "col_2": "R217",
    ...
  }
}
```
*Note: Backend can handle this, but direct format is preferred*

---

## Troubleshooting

### Issue: Backend receives empty response
**Solution**: 
- Check Webhook node → Response Mode = "When Last Node Finishes"
- Ensure Respond to Webhook node is connected
- Check n8n execution logs

### Issue: Backend receives HTML instead of JSON
**Solution**:
- Add `Content-Type: application/json` header in Respond to Webhook node
- Ensure response body is valid JSON

### Issue: "Unit not found" error
**Solution**:
- Check Google Sheets filter is correct
- Verify column name matches (col_2 vs Reference)
- Check the unit number exists in the sheet

### Issue: Response timeout
**Solution**:
- Increase timeout in backend (currently 30 seconds)
- Optimize Google Sheets query
- Check n8n execution logs for slow operations

### Issue: "Webhook not registered" or "404 The requested webhook is not registered"
**Error Message**: `404 The requested webhook "242a3cd4-61c3-420b-a9fc-674e3c7514f9" is not registered`

**Common Causes**:
- Using test URL (`/webhook-test/`) in production - test URLs only work temporarily
- Workflow is not ACTIVE - production URLs require active workflows
- Wrong URL path - missing `/webhook/` or using `/webhook-test/` instead

**Solution**:
1. **Check n8n Workflow Status**:
   - Open your n8n workflow
   - Ensure the workflow is **Active** (toggled ON)
   - The webhook node only works when the workflow is active

2. **Verify Webhook URL**:
   - In n8n, click on the Webhook node
   - **IMPORTANT**: There are TWO types of webhook URLs:
     - **Test URL** (`/webhook-test/...`): Only works temporarily after clicking "Execute workflow". NOT for production!
     - **Production URL** (`/webhook/...`): Works continuously when workflow is ACTIVE. Use this for production!
   - Click on the Webhook node and look for the **Production URL** (not the test URL)
   - The UUID in the path must match the one in your `N8N_UNIT_LOCK_WEBHOOK_URL` environment variable

3. **Update Environment Variable**:
   - **For Production**: Use the production URL format: `https://<n8n-host>/webhook/<webhook-id>`
     - Example: `https://n8n-production-c20f.up.railway.app/webhook/eb0854af-6a79-47ff-a9cd-924ee3762571`
   - **For Local Development**: Use test URL: `http://localhost:5678/webhook-test/<webhook-id>`
     - Example: `http://localhost:5678/webhook-test/eb0854af-6a79-47ff-a9cd-924ee3762571`
   - ⚠️ **CRITICAL**: Test URLs (`/webhook-test/`) only work temporarily and require clicking "Execute workflow" each time. For production, you MUST use the production URL (`/webhook/`) and activate the workflow!

4. **Create New Webhook** (if webhook was deleted):
   - If the webhook ID doesn't exist, create a new Webhook node in n8n
   - Copy the new webhook URL from the node
   - Update `N8N_UNIT_LOCK_WEBHOOK_URL` in your `.env` file
   - Restart your backend server

5. **Check n8n Webhook Configuration**:
   - Method: `POST`
   - Response Mode: `When Last Node Finishes`
   - Authentication: None (unless you've configured it)

**How to Get Production Webhook URL from n8n**:
1. Open your n8n workflow
2. Click on the **Webhook** node
3. Look for the **"Production URL"** section (not "Test URL")
4. Copy the full production URL (e.g., `https://n8n-production-c20f.up.railway.app/webhook/eb0854af-6a79-47ff-a9cd-924ee3762571`)
5. Make sure the workflow is **ACTIVE** (toggle ON in top-right)
6. Use this production URL in your `N8N_UNIT_LOCK_WEBHOOK_URL` environment variable

**Example Debug Steps**:
```bash
# Check your current environment variable
echo $N8N_UNIT_LOCK_WEBHOOK_URL

# Test the production webhook directly with curl (workflow must be ACTIVE)
curl -X POST https://n8n-production-c20f.up.railway.app/webhook/eb0854af-6a79-47ff-a9cd-924ee3762571 \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "col_2=R217"

# For local testing (test URL - requires clicking "Execute workflow" first)
curl -X POST http://localhost:5678/webhook-test/eb0854af-6a79-47ff-a9cd-924ee3762571 \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "col_2=R217"
```

---

## Environment Variables

### For Production:
Make sure your `.env` file has the **production webhook URL**:
```env
N8N_UNIT_LOCK_WEBHOOK_URL=https://n8n-production-c20f.up.railway.app/webhook/eb0854af-6a79-47ff-a9cd-924ee3762571
```

**Important**: 
- Use `/webhook/` (not `/webhook-test/`) for production
- The workflow MUST be ACTIVE in n8n for production URLs to work
- Get the production URL from the Webhook node in n8n (not the test URL)

### For Local Development:
```env
N8N_UNIT_LOCK_WEBHOOK_URL=http://localhost:5678/webhook-test/eb0854af-6a79-47ff-a9cd-924ee3762571
```

**Note**: Test URLs only work temporarily after clicking "Execute workflow" in n8n. For continuous operation, use production URLs with an active workflow.

---

## Debugging

### Backend Logs
Check Strapi console for:
- `Raw n8n response:` - Shows what n8n returned
- `Transformed data:` - Shows the transformed format
- `Looking up booking with reference:` - Shows booking lookup

### n8n Execution Logs
1. Open n8n workflow
2. Click "Execute Workflow" → "Test workflow"
3. Check execution logs for each node
4. Verify data flow between nodes

---

## Summary

1. **n8n Webhook** receives `col_2=R217` from backend
2. **Google Sheets** filters rows where `col_2 = R217`
3. **Respond to Webhook** returns JSON with `col_2` through `col_7`
4. **Backend** receives JSON, transforms it, and sends to frontend
5. **Frontend** displays unit lock information

**Key Point**: Set Webhook Response Mode to "When Last Node Finishes" for proper HTTP response handling!

