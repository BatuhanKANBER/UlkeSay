import { useState, useEffect, useRef, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import html2canvas from 'html2canvas'
import { COUNTRIES, NAME_COUNTRIES, CONTINENTS, matchCountry, TOTAL_COUNTRIES } from './countries'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const GAME_DURATION = 15 * 60

export default function Game({ theme, onEnd }) {
  const [guessed, setGuessed] = useState(new Set())
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [flash, setFlash] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [giveUp, setGiveUp] = useState(false)
  const [modalOpen, setModalOpen] = useState(true)
  const [tooltip, setTooltip] = useState(null) // { name, x, y, guessed }
  const [sharing, setSharing] = useState(false)
  const inputRef = useRef(null)
  const mapRef = useRef(null)
  const total = TOTAL_COUNTRIES

  useEffect(() => {
    if (gameOver) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setGameOver(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [gameOver])

  useEffect(() => { inputRef.current?.focus() }, [])

  function reset() {
    setGuessed(new Set())
    setInput('')
    setTimeLeft(GAME_DURATION)
    setFlash(false)
    setGameOver(false)
    setGiveUp(false)
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
      setGuessed(prev => new Set([...prev, code]))
      setInput('')
      setFlash(true)
      setTimeout(() => setFlash(false), 400)
    }
  }, [guessed])

  async function handleShare() {
    if (!mapRef.current || sharing) return
    setSharing(true)
    try {
      const canvas = await html2canvas(mapRef.current, {
        useCORS: true,
        backgroundColor: theme === 'dark' ? '#0f172a' : '#f0f4f8',
        scale: 2,
      })

      // Score overlay — tüm değerler canvas scale'iyle orantılı
      const ctx = canvas.getContext('2d')
      const w = canvas.width
      const h = canvas.height
      const s = 2 // html2canvas scale
      const pct = Math.round((guessed.size / total) * 100)

      const pillW = 360 * s
      const pillH = 90 * s
      const pillX = (w - pillW) / 2
      const pillY = h - pillH - 28 * s

      ctx.fillStyle = 'rgba(0,0,0,0.62)'
      roundRect(ctx, pillX, pillY, pillW, pillH, 18 * s)
      ctx.fill()

      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.font = `900 ${34 * s}px "Segoe UI", system-ui, sans-serif`
      ctx.fillText(`${guessed.size} / ${total}`, w / 2, pillY + 46 * s)

      ctx.font = `600 ${15 * s}px "Segoe UI", system-ui, sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillText(`%${pct} başarı  ·  🌍 Ülke Say`, w / 2, pillY + 72 * s)

      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'ulkesay.png', { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], 'ulkesay.png', { type: 'image/png' })],
          title: 'Ülke Say',
          text: `${guessed.size}/${total} ülke buldum! 🌍`,
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ulkesay-${guessed.size}-${total}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setSharing(false)
    }
  }

  function handleGiveUp() {
    setGiveUp(true)
    setGameOver(true)
    setModalOpen(true)
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
          <div className="game-input-wrap">
            <input
              ref={inputRef}
              className={`input-field ${flash ? 'correct-flash' : ''}`}
              placeholder="Ülke adı gir..."
              value={input}
              onChange={handleInput}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        {!gameOver && (
          <button className="btn btn-danger" onClick={handleGiveUp}>
            🏳️ Pes Et
          </button>
        )}

        <div className="topbar-actions">
          <button className="btn btn-outline" onClick={reset} title="Oyunu sıfırla">
            ↺ Sıfırla
          </button>
          <button className="btn btn-outline" onClick={() => onEnd(guessed.size, total)} title="Ana menüye dön">
            ⌂ Ana Menü
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="map-container" ref={mapRef}>
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
      <ContinentLists guessed={guessed} gameOver={gameOver} />

      {/* Result overlay */}
      {gameOver && modalOpen && (
        <div className="result-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="result-card">
            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            <div className="result-title">{giveUp ? '🏳️ Pes Ettin' : '⏰ Süre Doldu!'}</div>
            <div className="result-score">{guessed.size}/{total}</div>
            <div className="result-pct">%{Math.round((guessed.size / total) * 100)} ülke bulundu</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.6 }}>
              {getMedalText(guessed.size, total)}
            </div>
            <div className="result-btn-row">
              <button className="btn btn-primary" onClick={handleShare} disabled={sharing}>
                {sharing ? '⏳ Hazırlanıyor...' : '📷 Paylaş / İndir'}
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
  // Build a map: continent -> sorted list of guessed country names
  const byContinent = {}
  CONTINENTS.forEach(c => { byContinent[c.key] = [] })

  for (const code of guessed) {
    const country = COUNTRIES[code] || NAME_COUNTRIES[code]
    if (country) byContinent[country.continent].push(country.tr)
  }

  const missedByContinent = {}
  CONTINENTS.forEach(c => { missedByContinent[c.key] = [] })
  if (gameOver) {
    for (const [code, country] of Object.entries(COUNTRIES)) {
      if (!guessed.has(code)) missedByContinent[country.continent].push(country.tr)
    }
    for (const [name, country] of Object.entries(NAME_COUNTRIES)) {
      if (!guessed.has(name)) missedByContinent[country.continent].push(country.tr)
    }
  }

  CONTINENTS.forEach(c => {
    byContinent[c.key].sort((a, b) => a.localeCompare(b, 'tr'))
    missedByContinent[c.key]?.sort((a, b) => a.localeCompare(b, 'tr'))
  })

  const totalPerContinent = {}
  CONTINENTS.forEach(c => {
    totalPerContinent[c.key] =
      Object.values(COUNTRIES).filter(co => co.continent === c.key).length +
      Object.values(NAME_COUNTRIES).filter(co => co.continent === c.key).length
  })

  return (
    <div className="continent-panel">
      {CONTINENTS.map(cont => (
        <div key={cont.key} className="continent-col">
          <div className="continent-header" style={{ borderColor: cont.color }}>
            <span className="continent-name" style={{ color: cont.color }}>{cont.label}</span>
            <span className="continent-count">
              {byContinent[cont.key].length}/{totalPerContinent[cont.key]}
            </span>
          </div>
          <ul className="continent-list">
            {byContinent[cont.key].map(name => (
              <li key={name} className="country-item found">{name}</li>
            ))}
            {gameOver && missedByContinent[cont.key].map(name => (
              <li key={name} className="country-item missed">{name}</li>
            ))}
          </ul>
        </div>
      ))}
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
