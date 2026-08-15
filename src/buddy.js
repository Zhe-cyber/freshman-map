// OWNER: B — BuddyUp screen only.

import {
  getActivities,
  joinActivity,
  createActivity,
  deleteActivity,
  user
} from './api.js'

import { toast } from './ui.js'
import {
  localText,
  onLanguageChange,
  t
} from './i18n.js'

// ---------------------------------------------------------------------------
// Small safety helpers
// ---------------------------------------------------------------------------

const safeText = value =>
  value == null || value === ''
    ? ''
    : String(value)

const activityTitle = a =>
  safeText(a.title || 'Untitled activity')

const activityWhen = a =>
  safeText(a.when || '')

const activityPlace = a =>
  safeText(a.place || '')

const activityHost = a =>
  safeText(a.hostName || 'Unknown')

// ---------------------------------------------------------------------------
// Main BuddyUp screen
// ---------------------------------------------------------------------------

export async function initBuddy() {
  const newButton =
    document.getElementById('newact')

  if (newButton) {
    newButton.onclick = async () => {
      const title = prompt(
        t('activityPrompt'),
        t('activityExample')
      )

      if (!title?.trim()) {
        return
      }

      try {
        await createActivity(title.trim())

        await render()

        toast(
          t('activityCreated')
        )
      } catch (err) {
        console.error(err)

        toast(
          err?.message ||
          'Failed to create activity'
        )
      }
    }
  }

  onLanguageChange(render)

  await render()
}

// ---------------------------------------------------------------------------
// Render activity list
// ---------------------------------------------------------------------------

async function render() {
  const el =
    document.getElementById('blist')

  if (!el) {
    return
  }

  try {
    const list = await getActivities()

    if (!Array.isArray(list)) {
      el.innerHTML = ''
      return
    }

    el.innerHTML = list.map(a => {

      const capacity =
        Number(a.capacity) || 4

      const joined =
        Math.max(
          0,
          Number(a.joined) || 0
        )

      const full =
        joined >= capacity

      const joinedByMe =
        Boolean(a.joinedByMe)

      // The activity creator is stored in a.userId.
      const isCreator =
        Boolean(
          user?.userId &&
          a.userId &&
          a.userId === user.userId
        )

      // ---------------------------------------------------------------
      // Seats
      // ---------------------------------------------------------------

      const seats =
        Array.from(
          { length: capacity },
          (_, i) =>
            `<div class="seat${i < joined ? ' on' : ''}">${
              i < joined ? '🙂' : ''
            }</div>`
        ).join('')

      // ---------------------------------------------------------------
      // Join button
      // ---------------------------------------------------------------

      const joinClass =
        joinedByMe
          ? 'done'
          : full
            ? 'full'
            : ''

      const joinLabel =
        joinedByMe
          ? t('joined')
          : full
            ? t('full')
            : t('join')

      const joinDisabled =
        full && !joinedByMe
          ? ' disabled'
          : ''

      // ---------------------------------------------------------------
      // Delete button
      //
      // Only creator sees this.
      // ---------------------------------------------------------------

      const deleteButton =
        isCreator
          ? `
            <button
              type="button"
              class="abtn delete"
              data-delete="${safeText(a.activityId)}"
            >
              🗑 刪除
            </button>
          `
          : ''

      // ---------------------------------------------------------------
      // Render card
      // ---------------------------------------------------------------

      const title =
        safeText(
          localText(
            activityTitle(a)
          )
        )

      const when =
        safeText(
          localText(
            activityWhen(a)
          )
        )

      const place =
        safeText(
          localText(
            activityPlace(a)
          )
        )

      const host =
        activityHost(a)

      const subInfo =
        [when, place]
          .filter(Boolean)
          .join(' · ')

      return `
        <div class="card">

          <div class="arow">

            <div class="aic">
              ${safeText(a.icon || '🎉')}
            </div>

            <div style="flex:1">

              <div class="fname">
                ${title}
              </div>

              ${
                subInfo
                  ? `
                    <div class="fsub">
                      ${subInfo}
                    </div>
                  `
                  : ''
              }

              <div class="fsub">
                ${t('by', { name: host })}
              </div>

            </div>

            <div class="aactions">

              <button
                type="button"
                class="abtn ${joinClass}"
                data-join="${safeText(a.activityId)}"
                ${joinDisabled}
              >
                ${joinLabel}
              </button>

              ${deleteButton}

            </div>

          </div>

          <div class="seats">
            ${seats}
            <span class="count">
              ${joined} / ${capacity}
            </span>
          </div>

        </div>
      `
    }).join('')

    // ---------------------------------------------------------------------
    // JOIN / LEAVE buttons
    // ---------------------------------------------------------------------

    el
      .querySelectorAll('[data-join]')
      .forEach(button => {

        button.onclick = async () => {

          const activityId =
            button.dataset.join

          if (!activityId) {
            return
          }

          button.disabled = true

          try {
            const result =
              await joinActivity(
                activityId
              )

            await render()

            if (result?.full) {
              toast(
                t('activityFull')
              )
            } else if (
              result?.joinedByMe
            ) {
              toast(
                result.joined >= result.capacity
                  ? t('joinSuccessFull')
                  : t('joinSuccess')
              )
            } else {
              toast(
                t('activityLeft')
              )
            }

          } catch (err) {
            console.error(err)

            await render()

            toast(
              err?.message ||
              'Unable to join activity'
            )
          }
        }
      })

    // ---------------------------------------------------------------------
    // DELETE buttons
    // ---------------------------------------------------------------------

    el
      .querySelectorAll('[data-delete]')
      .forEach(button => {

        button.onclick = async () => {

          const activityId =
            button.dataset.delete

          if (!activityId) {
            return
          }

          const confirmed =
            confirm(
              '確定要刪除這個活動嗎？\n\nDelete this activity?'
            )

          if (!confirmed) {
            return
          }

          button.disabled = true

          try {

            await deleteActivity(
              activityId
            )

            await render()

            toast(
              '活動已刪除'
            )

          } catch (err) {

            console.error(err)

            button.disabled = false

            toast(
              err?.message ||
              'Unable to delete activity'
            )
          }
        }
      })

  } catch (err) {

    console.error(err)

    el.innerHTML = `
      <div class="card">
        <div class="fsub">
          Unable to load activities.
        </div>
      </div>
    `
  }
}