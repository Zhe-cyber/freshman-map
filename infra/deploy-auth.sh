#!/usr/bin/env bash
# Create the Cognito user pool for Freshman Map.
#
#   bash infra/deploy-auth.sh
#
# Prints the pool id and app client id. Put the client id into src/auth.js.
# Safe to re-run.
#
# Sign-up auto-confirms via a pre-sign-up trigger: a camp demo cannot ask
# thirty people to go and click an email link. Swap AUTO_CONFIRM to 0 below
# if you want real email verification.

set -euo pipefail

REGION=us-east-1
POOL_NAME=freshmanmap-users
CLIENT_NAME=freshmanmap-web
TRIGGER_FN=freshmanmap-autoconfirm
AUTO_CONFIRM=1

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ROLE="arn:aws:iam::${ACCOUNT}:role/LabRole"

echo "==> user pool"
POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --region "$REGION" \
  --query "UserPools[?Name=='$POOL_NAME'].Id | [0]" --output text)

if [ "$POOL_ID" = "None" ] || [ -z "$POOL_ID" ]; then
  POOL_ID=$(aws cognito-idp create-user-pool \
    --pool-name "$POOL_NAME" \
    --region "$REGION" \
    --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":false,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}}' \
    --schema '[{"Name":"name","AttributeDataType":"String","Mutable":true,"Required":false}]' \
    --query 'UserPool.Id' --output text)
  echo "    created $POOL_ID"
else
  echo "    exists $POOL_ID"
fi

if [ "$AUTO_CONFIRM" = "1" ]; then
  echo "==> auto-confirm trigger"
  BUILD=infra/.build-auth
  rm -rf "$BUILD"; mkdir -p "$BUILD"
  cat > "$BUILD/index.mjs" <<'JS'
// Camp demo: confirm sign-ups immediately instead of emailing a code.
export const handler = async (event) => {
  event.response.autoConfirmUser = true
  if (event.request.userAttributes.email) event.response.autoVerifyEmail = true
  return event
}
JS
  ( cd "$BUILD"
    if command -v zip >/dev/null 2>&1; then zip -q fn.zip index.mjs
    elif command -v powershell >/dev/null 2>&1; then
      powershell -NoProfile -Command "Compress-Archive -Path index.mjs -DestinationPath fn.zip -Force" >/dev/null
    else python -c "import zipfile;zipfile.ZipFile('fn.zip','w',zipfile.ZIP_DEFLATED).write('index.mjs')"; fi )

  if aws lambda get-function --function-name "$TRIGGER_FN" --region "$REGION" >/dev/null 2>&1; then
    aws lambda update-function-code --function-name "$TRIGGER_FN" \
      --zip-file "fileb://$BUILD/fn.zip" --region "$REGION" >/dev/null
  else
    aws lambda create-function --function-name "$TRIGGER_FN" \
      --runtime nodejs20.x --role "$ROLE" --handler index.handler \
      --zip-file "fileb://$BUILD/fn.zip" --region "$REGION" >/dev/null
    aws lambda wait function-active --function-name "$TRIGGER_FN" --region "$REGION"
  fi
  rm -rf "$BUILD"

  TRIGGER_ARN=$(aws lambda get-function --function-name "$TRIGGER_FN" --region "$REGION" \
    --query 'Configuration.FunctionArn' --output text)

  aws lambda add-permission --function-name "$TRIGGER_FN" \
    --statement-id cognito-invoke --action lambda:InvokeFunction \
    --principal cognito-idp.amazonaws.com \
    --source-arn "arn:aws:cognito-idp:${REGION}:${ACCOUNT}:userpool/${POOL_ID}" \
    --region "$REGION" >/dev/null 2>&1 || true

  aws cognito-idp update-user-pool --user-pool-id "$POOL_ID" --region "$REGION" \
    --lambda-config "PreSignUp=$TRIGGER_ARN" \
    --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":false,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}}' >/dev/null
  echo "    attached"
fi

echo "==> app client"
CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" --max-results 60 \
  --region "$REGION" --query "UserPoolClients[?ClientName=='$CLIENT_NAME'].ClientId | [0]" --output text)

if [ "$CLIENT_ID" = "None" ] || [ -z "$CLIENT_ID" ]; then
  # No client secret: this runs in a browser, where a secret cannot be kept.
  CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id "$POOL_ID" --client-name "$CLIENT_NAME" \
    --no-generate-secret \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --region "$REGION" --query 'UserPoolClient.ClientId' --output text)
  echo "    created $CLIENT_ID"
else
  aws cognito-idp update-user-pool-client \
    --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --region "$REGION" >/dev/null
  echo "    exists $CLIENT_ID"
fi

echo
echo "  pool      $POOL_ID"
echo "  client    $CLIENT_ID"
echo
echo "  Put this in src/auth.js:"
echo "        const CLIENT_ID = '$CLIENT_ID'"
