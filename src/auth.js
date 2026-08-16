// Cognito auth by plain fetch — no SDK, because this project has no build step.
// The Cognito API is just JSON over POST with an X-Amz-Target header, and the
// public client has no secret, so nothing here needs signing.

const REGION = 'us-east-1'
const CLIENT_ID = '2an9iv5f3c9hvsq3hjikidjtbn'
const ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`
const KEY = 'freshmanmap.auth'

async function cognito(action, payload) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': `AWSCognitoIdentityProviderService.${action}`
    },
    body: JSON.stringify(payload)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.__type || `${action} failed`)
  return data
}

// --- session -------------------------------------------------------------

function save(session) {
  localStorage.setItem(KEY, JSON.stringify(session))
  return session
}

// JWT payloads are base64url and often unpadded; some browsers' atob is
// stricter than others about that, so pad before decoding.
function decodeSegment(seg) {
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(b64 + '='.repeat((4 - b64.length % 4) % 4)))
}

export function currentUser() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (!s?.idToken) return null
    // The id token is a JWT; its payload carries sub and the name we set.
    const claims = decodeSegment(s.idToken.split('.')[1])
    if (claims.exp * 1000 < Date.now()) return { ...s, expired: true }
    return { userId: claims.sub, name: claims.name || s.username, username: s.username }
  } catch { return null }
}

export const isSignedIn = () => !!currentUser() && !currentUser().expired

// --- actions -------------------------------------------------------------

export async function signUp(username, password, name) {
  await cognito('SignUp', {
    ClientId: CLIENT_ID,
    Username: username,
    Password: password,
    UserAttributes: name ? [{ Name: 'name', Value: name }] : []
  })
  return signIn(username, password)          // pre-sign-up trigger auto-confirms
}

export async function signIn(username, password) {
  const r = await cognito('InitiateAuth', {
    ClientId: CLIENT_ID,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: username, PASSWORD: password }
  })
  const a = r.AuthenticationResult
  if (!a) throw new Error('Unexpected challenge: ' + (r.ChallengeName || 'unknown'))
  save({ username, idToken: a.IdToken, accessToken: a.AccessToken, refreshToken: a.RefreshToken })
  return currentUser()
}

export async function refresh() {
  const s = JSON.parse(localStorage.getItem(KEY) || 'null')
  if (!s?.refreshToken) return null
  try {
    const r = await cognito('InitiateAuth', {
      ClientId: CLIENT_ID,
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: { REFRESH_TOKEN: s.refreshToken }
    })
    const a = r.AuthenticationResult
    save({ ...s, idToken: a.IdToken, accessToken: a.AccessToken })
    return currentUser()
  } catch { signOut(); return null }
}

export function signOut() {
  localStorage.removeItem(KEY)
}

// Friendlier text than Cognito's raw errors, which leak internals.
export function readableError(err) {
  const m = String(err.message || err)
  if (/UsernameExistsException|already exists/i.test(m)) return 'errUserExists'
  if (/NotAuthorizedException|Incorrect username/i.test(m)) return 'errWrongPassword'
  if (/UserNotFoundException/i.test(m)) return 'errNoUser'
  if (/InvalidPasswordException|password/i.test(m)) return 'errWeakPassword'
  if (/InvalidParameterException/i.test(m)) return 'errInvalidInput'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'errNetwork'
  return 'errGeneric'
}
