// Login gate. Shown over everything until there is a session.
// On success we reload rather than plumb reactive auth state through every
// module — the app reads `user` from api.js once at start-up.

import { signIn, signUp, isSignedIn, signOut, currentUser, refresh, readableError } from './auth.js'
import { t } from './i18n.js'

let mode = 'in'          // 'in' | 'up'

export async function initLogin() {
  const gate = document.getElementById('login')

  // Cognito id tokens last an hour. Without this the gate slams over the whole
  // app the moment one expires, which looks like the app has gone blank.
  // The refresh token is good for 30 days, so renew silently and stay in.
  if (!isSignedIn() && currentUser()?.expired) await refresh()

  if (isSignedIn()) { gate.hidden = true; return }
  gate.hidden = false
  try {
    render()
  } catch (err) {
    // Never leave an empty full-screen overlay: falling through to the app
    // beats a blank page, since the device identity still works.
    console.error('[Freshman Map] login failed to render', err)
    gate.hidden = true
  }
}

function render() {
  const up = mode === 'up'
  document.getElementById('login').innerHTML = `
    <div class="loginbox">
      <div class="loginhead">
        <div class="loginmark">🐣</div>
        <h1>${t('appName')}</h1>
        <p>${t('loginTagline')}</p>
      </div>

      <form id="loginform" novalidate>
        <div class="field">
          <label for="lg-user">${t('loginUsername')}</label>
          <input id="lg-user" type="text" autocomplete="username" autocapitalize="none" maxlength="40" required>
        </div>
        ${up ? `<div class="field">
          <label for="lg-name">${t('loginName')}</label>
          <input id="lg-name" type="text" autocomplete="name" maxlength="40">
        </div>` : ''}
        <div class="field">
          <label for="lg-pass">${t('loginPassword')}</label>
          <input id="lg-pass" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" minlength="8" required>
          ${up ? `<div class="hint">${t('loginPasswordHint')}</div>` : ''}
        </div>
        ${up ? `<div class="field">
          <label for="lg-pass2">${t('loginConfirm')}</label>
          <input id="lg-pass2" type="password" autocomplete="new-password" minlength="8" required>
        </div>` : ''}

        <div class="loginerr" id="lg-err" hidden></div>

        <button class="btn go wide" type="submit" id="lg-go">
          ${up ? t('loginCreate') : t('loginSignIn')}
        </button>
      </form>

      <button class="linkbtn" id="lg-swap">
        ${up ? t('loginHaveAccount') : t('loginNoAccount')}
      </button>
      <button class="linkbtn quiet" id="lg-guest">${t('loginGuest')}</button>
    </div>`

  document.getElementById('lg-swap').onclick = () => { mode = up ? 'in' : 'up'; render() }
  document.getElementById('lg-guest').onclick = () => {
    document.getElementById('login').hidden = true      // device identity keeps working
  }
  document.getElementById('loginform').onsubmit = submit
}

async function submit(e) {
  e.preventDefault()
  const btn = document.getElementById('lg-go')
  const err = document.getElementById('lg-err')
  const username = document.getElementById('lg-user').value.trim()
  const password = document.getElementById('lg-pass').value
  const name = document.getElementById('lg-name')?.value.trim()

  err.hidden = true
  if (!username || password.length < 8) {
    err.textContent = t('loginPasswordHint'); err.hidden = false; return
  }
  // Checked here rather than left to Cognito: a typo in a new password locks
  // you out of an account you cannot reset, because no account has an email
  // on file for a reset code to go to.
  if (mode === 'up' && password !== document.getElementById('lg-pass2').value) {
    err.textContent = t('errPasswordMismatch'); err.hidden = false; return
  }

  btn.disabled = true
  btn.textContent = t('loginWorking')
  try {
    if (mode === 'up') await signUp(username, password, name || username)
    else await signIn(username, password)
    location.reload()
  } catch (e2) {
    err.textContent = t(readableError(e2))
    err.hidden = false
    btn.disabled = false
    btn.textContent = mode === 'up' ? t('loginCreate') : t('loginSignIn')
  }
}

// Sign-out lives on the profile screen. It used to hang off the profile chip
// in the map HUD; that chip is gone, and an app you cannot sign out of is
// worse than one with a plain button in the obvious place.
//
// The profile screen re-renders on save and on a language change, so this is
// bound by delegation rather than to an element that will be replaced.
export function wireSignOut() {
  document.getElementById('s-me')?.addEventListener('click', event => {
    if (!event.target.closest('#pf-signout')) return
    if (!isSignedIn()) return
    if (confirm(t('loginSignOutConfirm'))) { signOut(); location.reload() }
  })
}
