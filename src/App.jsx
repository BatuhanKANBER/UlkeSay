import { useState, useEffect } from 'react'
import Menu from './Menu'
import Game from './Game'

export default function App() {
  const [screen, setScreen] = useState('menu') // 'menu' | 'game'
  const [nickname, setNickname] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('ulkesay-theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ulkesay-theme', theme)
  }, [theme])

  function handleStart(nick) {
    setNickname(nick)
    setScreen('game')
  }

  function handleGameEnd(score, total, completed, completionTime) {
    saveScore(nickname, score, total, completed, completionTime)
    setScreen('menu')
  }

  return (
    <div>
      {screen === 'menu' && (
        <Menu onStart={handleStart} theme={theme} setTheme={setTheme} />
      )}
      {screen === 'game' && (
        <Game theme={theme} onEnd={handleGameEnd} nickname={nickname} />
      )}
    </div>
  )
}

function saveScore(nick, score, total, completed, completionTime) {
  const key = 'ulkesay-scores'
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  const pct = Math.round((score / total) * 100)
  existing.push({
    nick, score, total, pct,
    completed: !!completed,
    completionTime: completed ? completionTime : null,
    date: new Date().toLocaleDateString('tr-TR'),
  })
  existing.sort((a, b) =>
    b.pct - a.pct ||
    (a.completed && b.completed ? a.completionTime - b.completionTime : b.score - a.score)
  )
  localStorage.setItem(key, JSON.stringify(existing.slice(0, 10)))
}
