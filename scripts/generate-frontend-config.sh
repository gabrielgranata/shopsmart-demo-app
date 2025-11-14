#!/bin/bash

# Generate frontend configuration from CloudFormation outputs
# This script should be run after CDK deployment

set -e

REGION=${AWS_REGION:-us-west-2}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Fetching CloudFormation outputs..."

# Get URLs from CloudFormation
PRODUCT_CATALOG_URL=$(aws cloudformation describe-stacks --region "$REGION" \
  --stack-name ShopSmart-ProductCatalog-v2 \
  --query 'Stacks[0].Outputs[?OutputKey==`ProductCatalogAlbDnsName`].OutputValue' \
  --output text 2>/dev/null)

ORDER_PROCESSING_URL=$(aws cloudformation describe-stacks --region "$REGION" \
  --stack-name ShopSmart-OrderProcessing-v2 \
  --query 'Stacks[0].Outputs[?OutputKey==`OrderProcessingAlbDnsName`].OutputValue' \
  --output text 2>/dev/null)

AUTH_SERVICE_URL=$(aws cloudformation describe-stacks --region "$REGION" \
  --stack-name ShopSmart-UserAuth-v2 \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text 2>/dev/null)

# Validate URLs
if [ -z "$PRODUCT_CATALOG_URL" ] || [ -z "$ORDER_PROCESSING_URL" ] || [ -z "$AUTH_SERVICE_URL" ]; then
  echo "Error: Could not retrieve all required URLs from CloudFormation"
  echo "  Product Catalog: $PRODUCT_CATALOG_URL"
  echo "  Order Processing: $ORDER_PROCESSING_URL"
  echo "  Auth Service: $AUTH_SERVICE_URL"
  exit 1
fi

# Add http:// prefix if not present
[[ "$PRODUCT_CATALOG_URL" != http* ]] && PRODUCT_CATALOG_URL="http://$PRODUCT_CATALOG_URL"
[[ "$ORDER_PROCESSING_URL" != http* ]] && ORDER_PROCESSING_URL="http://$ORDER_PROCESSING_URL"

echo "URLs retrieved:"
echo "  Product Catalog: $PRODUCT_CATALOG_URL"
echo "  Order Processing: $ORDER_PROCESSING_URL"
echo "  Auth Service: $AUTH_SERVICE_URL"
echo ""

# Generate config.env
echo "Generating config.env..."
cat > "$PROJECT_ROOT/src/frontend/deploy/config.env" << EOF
# Frontend Deployment Configuration
# Generated from CDK deployment outputs

# Environment
ENVIRONMENT=production

# API Gateway URL for Authentication Service
AUTH_SERVICE_URL=$AUTH_SERVICE_URL

# Product Catalog Service (EC2 ALB)
PRODUCT_SERVICE_URL=$PRODUCT_CATALOG_URL

# Order Processing Service (ECS ALB)
ORDER_SERVICE_URL=$ORDER_PROCESSING_URL

# Deployment Target (s3 or ec2)
DEPLOYMENT_TARGET=ec2

# EC2 Configuration (using Product Catalog ALB for frontend hosting)
EC2_INSTANCE_IP=$(echo $PRODUCT_CATALOG_URL | sed 's|http://||')
EC2_USER=ec2-user
EC2_KEY_PATH=~/.ssh/your-key.pem

# CORS Configuration
CORS_ALLOWED_ORIGINS=*
EOF

# Generate runtime config for frontend
echo "Generating runtime-config.js..."
cat > "$PROJECT_ROOT/src/frontend/js/runtime-config.js" << EOF
// Runtime configuration - injected at deployment time
window.PRODUCT_CATALOG_URL = '$PRODUCT_CATALOG_URL';
window.ORDER_PROCESSING_URL = '$ORDER_PROCESSING_URL';
window.AUTH_SERVICE_URL = '$AUTH_SERVICE_URL';
EOF

echo "✓ Configuration files generated successfully"
echo ""
echo "Files updated:"
echo "  - src/frontend/deploy/config.env"
echo "  - src/frontend/js/runtime-config.js"
