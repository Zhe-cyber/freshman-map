#!/usr/bin/env bash
# Stand up the whole Freshman Map backend in YOUR OWN Learner Lab account.
#
# Learner Lab gives every student a separate, isolated account.
# Each person runs this script to create/update the same backend stack.
#
#   1. Start your lab and open AWS Details -> AWS CLI.
#   2. Copy the AWS credentials into ~/.aws/credentials.
#   3. bash infra/deploy.sh
#   4. Paste the printed API URL into src/api.js
#
# Safe to re-run: everything is create-or-update.

set -euo pipefail

REGION=us-east-1
TABLE=freshmanmap
FN=freshmanmap-api
API=freshmanmap

echo "==> checking credentials"

ACCOUNT=$(aws sts get-caller-identity --query Account --output text) || {
  echo "No valid credentials. Start the lab and re-copy AWS Details -> AWS CLI." >&2
  exit 1
}

ROLE="arn:aws:iam::${ACCOUNT}:role/LabRole"

echo "    account $ACCOUNT"

# ---------------------------------------------------------------------------
# DynamoDB
# ---------------------------------------------------------------------------

echo "==> DynamoDB table"

if aws dynamodb describe-table \
  --table-name "$TABLE" \
  --region "$REGION" >/dev/null 2>&1; then

  echo "    exists"

else

  aws dynamodb create-table \
    --table-name "$TABLE" \
    --billing-mode PAY_PER_REQUEST \
    --attribute-definitions \
      AttributeName=pk,AttributeType=S \
      AttributeName=sk,AttributeType=S \
    --key-schema \
      AttributeName=pk,KeyType=HASH \
      AttributeName=sk,KeyType=RANGE \
    --region "$REGION" >/dev/null

  aws dynamodb wait table-exists \
    --table-name "$TABLE" \
    --region "$REGION"

  echo "    created"

fi

# ---------------------------------------------------------------------------
# Package Lambda
# ---------------------------------------------------------------------------

echo "==> packaging lambda"

BUILD=infra/.build

rm -rf "$BUILD"
mkdir -p "$BUILD"

cp infra/lambda/index.mjs "$BUILD/"

# @aws-sdk v3 is available in the Node.js 20.x Lambda runtime,
# so no npm install is required.
#
# Git Bash on Windows may not have zip.
# Fall back to PowerShell or Python.

(
  cd "$BUILD"

  if command -v zip >/dev/null 2>&1; then

    zip -q function.zip index.mjs

  elif command -v powershell >/dev/null 2>&1; then

    powershell -NoProfile -Command \
      "Compress-Archive -Path index.mjs -DestinationPath function.zip -Force" \
      >/dev/null

  elif command -v python >/dev/null 2>&1; then

    python -c \
      "import zipfile; zipfile.ZipFile('function.zip','w',zipfile.ZIP_DEFLATED).write('index.mjs')"

  else

    echo "No zip, powershell or python available to package the function." >&2
    exit 1

  fi

  # Verify ZIP signature.
  head -c2 function.zip | grep -q PK || {
    echo "Packaging produced a non-zip file." >&2
    exit 1
  }

)

# ---------------------------------------------------------------------------
# Lambda
# ---------------------------------------------------------------------------

echo "==> lambda"

if aws lambda get-function \
  --function-name "$FN" \
  --region "$REGION" >/dev/null 2>&1; then

  aws lambda update-function-code \
    --function-name "$FN" \
    --zip-file "fileb://$BUILD/function.zip" \
    --region "$REGION" >/dev/null

  echo "    code updated"

else

  aws lambda create-function \
    --function-name "$FN" \
    --runtime nodejs20.x \
    --role "$ROLE" \
    --handler index.handler \
    --timeout 10 \
    --environment "Variables={TABLE=$TABLE}" \
    --zip-file "fileb://$BUILD/function.zip" \
    --region "$REGION" >/dev/null

  aws lambda wait function-active \
    --function-name "$FN" \
    --region "$REGION"

  echo "    created"

fi

rm -rf "$BUILD"

# ---------------------------------------------------------------------------
# HTTP API Gateway
# ---------------------------------------------------------------------------

echo "==> HTTP API"

API_ID=$(aws apigatewayv2 get-apis \
  --region "$REGION" \
  --query "Items[?Name=='$API'].ApiId | [0]" \
  --output text)

# IMPORTANT:
# DELETE must be included here because BuddyUp uses:
#
# DELETE /c/{campus}/activities/{activityId}
#
# Without DELETE in API Gateway CORS, the browser blocks the request
# before Lambda can receive it.

# authorization must be listed too. Signed-in requests carry a Bearer token,
# which makes them non-simple, so the browser preflights them. Leave it out and
# the browser blocks every signed-in request while curl sails through, because
# curl does not preflight. This script rewrites CORS on every run, so dropping
# it here silently breaks the live app.
CORS_CONFIG='{"AllowOrigins":["*"],"AllowMethods":["GET","POST","PUT","DELETE","OPTIONS"],"AllowHeaders":["content-type","authorization"]}'

if [ "$API_ID" = "None" ] || [ -z "$API_ID" ]; then

  API_ID=$(aws apigatewayv2 create-api \
    --name "$API" \
    --protocol-type HTTP \
    --target "arn:aws:lambda:${REGION}:${ACCOUNT}:function:${FN}" \
    --cors-configuration "$CORS_CONFIG" \
    --region "$REGION" \
    --query ApiId \
    --output text)

  echo "    created $API_ID"

else

  # Keep CORS correct even if somebody changed it in AWS Console.
  aws apigatewayv2 update-api \
    --api-id "$API_ID" \
    --cors-configuration "$CORS_CONFIG" \
    --region "$REGION" >/dev/null

  echo "    exists $API_ID"

fi

# ---------------------------------------------------------------------------
# Lambda permission for API Gateway
# ---------------------------------------------------------------------------

# API Gateway must be allowed to invoke Lambda.
# Ignore the error if the permission already exists.

aws lambda add-permission \
  --function-name "$FN" \
  --statement-id apigw-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT}:${API_ID}/*" \
  --region "$REGION" >/dev/null 2>&1 || true

URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com"

# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

echo "==> smoke test"

sleep 3

# Health check
CODE=$(curl -s \
  -o /dev/null \
  -w '%{http_code}' \
  "$URL/health")

# GET preflight
PREFLIGHT_GET=$(curl -s \
  -o /dev/null \
  -w '%{http_code}' \
  -X OPTIONS \
  "$URL/c/cycu/buildings" \
  -H 'Origin: http://localhost:8099' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: content-type')

# DELETE preflight
PREFLIGHT_DELETE=$(curl -s \
  -o /dev/null \
  -w '%{http_code}' \
  -X OPTIONS \
  "$URL/c/cycu/activities/test-activity" \
  -H 'Origin: https://main.d2en9gqqhr4tea.amplifyapp.com' \
  -H 'Access-Control-Request-Method: DELETE' \
  -H 'Access-Control-Request-Headers: content-type')

# Check CORS header for DELETE.
CORS_DELETE=$(curl -sI \
  -X OPTIONS \
  "$URL/c/cycu/activities/test-activity" \
  -H 'Origin: https://main.d2en9gqqhr4tea.amplifyapp.com' \
  -H 'Access-Control-Request-Method: DELETE' \
  -H 'Access-Control-Request-Headers: content-type' \
  | grep -ci 'access-control-allow-origin' || true)

# The one that actually broke the app: a preflight that asks to send
# Authorization. Every signed-in request carries a Bearer token, so if this is
# missing from the response the browser blocks the lot — while every curl check
# above still passes, because curl never preflights.
CORS_AUTH=$(curl -sI \
  -X OPTIONS \
  "$URL/c/cycu/places" \
  -H 'Origin: https://main.d30fnxve3yvk9m.amplifyapp.com' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: content-type,authorization' \
  | grep -i 'access-control-allow-headers' | grep -ci 'authorization' || true)

echo
echo "  API             $URL"
echo "  /health         HTTP $CODE"
echo "  GET preflight   HTTP $PREFLIGHT_GET"
echo "  DELETE preflight HTTP $PREFLIGHT_DELETE"
echo "  auth preflight  $([ "$CORS_AUTH" -gt 0 ] && echo 'authorization allowed' || echo 'MISSING')"

if [ "$PREFLIGHT_GET" = "204" ] &&
   [ "$PREFLIGHT_DELETE" = "204" ] &&
   [ "$CORS_DELETE" -gt 0 ] &&
   [ "$CORS_AUTH" -gt 0 ]; then

  echo "  CORS            GET + DELETE + Authorization pass"

else

  echo "  CORS            FAILS -- browser requests will be blocked"

fi

echo
echo "  Next: set API_BASE in src/api.js to"
echo "        $URL"
echo
echo "  Then: node infra/seed.js   (loads buildings, items and places)"
# ---------------------------------------------------------------------------
# JWT authorizer + admin routes
# ---------------------------------------------------------------------------
#
# Only the admin routes carry the authorizer. Protecting $default would lock
# out guest mode, which the app deliberately supports.
#
# Identity for everything else still comes from the request body — a known
# limitation, documented rather than hidden. Admin is the one place where
# trusting the body would make the whole feature meaningless, so that is where
# the verification lives.

echo "==> JWT authorizer"

POOL_ID=$(aws cognito-idp list-user-pools --max-results 20 --region "$REGION" \
  --query "UserPools[?Name=='freshmanmap-users'].Id | [0]" --output text 2>/dev/null || echo None)
CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" --region "$REGION" \
  --query 'UserPoolClients[0].ClientId' --output text 2>/dev/null || echo None)

if [ "$POOL_ID" != "None" ] && [ "$CLIENT_ID" != "None" ]; then
  AUTH_ID=$(aws apigatewayv2 get-authorizers --api-id "$API_ID" --region "$REGION" \
    --query "Items[?Name=='freshmanmap-jwt'].AuthorizerId | [0]" --output text)

  if [ "$AUTH_ID" = "None" ] || [ -z "$AUTH_ID" ]; then
    AUTH_ID=$(aws apigatewayv2 create-authorizer --api-id "$API_ID" --region "$REGION" \
      --name freshmanmap-jwt --authorizer-type JWT \
      --identity-source '$request.header.Authorization' \
      --jwt-configuration "Audience=${CLIENT_ID},Issuer=https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}" \
      --query AuthorizerId --output text)
    echo "    created $AUTH_ID"
  else
    echo "    exists $AUTH_ID"
  fi

  INTEG=$(aws apigatewayv2 get-integrations --api-id "$API_ID" --region "$REGION" \
    --query 'Items[0].IntegrationId' --output text)

  for RK in "GET /c/{campus}/admin/places" \
            "POST /c/{campus}/admin/places" \
            "POST /c/{campus}/admin/places/{placeId}/verify" \
            "DELETE /c/{campus}/admin/places/{placeId}"; do
    EXISTS=$(aws apigatewayv2 get-routes --api-id "$API_ID" --region "$REGION" \
      --query "Items[?RouteKey=='$RK'].RouteId | [0]" --output text)
    if [ "$EXISTS" = "None" ] || [ -z "$EXISTS" ]; then
      aws apigatewayv2 create-route --api-id "$API_ID" --region "$REGION" \
        --route-key "$RK" --target "integrations/${INTEG}" \
        --authorization-type JWT --authorizer-id "$AUTH_ID" >/dev/null
      echo "    route + $RK"
    fi
  done

  # Group membership is what the Lambda checks. Create it if missing; adding
  # people to it is a deliberate act, not something a deploy should do.
  aws cognito-idp create-group --group-name admins --user-pool-id "$POOL_ID" \
    --region "$REGION" --description "Can add verified places and review submissions" \
    >/dev/null 2>&1 || true
  echo "    admins group ready"
  echo
  echo "  Make someone an admin with:"
  echo "    aws cognito-idp admin-add-user-to-group --user-pool-id $POOL_ID \\"
  echo "      --username <name> --group-name admins --region $REGION"
else
  echo "    skipped — run infra/deploy-auth.sh first"
fi
