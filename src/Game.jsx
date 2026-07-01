import { useState, useEffect, useRef, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { COUNTRIES, NAME_COUNTRIES, CONTINENTS, matchCountry, TOTAL_COUNTRIES } from './countries'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const GAME_DURATION = 15 * 60
const MAX_PAUSES = 3

export default function Game({ theme, onEnd, nickname }) {
  const [guessed, setGuessed] = useState(new Set())
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [flash, setFlash] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [giveUp, setGiveUp] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [completionTime, setCompletionTime] = useState(null)
  const [paused, setPaused] = useState(false)
  const [pausesLeft, setPausesLeft] = useState(MAX_PAUSES)
  const [modalOpen, setModalOpen] = useState(true)
  const [tooltip, setTooltip] = useState(null) // { name, x, y, guessed }
  const [sharing, setSharing] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const inputRef = useRef(null)
  const timeLeftRef = useRef(GAME_DURATION)
  const total = TOTAL_COUNTRIES

  useEffect(() => { timeLeftRef.current = timeLeft }, [timeLeft])

  useEffect(() => {
    if (gameOver || paused) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setGameOver(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [gameOver, paused])

  useEffect(() => { if (!paused) inputRef.current?.focus() }, [paused])

  function reset() {
    setGuessed(new Set())
    setInput('')
    setTimeLeft(GAME_DURATION)
    setFlash(false)
    setGameOver(false)
    setGiveUp(false)
    setCompleted(false)
    setCompletionTime(null)
    setPaused(false)
    setPausesLeft(MAX_PAUSES)
    setModalOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const handleInput = useCallback((e) => {
    const val = e.target.value
    setInput(val)
    const code = matchCountry(val, guessed)
    if (code) {
      setGuessed(prev => {
        const next = new Set([...prev, code])
        if (next.size === total) {
          setCompleted(true)
          setCompletionTime(GAME_DURATION - timeLeftRef.current)
          setGameOver(true)
          setModalOpen(true)
        }
        return next
      })
      setInput('')
      setFlash(true)
      setTimeout(() => setFlash(false), 400)
    }
  }, [guessed, total])

  async function handleSave() {
    if (sharing) return
    setSharing(true)
    try {
      const pct = Math.round((guessed.size / total) * 100)
      const W = 800, H = 420, s = 2

      const canvas = document.createElement('canvas')
      canvas.width = W * s
      canvas.height = H * s
      const ctx = canvas.getContext('2d')
      ctx.scale(s, s)

      // Arka plan
      const grad = ctx.createLinearGradient(0, 0, W, H)
      grad.addColorStop(0, '#1e3a8a')
      grad.addColorStop(1, '#2563eb')
      ctx.fillStyle = grad
      roundRect(ctx, 0, 0, W, H, 0)
      ctx.fill()

      // İç kart (hafif)
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      roundRect(ctx, 36, 36, W - 72, H - 72, 20)
      ctx.fill()

      ctx.textAlign = 'center'
      const cx = W / 2

      // Branding
      ctx.font = '600 17px "Segoe UI", system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText('🌍 Ülke Say', cx, 84)

      // Kullanıcı adı
      ctx.font = '700 34px "Segoe UI", system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.88)'
      ctx.fillText(nickname, cx, 158)

      // Skor
      ctx.font = '900 92px "Segoe UI", system-ui, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(`${guessed.size} / ${total}`, cx, 282)

      // Yüzde
      ctx.font = '600 26px "Segoe UI", system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.68)'
      ctx.fillText(`%${pct} başarı`, cx, 342)

      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ulkesay-${nickname}-${guessed.size}.png`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setSharing(false)
    }
  }

  function handleGiveUp() {
    setGiveUp(true)
    setGameOver(true)
    setModalOpen(true)
  }

  function togglePause() {
    if (gameOver) return
    if (paused) {
      setPaused(false)
    } else {
      if (pausesLeft <= 0) return
      setPausesLeft(p => p - 1)
      setPaused(true)
    }
  }

  function getFill(geoId, geoName) {
    if (geoId) {
      const id = String(geoId).padStart(3, '0')
      if (guessed.has(id)) return '#22c55e'
      if (gameOver && COUNTRIES[id]) return '#ef4444'
    } else if (geoName && NAME_COUNTRIES[geoName]) {
      if (guessed.has(geoName)) return '#22c55e'
      if (gameOver) return '#ef4444'
    }
    return theme === 'dark' ? '#334155' : '#cbd5e1'
  }

  const isUrgent = timeLeft <= 60 && !gameOver

  return (
    <div className="game-wrapper">
      {/* Topbar — always visible */}
      <div className="game-topbar">
        <div className="game-stats">
          <div className="stat-box">
            <span className={`stat-value timer ${isUrgent ? 'urgent' : ''}`}>
              {formatTime(timeLeft)}
            </span>
            <span className="stat-label">Süre</span>
          </div>
          <div className="stat-box">
            <span className="stat-value count">{guessed.size}</span>
            <span className="stat-label">Bulundu</span>
          </div>
          <div className="stat-box">
            <span className="stat-value" style={{ color: 'var(--text2)' }}>{total - guessed.size}</span>
            <span className="stat-label">Kalan</span>
          </div>
        </div>

        {!gameOver && (
          <div className="game-input-row">
            <input
              ref={inputRef}
              className={`input-field ${flash ? 'correct-flash' : ''}`}
              placeholder={paused ? 'Oyun duraklatıldı...' : 'Ülke adı gir...'}
              value={input}
              onChange={handleInput}
              disabled={paused}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className="btn btn-outline"
              onClick={togglePause}
              disabled={!paused && pausesLeft <= 0}
              title={paused ? 'Oyuna devam et' : `Oyunu duraklat (${pausesLeft} hak kaldı)`}
            >
              {paused ? '▶️ Devam Et' : `⏸️ Duraklat (${pausesLeft})`}
            </button>
            <button className="btn btn-danger" onClick={handleGiveUp} disabled={paused}>
              🏳️ Pes Et
            </button>
          </div>
        )}

        <div className="topbar-actions">
          <button className="btn btn-outline" onClick={reset} title="Oyunu sıfırla">
            ↺ Sıfırla
          </button>
          <button className="btn btn-outline" onClick={() => onEnd(guessed.size, total, completed, completionTime)} title="Ana menüye dön">
            ⌂ Ana Menü
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="map-container">
        <ComposableMap
          projectionConfig={{ scale: 147, center: [0, 10] }}
          style={{ width: '100%', height: '100%', flex: 1 }}
        >
          <ZoomableGroup zoom={1} minZoom={0.5} maxZoom={8}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const id = geo.id ? String(geo.id).padStart(3, '0') : null
                  const geoName = geo.properties?.name
                  const country = (id && COUNTRIES[id]) || (geoName && NAME_COUNTRIES[geoName])
                  const key = id || geoName
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getFill(geo.id, geoName)}
                      stroke="#fff"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none', transition: 'fill 0.35s' },
                        hover:   { outline: 'none', opacity: 0.85 },
                        pressed: { outline: 'none' },
                      }}
                      onMouseEnter={country ? (e) => setTooltip({
                        name: gameOver || guessed.has(key) ? country.tr : '?',
                        x: e.clientX,
                        y: e.clientY,
                        isGuessed: guessed.has(key),
                        isMissed: gameOver && !guessed.has(key),
                      }) : undefined}
                      onMouseMove={country ? (e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : t) : undefined}
                      onMouseLeave={country ? () => setTooltip(null) : undefined}
                    />
                  )
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {tooltip && (
          <div
            className={`map-tooltip ${tooltip.isGuessed ? 'guessed' : tooltip.isMissed ? 'missed' : ''}`}
            style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
          >
            {tooltip.name}
          </div>
        )}
      </div>

      {/* Continent lists */}
      <div className={`continent-wrapper${panelOpen ? '' : ' panel-closed'}`}>
        <button className="continent-toggle-btn" onClick={() => setPanelOpen(p => !p)}>
          <span>Kıtalar</span>
          <span className="toggle-arrow">{panelOpen ? '▾' : '▴'}</span>
        </button>
        <ContinentLists guessed={guessed} gameOver={gameOver} />
      </div>

      {/* Pause overlay */}
      {paused && !gameOver && (
        <div className="result-overlay">
          <div className="result-card">
            <div className="result-title">⏸️ Oyun Duraklatıldı</div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text2)' }}>
              Kalan duraklatma hakkın: {pausesLeft}/{MAX_PAUSES}
            </p>
            <div className="result-btn-row">
              <button className="btn btn-primary" onClick={togglePause}>
                ▶️ Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result overlay */}
      {gameOver && modalOpen && (
        <div className="result-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="result-card">
            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            <div className="result-title">
              {completed ? '🎉 Tüm Ülkeler Bulundu!' : giveUp ? '🏳️ Pes Ettin' : '⏰ Süre Doldu!'}
            </div>
            <div className="result-score">{guessed.size}/{total}</div>
            <div className="result-pct">%{Math.round((guessed.size / total) * 100)} ülke bulundu</div>
            {completed && (
              <div className="result-pct" style={{ color: 'var(--accent)' }}>
                ⏱️ Tamamlama süresi: {formatTime(completionTime)}
              </div>
            )}
            <div style={{ fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.6 }}>
              {getMedalText(guessed.size, total)}
            </div>
            <div className="result-btn-row">
              <button className="btn btn-primary" onClick={handleSave} disabled={sharing}>
                {sharing ? '⏳ Hazırlanıyor...' : '🏅 Başarımı Kaydet'}
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>
              Yeni oyun veya menü için sağ üstteki butonları kullan.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ContinentLists({ guessed, gameOver }) {
  // Tüm ülkeleri kıtaya göre grupla ve alfabetik sırala
  const allByContinent = {}
  CONTINENTS.forEach(c => { allByContinent[c.key] = [] })

  for (const [code, country] of Object.entries(COUNTRIES)) {
    allByContinent[country.continent].push({ code, tr: country.tr })
  }
  for (const [name, country] of Object.entries(NAME_COUNTRIES)) {
    allByContinent[country.continent].push({ code: name, tr: country.tr })
  }
  CONTINENTS.forEach(c => {
    allByContinent[c.key].sort((a, b) => a.tr.localeCompare(b.tr, 'tr'))
  })

  return (
    <div className="continent-panel">
      {CONTINENTS.map(cont => {
        const all = allByContinent[cont.key]
        const found = all.filter(c => guessed.has(c.code)).length
        return (
          <div key={cont.key} className="continent-col">
            <div className="continent-header" style={{ borderColor: cont.color }}>
              <span className="continent-name" style={{ color: cont.color }}>{cont.label}</span>
              <span className="continent-count">{found}/{all.length}</span>
            </div>
            <ul className="continent-list">
              {all.map(({ code, tr }) => {
                const isFound = guessed.has(code)
                const isMissed = gameOver && !isFound
                return (
                  <li key={code} className={`country-item ${isFound ? 'found' : isMissed ? 'missed' : 'empty'}`}>
                    {isFound || isMissed ? tr : ''}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function getMedalText(score, total) {
  const pct = (score / total) * 100
  if (pct >= 90) return '🥇 Muhteşem! Gerçek bir coğrafya uzmanısın!'
  if (pct >= 70) return '🥈 Harika iş! Coğrafya bilgin çok iyi.'
  if (pct >= 50) return '🥉 Fena değil! Biraz daha pratikle üste çıkarsın.'
  if (pct >= 30) return '📚 İyi başlangıç, öğrenmeye devam et!'
  return '🌍 Dünya büyük, keşfetmeye devam!'
}
