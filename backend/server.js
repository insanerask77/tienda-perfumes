const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { OpenAI } = require("openai"); // Keep OpenAI class import for initialization
const { handleAiSearch } = require("./aiSearch"); // Import the new handler

// Initialize OpenAI instance here, to be passed to the handler
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const PORT = process.env.PORT || 3001;
const PB_URL = "http://pocketbase:8080/api"; // Service name for Docker

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

// Endpoint for perfume search (now returns equivalencias based on perfume properties)
app.get("/api/perfumes", async (req, res) => {
  const { searchText } = req.query;

  if (!searchText) {
    return res.status(400).json({ error: "searchText query parameter is required" });
  }
  const decodedSearchText = decodeURIComponent(searchText);
  console.log(`LOG: Received perfume search request for: "${decodedSearchText}"`);

  // Step 1: Direct search in 'equivalencias'
  const equivalenciaDirectSearchFields = ["title", "description"]; // Updated: Search in title and description of equivalencias
  const equivalenciaDirectFilterParts = equivalenciaDirectSearchFields.map(field => `${field}~"${decodedSearchText}"`);
  const equivalenciaDirectFilter = `(${equivalenciaDirectFilterParts.join(" || ")})`;
  // Added expand=perfume_id to fetch related perfume data
  const equivalenciasDirectUrl = `${PB_URL}/collections/equivalencias/records?filter=${encodeURIComponent(equivalenciaDirectFilter)}&expand=perfume_id&perPage=100`;

  console.log(`Searching 'equivalencias' directly with filter: ${equivalenciaDirectFilter}`);
  console.log(`Direct Equivalencias URL: ${equivalenciasDirectUrl}`);

  let directEquivalencias = [];
  try {
    const eqDirectResp = await fetch(equivalenciasDirectUrl);
    if (eqDirectResp.ok) {
      const eqDirectData = await eqDirectResp.json();
      directEquivalencias = (eqDirectData.items || []).map(eq => ({
        ...eq,
        perfume_title: eq.expand?.perfume_id?.title || "Nombre de Perfume Original no Disponible"
      }));
      console.log(`Found ${directEquivalencias.length} equivalencias from direct search.`);
    } else {
      const errorBody = await eqDirectResp.text();
      console.error(`Direct 'equivalencias' collection request failed with status ${eqDirectResp.status}: ${errorBody}`);
      // Decide if this should be a fatal error or just log and continue
    }
  } catch (error) {
    console.error("Error fetching data directly from 'equivalencias' collection:", error);
    // Decide if this should be a fatal error or just log and continue
  }

  // Step 2: Search in 'perfumes' collection broadly
  const perfumeSearchFields = ["title", "brand", "description"]; // Updated: Search in title, brand, description of perfumes
  const perfumeFilterParts = perfumeSearchFields.map(field => `${field}~\"${decodedSearchText}\"`);
  const perfumeSearchFilter = `(${perfumeFilterParts.join(" || ")})`;
  const perfumesUrl = `${PB_URL}/collections/perfumes/records?filter=${encodeURIComponent(perfumeSearchFilter)}&perPage=100`;

  console.log(`LOG: Searching 'perfumes' collection with filter: ${perfumeSearchFilter}`);
  console.log(`LOG: Perfumes collection URL: ${perfumesUrl}`);

  let matchedPerfumes = [];
  try {
    const perfumeResp = await fetch(perfumesUrl);
    if (!perfumeResp.ok) {
      const errorBody = await perfumeResp.text();
      console.error(`LOG: Perfumes collection request failed with status ${perfumeResp.status}: ${errorBody}`);
      // Allow to continue if this step fails, directEquivalencias might still have results
    } else {
      const perfumeData = await perfumeResp.json();
      matchedPerfumes = perfumeData.items || [];
      console.log(`LOG: Found ${matchedPerfumes.length} perfumes matching initial criteria.`);
      console.log("LOG: Matched Perfumes:", JSON.stringify(matchedPerfumes.map(p => ({id: p.id, title: p.title})), null, 2));
    }
  } catch (error) {
    console.error("LOG: Error fetching data from 'perfumes' collection:", error);
    // Allow to continue
  }

  let linkedEquivalencias = []; // Renamed from allEquivalencias
  if (matchedPerfumes.length > 0) {
    const perfumeIds = matchedPerfumes.map(p => p.id);
    console.log(`LOG: Extracted ${perfumeIds.length} perfume IDs for fetching linked equivalencias:`, perfumeIds);

    if (perfumeIds.length > 0) {
      // Fetch equivalencias linked to these perfume IDs
      const equivalenciaIdFilterParts = perfumeIds.map(id => `perfume_id="${id}"`);
      const equivalenciaIdFilter = `(${equivalenciaIdFilterParts.join(" || ")})`;
      // Added expand=perfume_id to fetch related perfume data
      const equivalenciasLinkedUrl = `${PB_URL}/collections/equivalencias/records?filter=${encodeURIComponent(equivalenciaIdFilter)}&expand=perfume_id&perPage=200&sort=title`;

      console.log(`LOG: Fetching linked 'equivalencias' with filter: ${equivalenciaIdFilter}`);
      console.log(`LOG: Linked Equivalencias URL: ${equivalenciasLinkedUrl}`);

      try {
        const equivalenciaResp = await fetch(equivalenciasLinkedUrl);
        if (equivalenciaResp.ok) {
          const equivalenciaData = await equivalenciaResp.json();
          linkedEquivalencias = (equivalenciaData.items || []).map(eq => ({
            ...eq,
            perfume_title: eq.expand?.perfume_id?.title || "Nombre de Perfume Original no Disponible"
          }));
          console.log(`LOG: Fetched ${linkedEquivalencias.length} total equivalencias linked to the perfumes.`);
          console.log("LOG: Linked Equivalencias Sample:", JSON.stringify(linkedEquivalencias.slice(0, 5).map(eq => ({id: eq.id, title: eq.title, perfume_title: eq.perfume_title})), null, 2));
        } else {
          const errorBody = await equivalenciaResp.text();
          console.error(`LOG: Linked 'equivalencias' collection request failed with status ${equivalenciaResp.status}: ${errorBody}`);
        }
      } catch (error) {
        console.error("LOG: Error fetching data from linked 'equivalencias' collection:", error);
      }
    }
  } else {
    console.log("LOG: No perfumes found matching the initial criteria. Skipping fetch for linked equivalencias.");
  }

  // Step 3: Combine direct and linked equivalencias and deduplicate
  console.log("LOG: Direct Equivalencias before combining:", JSON.stringify(directEquivalencias.map(eq => ({id: eq.id, title: eq.title})), null, 2));
  const combinedEquivalencias = [...directEquivalencias, ...linkedEquivalencias];
  const uniqueEquivalenciasMap = new Map();
  combinedEquivalencias.forEach(eq => {
    if (eq && eq.id) { // Ensure eq and eq.id are valid
       uniqueEquivalenciasMap.set(eq.id, eq);
    }
  });
  const finalUniqueEquivalencias = Array.from(uniqueEquivalenciasMap.values());

  console.log(`LOG: Combined ${directEquivalencias.length} direct and ${linkedEquivalencias.length} linked equivalencias.`);
  console.log(`LOG: Returning ${finalUniqueEquivalencias.length} unique equivalencias.`);

  res.json(finalUniqueEquivalencias);
});

// Endpoint for equivalencias
app.get("/api/equivalencias", async (req, res) => {
  const { search } = req.query; // Changed from perfumeIds to search

  if (!search) {
    return res.status(400).json({ error: "Search query parameter is required" }); // Updated error message
  }

  const searchTerms = search.split(",").map(term => term.trim().toLowerCase()); // Process search terms
  if (searchTerms.length === 0) {
    return res.json([]);
  }

  // Enhanced filter logic: perfume_id OR description contains any search term
  const filterParts = searchTerms.map(term => {
    const escapedTerm = term.replace(/"/g, '""'); // Escape double quotes for PocketBase
    // Ensure search is case-insensitive with '~' and terms are OR'd correctly for each field
    return `(perfume_id~"${escapedTerm}" || description~"${escapedTerm}")`;
  });
  const filter = filterParts.join(" || "); // OR between different term groups

  const url = `${PB_URL}/collections/equivalencias/records?filter=${encodeURIComponent(filter)}&perPage=100`;

  try {
    console.log(`Fetching equivalencias from PocketBase: ${url}`); // Updated log message
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`PocketBase request failed with status ${response.status}: ${errorBody}`);
      throw new Error(`PocketBase request failed with status ${response.status}`);
    }
    const data = await response.json();
    res.json(data.items || []);
  } catch (error) {
    console.error("Error fetching equivalencias:", error); // Kept existing error logging
    res.status(500).json({ error: "Failed to fetch equivalencias", details: error.message }); // Kept existing error response
  }
});

// Use the imported handler for AI-powered perfume search
// Pass openai instance and PB_URL to the handler
app.post("/api/perfumes/ai-search", (req, res) => {
  handleAiSearch(req, res, openai, PB_URL);
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
