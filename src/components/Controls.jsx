export default function Controls({
  query,
  setQuery,
  region,
  setRegion,
  regions,
  sort,
  setSort,
  resultCount,
}) {
  return (
    <section className="controls">
      <div className="search">
        <span className="search-icon" aria-hidden>🔍</span>
        <input
          type="search"
          placeholder="Search by country or capital…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search countries"
        />
        {query && (
          <button className="clear" onClick={() => setQuery('')} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>

      <div className="filters">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="Filter by region"
        >
          {regions.map((r) => (
            <option key={r} value={r}>
              {r === 'All' ? 'All regions' : r}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort countries"
        >
          <option value="name">Sort: Name</option>
          <option value="population">Sort: Population</option>
          <option value="area">Sort: Area</option>
        </select>
      </div>

      <p className="result-count">{resultCount} shown</p>
    </section>
  )
}
