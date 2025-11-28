#!/bin/bash

WEBHOOK_URL="${1:-http://localhost:3000/webhook}"
SECRET="${2:-your-secret-key}"

# Step 1: Generate ISO timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Step 2: Create payload
PAYLOAD='{
  "eventType": "incident",
  "incidentId": "INC-2025-11-27-001",
  "action": "created",
  "priority": "HIGH",
  "title": "ShopSmart Auth API 5xx Errors - Lambda Function Failure",
  "description": "CloudWatch alarm shopsmart-prod-v2-auth-api-5xx-errors triggered. API Gateway returning 5xx errors for UserAuth service health endpoint.",
  "timestamp": "'$TIMESTAMP'",
  "service": "UserAuth",
  "data": {
    "alarmName": "shopsmart-prod-v2-auth-api-5xx-errors",
    "alarmState": "ALARM",
    "region": "us-east-1",
    "apiEndpoint": "https://kb8b7u35e3.execute-api.us-east-1.amazonaws.com/v1/health",
    "stackName": "ShopSmart-UserAuth-v2",
    "lastDeployment": {
      "commit": "d2cb178",
      "timestamp": "2025-11-27T13:08:00Z",
      "author": "gabrielgranata",
      "message": "Deploy only UserAuth stack"
    },
    "metrics": {
      "errorRate": "100%",
      "affectedRequests": 3,
      "timeoutDuration": "29s"
    }
  }
}'

# Step 3: Generate HMAC signature (timestamp:payload)
MESSAGE="${TIMESTAMP}:${PAYLOAD}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# Step 4: Send webhook with signature headers
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-amzn-event-signature: $SIGNATURE" \
  -H "x-amzn-event-timestamp: $TIMESTAMP" \
  -d "$PAYLOAD"

echo ""
echo "Webhook sent to: $WEBHOOK_URL"
echo "Timestamp: $TIMESTAMP"
echo "Signature: $SIGNATURE"
