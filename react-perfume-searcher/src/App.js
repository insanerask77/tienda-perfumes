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

  // Maneja el submit de búsqueda (no changes needed in the core logic here)
  async function handleBuscar(e) {
    e.preventDefault();
    setLoading(true);
    setEquivalencias([]);
    setTiendasDisponibles([]);
    setGenerosDisponibles([]);

    try {
      const perfumesEncontrados = await buscarPerfumes(busqueda);
      // perfumesEncontrados should be the array of perfume objects from the backend
      const idsPerfumes = perfumesEncontrados.map((p) => p.id);

      if (idsPerfumes.length === 0) {
        // setPerfumes([]); // Clear perfumes if you were storing them
        setEquivalencias([]);
        setLoading(false);
        return;
      }
      // setPerfumes(perfumesEncontrados); // If you still want to store the raw perfume list

      const equivalenciasEncontradas = await buscarEquivalencias(idsPerfumes);
      setEquivalencias(equivalenciasEncontradas);
      extraerFiltros(equivalenciasEncontradas);
    } catch (error) {
      console.error("Error en búsqueda:", error);
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
              title={eq.title}
            >
              {eq.title}
            </h3>
            <p
              style={{
                fontStyle: "italic",
                fontSize: "0.9rem",
                color: "#7a6f6f",
                marginBottom: "0.8rem",
                height: "3rem",
                overflow: "hidden",
              }}
              title={eq.description}
            >
              {eq.description}
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
