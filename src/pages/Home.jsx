import { useMemo, useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { countries } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import Header from '../components/Header.jsx'
import Controls from '../components/Controls.jsx'
import CountryGrid from '../components/CountryGrid.jsx'
import CountryDetail from '../components/CountryDetail.jsx'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('All')
  const [sort, setSort] = useState('name')
  const [selected, setSelected] = useState(null) // cca2 of the open country

  // Derive the filtered + sorted list. Cheap and runs on every keystroke.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = countries.filter((c) => {
      const matchesRegion = region === 'All' || c.region === region
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.capital || '').toLowerCase().includes(q) ||
        c.official.toLowerCase().includes(q)
      return matchesRegion && matchesQuery
    })

    list = [...list].sort((a, b) => {
      if (sort === 'population') return b.population - a.population
      if (sort === 'area') return b.area - a.area
      return a.name.localeCompare(b.name)
    })
    return list
  }, [query, region, sort])

  const selectedCountry = useMemo(
    () => countries.find((c) => c.cca2 === selected) || null,
    [selected],
  )

  const regions = useMemo(() => {
    const set = new Set(countries.map((c) => c.region).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [])

  // Close the detail panel with Escape.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Explore is login-gated: signed-out visitors are sent to the log-in page.
  // We wait for session restore first, so a valid cookie doesn't bounce a
  // returning user who simply refreshed the page. All hooks above run
  // unconditionally — this early return comes after them.
  if (authLoading) return <p className="status">Checking your session…</p>
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app">
      <Header count={countries.length} />

      <main className="main">
        <Controls
          query={query}
          setQuery={setQuery}
          region={region}
          setRegion={setRegion}
          regions={regions}
          sort={sort}
          setSort={setSort}
          resultCount={visible.length}
        />

        {visible.length === 0 && (
          <p className="status">No countries match “{query}”.</p>
        )}

        {visible.length > 0 && (
          <CountryGrid countries={visible} onSelect={setSelected} />
        )}
      </main>

      {selectedCountry && (
        <CountryDetail country={selectedCountry} onClose={() => setSelected(null)} />
      )}

      <footer className="footer">
        Country data:{' '}
        <a href="https://github.com/mledoze/countries" target="_blank" rel="noreferrer">
          mledoze/countries
        </a>{' '}
        (CC0) · Population: World Bank · Weather:{' '}
        <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>
      </footer>
    </div>
  )
}
