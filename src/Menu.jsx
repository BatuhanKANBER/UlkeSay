import { useState } from 'react'
import { TOTAL_COUNTRIES } from './countries'

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export default function Menu({ onStart, theme, setTheme }) {
  const [nick, setNick] = useState('')
  const scores = JSON.parse(localStorage.getItem('ulkesay-scores') || '[]')

  return (
    <div className="menu-wrapper">
      <div className="menu-card">
        <div className="theme-toggle">
          <span>{theme === 'dark' ? '🌙 Karanlık' : '☀️ Aydınlık'}</span>
          <button className="toggle-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            <div className={`toggle-thumb ${theme === 'dark' ? 'dark' : ''}`}>
              {theme === 'dark' ? '🌙' : '☀️'}
            </div>
          </button>
        </div>

        <div>
          <h1 className="menu-title"><span className="menu-emoji">🌍</span> Ülke Say</h1>
          <p className="menu-subtitle">15 dakikada kaç ülke sayabilirsin?</p>
        </div>

        <div className="input-group">
          <label>Kullanıcı Adı</label>
          <input
            className="input-field"
            placeholder="Takma adını gir..."
            value={nick}
            maxLength={20}
            onChange={e => setNick(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && nick.trim() && onStart(nick.trim())}
          />
        </div>

        <button
          className="btn btn-primary"
          disabled={!nick.trim()}
          onClick={() => onStart(nick.trim())}
        >
          Oyunu Başlat →
        </button>

        <p style={{ fontSize: '0.78rem', color: 'var(--text2)', textAlign: 'center' }}>
          {TOTAL_COUNTRIES} ülke · Türkçe isimler · 15 dakika
        </p>
      </div>

      {scores.length > 0 && (
        <div className="scores-card">
          <div className="scores-title">🏆 En İyi Skorlar</div>
          <table className="scores-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Kullanıcı</th>
                <th>Skor</th>
                <th>Oran</th>
                <th>Süre</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={i}>
                  <td>
                    <span className={`rank-badge ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.nick}</td>
                  <td>{s.score}/{s.total}</td>
                  <td><span className="score-pct">%{s.pct}</span></td>
                  <td style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>
                    {s.completed ? `⏱️ ${formatTime(s.completionTime)}` : '-'}
                  </td>
                  <td style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
