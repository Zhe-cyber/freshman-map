// Restaurant + entertainment shortcut screen.
import { DIET, MOCK } from './data.js'
import { getPlaces, me, metres, navTo, score, tone, toneText } from './api.js'
import { localName, onLanguageChange, secondaryName, t } from './i18n.js'

const CUISINES = [
  'nightMarket', 'vegetarian', 'malaysian', 'indonesian',
  'vietnamese', 'thai', 'taiwanese', 'dessert', 'other'
]
const PRICES = ['all', 1, 2, 3]
const VENUE_KINDS = ['arcade', 'ktv', 'billiards', 'mall']

const cuisineById = new Map(
  MOCK.places.filter(place => place.type === 'food')
    .map(place => [place.placeId, place.cuisine || 'other'])
)

let places = []
let currentView = 'food'
let currentCuisine = 'all'
let currentPrice = 'all'
let currentVenue = 'all'

const html = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

const cuisineOf = place => place.cuisine || cuisineById.get(place.placeId) || 'other'

export async function initFood() {
  places = await getPlaces()
  render()
  onLanguageChange(render)
}

function render() {
  renderTabs()
  renderFilters()
  currentView === 'food' ? renderRestaurants() : renderEntertainment()
}

function renderTabs() {
  const tabs = document.getElementById('explore-tabs')
  tabs.innerHTML = [
    ['food', '🍜', 'restaurantTab'],
    ['entertainment', '🎮', 'entertainmentTab']
  ].map(([view, icon, label]) => `
    <button type="button" role="tab" data-view="${view}"
      aria-selected="${currentView === view}" class="${currentView === view ? 'on' : ''}">
      <span>${icon}</span>${html(t(label))}
    </button>`).join('')

  tabs.querySelectorAll('[data-view]').forEach(button => {
    button.onclick = () => {
      currentView = button.dataset.view
      render()
    }
  })
}

function renderFilters() {
  const filters = document.getElementById('fchips')
  if (currentView === 'food') {
    const available = new Set(places.filter(place => place.type === 'food').map(cuisineOf))
    const cuisineChoices = CUISINES.filter(cuisine => available.has(cuisine))
    filters.innerHTML = filterGroup(
      t('cuisineFilter'),
      [['all', t('filterAll')], ...cuisineChoices.map(cuisine => [cuisine, t(`cuisine.${cuisine}`)])],
      currentCuisine,
      'cuisine'
    ) + filterGroup(
      t('priceFilter'),
      PRICES.map(price => [String(price), price === 'all' ? t('filterAll') : t(`price.${price}`)]),
      String(currentPrice),
      'price'
    )
  } else {
    filters.innerHTML = filterGroup(
      t('venueFilter'),
      [['all', t('filterAll')], ...VENUE_KINDS.map(kind => [kind, t(`venue.${kind}`)])],
      currentVenue,
      'venue'
    )
  }

  filters.querySelectorAll('[data-cuisine]').forEach(button => {
    button.onclick = () => { currentCuisine = button.dataset.cuisine; render() }
  })
  filters.querySelectorAll('[data-price]').forEach(button => {
    button.onclick = () => {
      currentPrice = button.dataset.price === 'all' ? 'all' : Number(button.dataset.price)
      render()
    }
  })
  filters.querySelectorAll('[data-venue]').forEach(button => {
    button.onclick = () => { currentVenue = button.dataset.venue; render() }
  })
}

function filterGroup(label, choices, selected, attribute) {
  return `<div class="filter-group">
    <div class="filter-label">${html(label)}</div>
    <div class="chips">${choices.map(([value, text]) => `
      <button type="button" class="chip" data-${attribute}="${html(value)}"
        data-on="${String(value) === String(selected) ? 1 : 0}">${html(text)}</button>`).join('')}
    </div>
  </div>`
}

function renderRestaurants() {
  const list = places
    .filter(place => place.type === 'food')
    .filter(place => currentCuisine === 'all' || cuisineOf(place) === currentCuisine)
    .filter(place => currentPrice === 'all' || place.price === currentPrice)
    .sort((a, b) => score(b) - score(a))

  const output = document.getElementById('flist')
  if (!list.length) {
    output.innerHTML = `<div class="card empty">${html(t('noRestaurants'))}</div>`
    return
  }

  output.innerHTML = list.map(place => {
    const rating = score(place)
    return `<div class="card place-card restaurant-card" data-place="${place.placeId}"
      role="link" tabindex="0" aria-label="${html(t('navigateTo', { place: localName(place) }))}">
      <div class="frow">
        <div class="fic">${place.icon}</div>
        <div class="place-main">
          <div class="fname">${html(localName(place))}</div>
          <div class="fsub">${html(secondaryName(place))}</div>
          <div class="tags">${foodTags(place)}</div>
        </div>
      </div>
      <div class="fmeta">
        <span>🚶 ${html(t('distanceMetres', { count: metres(me, place) }))}</span>
        <span class="eng" style="background:${tone(rating)}22;color:${toneText(rating)}">
          ${html(t('orderEnglish'))} ${Math.round(rating / 10)}/10
        </span>
      </div>
      ${navigateRow()}
    </div>`
  }).join('')
  bindNavigation(list)
}

function renderEntertainment() {
  const list = places
    .filter(place => place.type === 'entertainment')
    .filter(place => currentVenue === 'all' || place.venueKind === currentVenue)
    .sort((a, b) => metres(me, a) - metres(me, b))

  const output = document.getElementById('flist')
  if (!list.length) {
    output.innerHTML = `<div class="card empty">${html(t('noEntertainment'))}</div>`
    return
  }

  output.innerHTML = list.map(place => `
    <div class="card place-card entertainment-card" data-place="${place.placeId}"
      role="link" tabindex="0" aria-label="${html(t('navigateTo', { place: localName(place) }))}">
      <div class="frow">
        <div class="fic">${place.icon}</div>
        <div class="place-main">
          <div class="fname">${html(localName(place))}</div>
          <div class="fsub">${html(secondaryName(place))}</div>
          <div class="tags"><span class="tag t-entertainment">${html(t(`venue.${place.venueKind}`))}</span></div>
        </div>
      </div>
      <div class="fmeta"><span>🚶 ${html(t('distanceMetres', { count: metres(me, place) }))}</span></div>
      ${navigateRow()}
    </div>`).join('')
  bindNavigation(list)
}

function foodTags(place) {
  const dietTags = (place.diet || [])
    .filter(diet => DIET[diet])
    .map(diet => `<span class="tag ${DIET[diet][1]}">${html(t(`diet.${diet}`))}</span>`)
    .join('')
  return `<span class="tag t-cuisine">${html(t(`cuisine.${cuisineOf(place)}`))}</span>` +
    `<span class="tag t-price">${html(t(`price.${place.price || 1}`))}</span>` +
    dietTags + (place.cash ? `<span class="tag t-cash">${html(t('cash'))}</span>` : '')
}

const navigateRow = () => `<div class="card-nav">
  <span>🧭 ${html(t('navigateGoogle'))}</span><span aria-hidden="true">›</span>
</div>`

function bindNavigation(list) {
  const byId = new Map(list.map(place => [place.placeId, place]))
  document.getElementById('flist').querySelectorAll('[data-place]').forEach(card => {
    const go = () => {
      const place = byId.get(card.dataset.place)
      if (place) navTo(place.lat, place.lng)
    }
    card.onclick = go
    card.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        go()
      }
    }
  })
}
