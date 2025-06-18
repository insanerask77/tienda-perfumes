const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { OpenAI } = require("openai");
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
  const equivalenciaDirectSearchFields = ["perfume_id","title", "description"]; // Add other relevant fields if needed
  const equivalenciaDirectFilterParts = equivalenciaDirectSearchFields.map(field => `${field}~"${decodedSearchText}"`);
  const equivalenciaDirectFilter = `(${equivalenciaDirectFilterParts.join(" || ")})`;
  const equivalenciasDirectUrl = `${PB_URL}/collections/equivalencias/records?filter=${encodeURIComponent(equivalenciaDirectFilter)}&perPage=100`; // Adjust perPage as needed

  console.log(`Searching 'equivalencias' directly with filter: ${equivalenciaDirectFilter}`);
  console.log(`Direct Equivalencias URL: ${equivalenciasDirectUrl}`);

  let directEquivalencias = [];
  try {
    const eqDirectResp = await fetch(equivalenciasDirectUrl);
    if (eqDirectResp.ok) {
      const eqDirectData = await eqDirectResp.json();
      directEquivalencias = eqDirectData.items || [];
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

  // Step 2: Search in 'perfumes' collection broadly (Original Step 1)
  const perfumeSearchFields = ["perfume_id","title", "description", "brand"];
  const perfumeFilterParts = perfumeSearchFields.map(field => `${field}~\"${decodedSearchText}\"`);
  const perfumeSearchFilter = `(${perfumeFilterParts.join(" || ")})`; // Renamed perfumeFilter to perfumeSearchFilter
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
      // Fetch equivalencias linked to these perfume IDs (Original Step 2)
      const equivalenciaIdFilterParts = perfumeIds.map(id => `perfume_id="${id}"`);
      const equivalenciaIdFilter = `(${equivalenciaIdFilterParts.join(" || ")})`;
      const equivalenciasLinkedUrl = `${PB_URL}/collections/equivalencias/records?filter=${encodeURIComponent(equivalenciaIdFilter)}&perPage=200&sort=title`;

      console.log(`LOG: Fetching linked 'equivalencias' with filter: ${equivalenciaIdFilter}`);
      console.log(`LOG: Linked Equivalencias URL: ${equivalenciasLinkedUrl}`);

      try {
        const equivalenciaResp = await fetch(equivalenciasLinkedUrl);
        if (equivalenciaResp.ok) {
          const equivalenciaData = await equivalenciaResp.json();
          linkedEquivalencias = equivalenciaData.items || [];
          console.log(`LOG: Fetched ${linkedEquivalencias.length} total equivalencias linked to the perfumes.`);
          console.log("LOG: Linked Equivalencias Sample:", JSON.stringify(linkedEquivalencias.slice(0, 5).map(eq => ({id: eq.id, title: eq.title})), null, 2));
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
  const { perfumeIds } = req.query;

  if (!perfumeIds) {
    return res.status(400).json({ error: "perfumeIds query parameter is required" });
  }

  const idsArray = perfumeIds.split(",");
  if (idsArray.length === 0) {
    return res.json([]); // Return empty if no IDs provided
  }

  const filter = idsArray.map(id => `perfume_id="${id.trim()}"`).join("||");
  const url = `${PB_URL}/collections/equivalencias/records?filter=${encodeURIComponent(filter)}&perPage=100`;

  try {
    console.log(`Fetching from PocketBase: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`PocketBase request failed with status ${response.status}: ${errorBody}`);
      throw new Error(`PocketBase request failed with status ${response.status}`);
    }
    const data = await response.json();
    res.json(data.items || []);
  } catch (error) {
    console.error("Error fetching equivalencias:", error);
    res.status(500).json({ error: "Failed to fetch equivalencias", details: error.message });
  }
});

// Endpoint for AI-powered perfume search
app.post("/api/perfumes/ai-search", async (req, res) => {
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ error: "description field is required in the request body" });
  }

  if (!openai.apiKey) {
    console.error("OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.");
    return res.status(500).json({ error: "AI service is not configured." });
  }

  const prompt = `
Eres un experto en recomendación de perfumes.
Un usuario está buscando un perfume y ha proporcionado la siguiente descripción en español:
"${description}"

Analiza esta descripción detalladamente. Presta especial atención a la estructura de notas comúnmente utilizada en perfumería, como:
- "Notas de salida" (o similares como "Salida", "Notas altas"): Estas suelen ser las primeras impresiones del perfume.
- "Notas de corazón" (o "Corazón", "Notas medias"): Estas emergen después de las notas de salida.
- "Notas de fondo" (o "Fondo", "Notas base"): Estas son las que perduran más tiempo.

Extrae características clave, notas olfativas (agrupadas por su posición si se especifica), familia olfativa, ambiente deseado, y cualquier otro atributo relevante. Los términos extraídos deben estar en español.

Considera los siguientes ejemplos de cómo un usuario podría describir un perfume:
Ejemplo 1:
"Nota de salida: petit grain.
Nota de corazón: neroli.
Notas de fondo: manzanilla y albahaca."
En este caso, "petit grain" sería una nota de salida, "neroli" una nota de corazón, y "manzanilla", "albahaca" serían notas de fondo.

Ejemplo 2:
"Las notas de salida incluyen, pera, lavanda, menta.
Las notas de corazón destacadas son canela, esclarea y alcaravea.
Las notas de fondo se componen de vaina de vainilla negra, ámbar, pachulí y cedro."
Aquí, "pera", "lavanda", "menta" son notas de salida. "Canela", "esclarea", "alcaravea" son notas de corazón. "Vaina de vainilla negra", "ámbar", "pachulí", "cedro" son notas de fondo.

Devuelve tu análisis como un objeto JSON con las siguientes posibles claves (incluye solo las claves relevantes, los valores deben estar en español):
- "keywords": ["array", "de", "cadenas"] (ej., aromas específicos generales como "vainilla", "rosa", "oud", "cítrico", o ingredientes no especificados como notas)
- "scent_family": "cadena" (ej., "Floral", "Oriental", "Amaderado", "Fresco", "Gourmand", "Chipre", "Fougère")
- "mood_or_occasion": "cadena" (ej., "noche", "uso diario", "romántico", "energético")
- "primary_notes": ["array", "de", "cadenas"] (identifica aquí las "Notas de salida" y "Notas de corazón" si están claramente especificadas)
- "secondary_notes": ["array", "de", "cadenas"] (identifica aquí las "Notas de fondo" si están claramente especificadas)
- "other_characteristics": ["array", "de", "cadenas"] (cualquier otra descripción relevante que no encaje en las categorías anteriores)


Ejemplo de la salida JSON deseada (los valores deben estar en español, y las notas agrupadas como se indicó):
{
  "keywords": ["perfume elegante"],
  "scent_family": "Amaderado Especiado",
  "mood_or_occasion": "para la noche",
  "primary_notes": ["pera", "lavanda", "menta", "canela", "esclarea", "alcaravea"],
  "secondary_notes": ["vaina de vainilla negra", "ámbar", "pachulí", "cedro"]
}
Si el usuario describe notas sin especificar si son de salida, corazón o fondo, puedes incluirlas en "keywords" o "primary_notes" según tu criterio como experto.
Proporciona únicamente el objeto JSON en tu respuesta. Asegúrate de que la respuesta sea un JSON válido y que todo el texto esté en español.
  `;

  try {
    console.log("Sending request to OpenAI GPT-4o for AI search...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Specify the GPT-4o model
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, // Request JSON output
      // max_tokens: 150, // Adjust as needed
    });

    const aiResponseContent = completion.choices[0]?.message?.content;
    if (!aiResponseContent) {
      console.error("OpenAI response content is empty or in an unexpected format.");
      return res.status(500).json({ error: "Failed to get a valid response from AI." });
    }

    console.log("Raw AI Response:", aiResponseContent);

    try {
      const structuredAiResponse = JSON.parse(aiResponseContent);
      console.log("Structured AI Response:", JSON.stringify(structuredAiResponse, null, 2));

      const allSearchTerms = [];
      if (structuredAiResponse.keywords && Array.isArray(structuredAiResponse.keywords)) {
          structuredAiResponse.keywords.forEach(kw => { if (kw && kw.trim() !== "") allSearchTerms.push(kw.trim()); });
      }
      if (structuredAiResponse.primary_notes && Array.isArray(structuredAiResponse.primary_notes)) {
          structuredAiResponse.primary_notes.forEach(note => { if (note && note.trim() !== "") allSearchTerms.push(note.trim()); });
      }
      if (structuredAiResponse.secondary_notes && Array.isArray(structuredAiResponse.secondary_notes)) {
          structuredAiResponse.secondary_notes.forEach(note => { if (note && note.trim() !== "") allSearchTerms.push(note.trim()); });
      }
      if (structuredAiResponse.scent_family && structuredAiResponse.scent_family.trim() !== "") {
          allSearchTerms.push(structuredAiResponse.scent_family.trim());
      }
      if (structuredAiResponse.mood_or_occasion && structuredAiResponse.mood_or_occasion.trim() !== "") {
          allSearchTerms.push(structuredAiResponse.mood_or_occasion.trim());
      }
      if (structuredAiResponse.other_characteristics && Array.isArray(structuredAiResponse.other_characteristics)) {
          structuredAiResponse.other_characteristics.forEach(char => { if (char && char.trim() !== "") allSearchTerms.push(char.trim()); });
      }

      const searchFields = ["perfume_id","title", "description"]; // Fields in 'perfumes' to search against
      let pbFilter = "";
      let aiMatchedPerfumes = [];
      let finalEquivalencias = [];

      if (allSearchTerms.length > 0) {
          const uniqueSearchTerms = [...new Set(allSearchTerms)]; // Remove duplicate terms
          console.log("Unique search terms from AI:", uniqueSearchTerms);

          const filterConditions = uniqueSearchTerms.map(term => {
              // Escape double quotes in term for PocketBase filter
              const escapedTerm = term.replace(/"/g, '""');
              return searchFields.map(field => `${field}~"${escapedTerm}"`).join(" || ");
          });

          pbFilter = `(${filterConditions.map(fc => `(${fc})`).join(" || ")})`; // OR all term conditions broadly
          console.log("Final PocketBase Filter for 'perfumes':", pbFilter);

          const perfumesUrl = `${PB_URL}/collections/perfumes/records?filter=${encodeURIComponent(pbFilter)}&perPage=20`; // Adjust perPage as needed

          console.log(`Querying 'perfumes' collection with AI-generated filter: ${pbFilter}`);
          console.log(`Perfumes URL: ${perfumesUrl}`);
          try {
              const pbResponse = await fetch(perfumesUrl);
              if (pbResponse.ok) {
                  const pbData = await pbResponse.json();
                  aiMatchedPerfumes = pbData.items || [];
                  console.log(`PocketBase query for perfumes successful. Found ${aiMatchedPerfumes.length} perfumes.`);
              } else {
                  const errorBody = await pbResponse.text();
                  console.error(`PocketBase request for AI-matched perfumes failed with status ${pbResponse.status}: ${errorBody}`);
              }
          } catch (pbFetchError) {
              console.error("Error fetching AI-matched perfumes from PocketBase:", pbFetchError);
          }
      } else {
          console.log("No search terms extracted from AI response. Skipping perfume search.");
      }

      if (aiMatchedPerfumes.length > 0) {
          const perfumeIds = aiMatchedPerfumes.map(p => p.id).filter(id => id); // Ensure IDs are valid
          if (perfumeIds.length > 0) {
              console.log(`Found ${perfumeIds.length} perfume IDs from AI search. Fetching their equivalencias.`);
              const equivalenciaIdFilterParts = perfumeIds.map(id => `perfume_id="${id}"`);
              const equivalenciaIdFilter = `(${equivalenciaIdFilterParts.join(" || ")})`;
              const equivalenciasUrl = `${PB_URL}/collections/equivalencias/records?filter=${encodeURIComponent(equivalenciaIdFilter)}&perPage=100&sort=title`; // Adjust perPage

              console.log(`Fetching 'equivalencias' for AI results with filter: ${equivalenciaIdFilter}`);
              console.log(`Equivalencias URL: ${equivalenciasUrl}`);

              try {
                  const equivalenciaResp = await fetch(equivalenciasUrl);
                  if (equivalenciaResp.ok) {
                      const equivalenciaData = await equivalenciaResp.json();
                      finalEquivalencias = equivalenciaData.items || [];
                      console.log(`Fetched ${finalEquivalencias.length} total equivalencias for AI matched perfumes.`);
                  } else {
                      const errorBody = await equivalenciaResp.text();
                      console.error(`Fetching equivalencias for AI results failed with status ${equivalenciaResp.status}: ${errorBody}`);
                  }
              } catch (error) {
                  console.error("Error fetching equivalencias for AI results:", error);
              }
          } else {
              console.log("No valid perfume IDs from AI search to fetch equivalencias.");
          }
      } else {
          console.log("No AI-matched perfumes found. No equivalencias to fetch.");
      }

      res.json({
        userInput: description,
        aiAnalysis: structuredAiResponse,
        matchedEquivalencias: finalEquivalencias, // Key changed here
        generatedFilter: pbFilter
      });
    } catch (parseError) {
      console.error("Failed to parse AI JSON response:", parseError);
      console.error("Raw AI response that failed parsing:", aiResponseContent);
      return res.status(500).json({ error: "Failed to parse AI response.", rawResponse: aiResponseContent });
    }

  } catch (error) {
    console.error("Error calling OpenAI API:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Failed to process AI search request.", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
