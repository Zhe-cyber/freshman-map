// Login gate. Shown over everything until there is a session.
// On success we reload rather than plumb reactive auth state through every
// module — the app reads `user` from api.js once at start-up.

import { signIn, signUp, isSignedIn, signOut, currentUser, readableError } from './auth.js'
import { t } from './i18n.js'

let mode = 'in'          // 'in' | 'up'

export function initLogin() {
  const gate = document.getElementById('login')
  if (isSignedIn()) { gate.hidden = true; return }
  gate.hidden = false
  render()
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

// Sign-out lives on the profile chip in the map HUD.
export function wireSignOut() {
  const badge = document.querySelector('.badge')
  if (!badge) return
  badge.style.cursor = 'pointer'
  badge.title = t('loginSignOut')
  badge.onclick = () => {
    if (!isSignedIn()) return
    if (confirm(t('loginSignOutConfirm'))) { signOut(); location.reload() }
  }
  const u = currentUser()
  const label = badge.querySelector('.lvl small')
  if (u && label) label.textContent = u.name
}
