import React, { useState, useEffect } from "react";

const BACKEND_API_URL = "http://localhost:3001/api"; // URL for the new backend

function App() {
  const [busqueda, setBusqueda] = useState("");
  // perfumes state is not directly used for display, so it might be removable if not needed elsewhere
  // const [perfumes, setPerfumes] = useState([]);
  const [equivalencias, setEquivalencias] = useState([]);
  const [filtroTienda, setFiltroTienda] = useState("");
  const [filtroGenero, setFiltroGenero] = useState("");
  const [tiendasDisponibles, setTiendasDisponibles] = useState([]);
  const [generosDisponibles, setGenerosDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);

  // State for AI Search
  const [aiSearchDescription, setAiSearchDescription] = useState("");
  const [aiSearchResults, setAiSearchResults] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Handles AI-powered search
  async function handleAiSearch(e) {
    e.preventDefault();
    if (!aiSearchDescription.trim()) {
      setAiError("Por favor, ingresa una descripción para la búsqueda con IA.");
      return;
    }
    setAiLoading(true);
    setAiSearchResults([]);
    setAiError(null);

    try {
      const resp = await fetch(`${BACKEND_API_URL}/perfumes/ai-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: aiSearchDescription }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: `La búsqueda con IA falló con estado: ${resp.status}` }));
        throw new Error(errorData.error || `La búsqueda con IA falló con estado: ${resp.status}`);
      }

      const data = await resp.json();
      setAiSearchResults(data.matchedEquivalencias || []); // <-- Key change here
      // console.log("AI Analysis:", data.aiAnalysis); // For debugging
      // console.log("AI Matched Equivalencias:", data.matchedEquivalencias);

    } catch (error) {
      console.error("Error in AI search:", error);
      setAiError(error.message || "Ocurrió un error inesperado durante la búsqueda con IA.");
    } finally {
      setAiLoading(false);
    }
  }

  // Busca perfumes en el NUEVO BACKEND
  async function buscarPerfumes(texto) {
    const resp = await fetch(
      `${BACKEND_API_URL}/perfumes?searchText=${encodeURIComponent(texto)}`
    );
    if (!resp.ok) {
      console.error("Error fetching perfumes from backend:", resp.status, await resp.text());
      return []; // Return empty array on error
    }
    const data = await resp.json();
    // Backend already returns items directly, or an empty array
    return data;
  }

  // Busca equivalencias relacionadas con los perfumes en el NUEVO BACKEND
  async function buscarEquivalencias(idsPerfumes) {
    if (idsPerfumes.length === 0) return [];

    const resp = await fetch(
      `${BACKEND_API_URL}/equivalencias?perfumeIds=${encodeURIComponent(idsPerfumes.join(","))}`
    );
    if (!resp.ok) {
      console.error("Error fetching equivalencias from backend:", resp.status, await resp.text());
      return []; // Return empty array on error
    }
    const data = await resp.json();
    // Backend already returns items directly, or an empty array
    return data;
  }

  // Extrae tiendas y géneros únicos para los filtros (no changes needed here)
  function extraerFiltros(equivalencias) {
    const tiendas = Array.from(
      new Set(equivalencias.map((eq) => eq.store).filter(Boolean))
    );
    const generos = Array.from(
      new Set(equivalencias.map((eq) => eq.gender).filter(Boolean))
    );
    setTiendasDisponibles(tiendas);
    setGenerosDisponibles(generos);
  }

  // Maneja el submit de búsqueda
  async function handleBuscar(e) {
    e.preventDefault();
    setLoading(true);
    setEquivalencias([]);
    setTiendasDisponibles([]);
    setGenerosDisponibles([]);

    try {
      // buscarPerfumes now directly returns the list of equivalencias
      const equivalenciasEncontradas = await buscarPerfumes(busqueda);

      // Ensure equivalenciasEncontradas is an array before processing
      const results = Array.isArray(equivalenciasEncontradas) ? equivalenciasEncontradas : [];

      setEquivalencias(results);
      extraerFiltros(results);

      // No explicit check for results.length === 0 needed here before setting state,
      // as an empty array will correctly clear previous results and filters.
      // The rendering logic will handle displaying "No se encontraron equivalencias."

    } catch (error) {
      console.error("Error en búsqueda:", error);
      setEquivalencias([]); // Clear equivalencias on error
      setTiendasDisponibles([]); // Clear filters on error too
      setGenerosDisponibles([]);
      // Consider setting an error state here to display to the user
    } finally {
      setLoading(false);
    }
  }

  // Filtrado local por tienda y género (no changes needed here)
  const equivalenciasFiltradas = equivalencias.filter((eq) => {
    const tiendaOk = filtroTienda ? eq.store === filtroTienda : true;
    const generoOk = filtroGenero ? eq.gender === filtroGenero : true;
    return tiendaOk && generoOk;
  });

  return (
    <div
      style={{
        fontFamily:
          "\'Playfair Display\', serif, \'Times New Roman\', Times, serif", // Escaped single quotes
        background:
          "linear-gradient(135deg, #f0e9e0 0%, #e4d7c3 100%)",
        minHeight: "100vh",
        padding: "2rem",
        color: "#3c2f2f",
        maxWidth: 900,
        margin: "auto",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontWeight: "900", fontSize: "3rem" }}>
          Boutique de Perfumes Exclusivos
        </h1>
        <p style={{ fontStyle: "italic", color: "#7a6f6f" }}>
          Encuentra tus colonias favoritas y sus equivalencias
        </p>
      </header>

      <form
        onSubmit={handleBuscar}
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          placeholder="Buscar perfume o marca..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            padding: "0.8rem 1rem",
            borderRadius: "8px",
            border: "2px solid #cbb994",
            fontSize: "1.1rem",
            flexGrow: 1,
            minWidth: 200,
          }}
          required
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: "#7a6f6f",
            color: "#f0e9e0",
            padding: "0.8rem 2rem",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "1.1rem",
            transition: "background-color 0.3s",
          }}
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {/* AI Search Section */}
      <section style={{ marginTop: "2rem", marginBottom: "2rem", padding: "1.5rem", backgroundColor: "#e8e0d6", borderRadius: "12px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem", color: "#3c2f2f" }}>Describe Tu Perfume Ideal</h2>
        <form onSubmit={handleAiSearch} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <textarea
            placeholder="Ej: Busco una fragancia cálida y especiada con notas de vainilla, ideal para la noche."
            value={aiSearchDescription}
            onChange={(e) => setAiSearchDescription(e.target.value)}
            rows={4}
            style={{
              padding: "0.8rem 1rem",
              borderRadius: "8px",
              border: "2px solid #cbb994",
              fontSize: "1rem",
              fontFamily: "inherit",
              resize: "vertical",
            }}
            required
          />
          <button
            type="submit"
            disabled={aiLoading}
            style={{
              backgroundColor: "#8c6f2c", // Different color for distinction
              color: "#f0e9e0",
              padding: "0.8rem 2rem",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "1.1rem",
              transition: "background-color 0.3s",
              alignSelf: "center",
            }}
          >
            {aiLoading ? "Buscando con IA..." : "Buscar con IA"}
          </button>
          {aiError && <p style={{ color: "red", textAlign: "center" }}>Error: {aiError}</p>}
        </form>
      </section>

      {/* AI Search Results Display */}
      {/* This condition ensures the section is shown if there's an active search attempt, loading, or results/error */}
      {(aiSearchDescription || aiLoading || aiSearchResults.length > 0 || aiError) && (
        <section style={{ marginTop: "2rem" }}>
          <h2 style={{ textAlign: "center", marginBottom: "1.5rem", color: "#3c2f2f" }}>Recomendaciones de IA</h2>
          {aiLoading && <p style={{ textAlign: "center", fontStyle: "italic", marginTop: "1rem" }}>IA está pensando...</p>}
          {aiError && !aiLoading && <p style={{ color: "red", textAlign: "center", marginTop: "1rem" }}>Error: {aiError}</p>}
          {!aiLoading && !aiError && aiSearchResults.length === 0 && aiSearchDescription && (
            <p style={{ textAlign: "center", color: "#7a6f6f", fontStyle: "italic", marginTop: "1rem" }}>
              La IA no encontró coincidencias específicas para tu descripción. Intenta reformular o ser más general.
            </p>
          )}
          {aiSearchResults.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                gap: "1.8rem",
              }}
            >
              {aiSearchResults.map((eq) => ( // Changed 'perfume' to 'eq'
                <div
                  key={eq.id} // Use eq.id
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: "700",
                      fontSize: "1.3rem",
                      marginBottom: "0.4rem",
                      color: "#3c2f2f",
                    }}
                    title={eq.perfume_title || "Perfume Original no Disponible"} // AI Search: Main title
                  >
                    {eq.perfume_title || "Perfume Original no Disponible"}
                  </h3>
                  {/* AI Search: Subtitle for equivalencia's own title */}
                  <h4
                    style={{
                      fontFamily: "\'Playfair Display\', serif",
                      fontWeight: "600",
                      fontSize: "1.1rem",
                      color: "#5c4f4f",
                      marginBottom: "0.3rem",
                      marginTop: "-0.2rem",
                    }}
                    title={eq.title || "Equivalencia no Disponible"}
                  >
                    {eq.title || "Equivalencia no Disponible"}
                  </h4>
                  <p
                    style={{
                      fontStyle: "italic",
                      fontSize: "0.9rem",
                      color: "#7a6f6f",
                      marginBottom: "0.8rem",
                      // Removed WebkitLineClamp related properties
                    }}
                    // Removed title prop
                  >
                    <span dangerouslySetInnerHTML={{ __html: eq.description || "Descripción no disponible." }} />
                  </p>
                  <p style={{ fontWeight: "600", marginBottom: "0.2rem" }}>
                    Tienda:{" "}
                    <span style={{ color: "#b29160", fontWeight: "700" }}>
                      {eq.store || "No especificada"}
                    </span>
                  </p>
                  <p style={{ fontWeight: "600", marginBottom: "0.6rem" }}>
                    Género:{" "}
                    <span style={{ color: "#b29160", fontWeight: "700" }}>
                      {eq.gender || "Sin especificar"}
                    </span>
                  </p>
                  <p style={{ fontWeight: "700", fontSize: "1.1rem", color: "#7a6f6f", marginBottom: "1rem" }}>
                    {eq.price || "Precio no disponible"}
                  </p>
                  {eq.buy_link && ( // Conditionally render link if available
                    <a
                      href={eq.buy_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textAlign: "center",
                        backgroundColor: "#b29160",
                        color: "#fff",
                        padding: "0.6rem",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: "700",
                        transition: "background-color 0.3s",
                      }}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#8c6f2c")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "#b29160")}
                    >
                      Comprar
                    </a>
                  )}
                  {!eq.buy_link && ( // Optional: display a message if no buy link
                      <p style={{textAlign: 'center', color: '#aaa', fontSize: '0.9rem'}}>Enlace de compra no disponible</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {equivalencias.length > 0 && (
        <div
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <select
            value={filtroTienda}
            onChange={(e) => setFiltroTienda(e.target.value)}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              border: "1px solid #cbb994",
              fontSize: "1rem",
              minWidth: 150,
            }}
          >
            <option value="">Filtrar por tienda</option>
            {tiendasDisponibles.map((tienda) => (
              <option key={tienda} value={tienda}>
                {tienda}
              </option>
            ))}
          </select>

          <select
            value={filtroGenero}
            onChange={(e) => setFiltroGenero(e.target.value)}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              border: "1px solid #cbb994",
              fontSize: "1rem",
              minWidth: 150,
            }}
          >
            <option value="">Filtrar por género</option>
            {generosDisponibles.map((gen) => (
              <option key={gen} value={gen}>
                {gen}
              </option>
            ))}
          </select>

          {(filtroTienda || filtroGenero) && (
            <button
              onClick={() => {
                setFiltroTienda("");
                setFiltroGenero("");
              }}
              style={{
                backgroundColor: "#cbb994",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                padding: "0.6rem 1rem",
                fontWeight: "700",
                color: "#3c2f2f",
                fontSize: "1rem",
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
          gap: "1.8rem",
        }}
      >
        {equivalenciasFiltradas.length === 0 && !loading && (
          <p
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              color: "#7a6f6f",
              fontStyle: "italic",
            }}
          >
            No se encontraron equivalencias.
          </p>
        )}

        {equivalenciasFiltradas.map((eq) => (
          <div
            key={eq.id}
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "transform 0.3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <h3
              style={{
                fontFamily: "\'Playfair Display\', serif", // Escaped single quotes
                fontWeight: "700",
                fontSize: "1.3rem",
                marginBottom: "0.4rem",
                color: "#3c2f2f",
              }}
              title={eq.perfume_title || "Perfume Original no Disponible"} // Regular Search: Main title
            >
              {eq.perfume_title || "Perfume Original no Disponible"}
            </h3>
            {/* Regular Search: Subtitle for equivalencia's own title */}
            <h4
              style={{
                fontFamily: "\'Playfair Display\', serif",
                fontWeight: "600",
                fontSize: "1.1rem",
                color: "#5c4f4f",
                marginBottom: "0.3rem",
                marginTop: "-0.2rem",
              }}
              title={eq.title || "Equivalencia no Disponible"} // Regular Search: Subtitle text
            >
              {eq.title || "Equivalencia no Disponible"}
            </h4>
            <p
              style={{
                fontStyle: "italic",
                fontSize: "0.9rem",
                color: "#7a6f6f",
                marginBottom: "0.8rem",
                // Removed height: "3rem" and overflow: "hidden"
              }}
              // Removed title prop
            >
              <span dangerouslySetInnerHTML={{ __html: eq.description || "Descripción no disponible." }} />
            </p>
            <p
              style={{
                fontWeight: "600",
                marginBottom: "0.2rem",
              }}
            >
              Tienda:{" "}
              <span style={{ color: "#b29160", fontWeight: "700" }}>
                {eq.store}
              </span>
            </p>
            <p
              style={{
                fontWeight: "600",
                marginBottom: "0.6rem",
              }}
            >
              Género:{" "}
              <span style={{ color: "#b29160", fontWeight: "700" }}>
                {eq.gender || "Sin especificar"}
              </span>
            </p>
            <p
              style={{
                fontWeight: "700",
                fontSize: "1.1rem",
                color: "#7a6f6f",
                marginBottom: "1rem",
              }}
            >
              {eq.price || "Precio no disponible"}
            </p>
            <a
              href={eq.buy_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textAlign: "center",
                backgroundColor: "#b29160",
                color: "#fff",
                padding: "0.6rem",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "700",
                transition: "background-color 0.3s",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#8c6f2c")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#b29160")}
            >
              Comprar
            </a>
          </div>
        ))}
      </section>
    </div>
  );
}

export default App;
