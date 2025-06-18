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
  console.log(`Received perfume search request for: "${decodedSearchText}"`);

  // Step 1: Search in 'perfumes' collection broadly
  // Assuming 'brand' field exists in your 'perfumes' collection
  const perfumeSearchFields = ["title", "description", "brand"];
  const perfumeFilterParts = perfumeSearchFields.map(field => `${field}~\"${decodedSearchText}\"`);
  const perfumeFilter = `(${perfumeFilterParts.join(" || ")})`;
  // Fetch more perfumes initially to increase chances of finding linked equivalencias
  const perfumesUrl = `${PB_URL}/collections/perfumes/records?filter=${encodeURIComponent(perfumeFilter)}&perPage=100`;

  console.log(`Searching 'perfumes' collection with filter: ${perfumeFilter}`);
  console.log(`Perfumes collection URL: ${perfumesUrl}`);

  let matchedPerfumes = [];
  try {
    const perfumeResp = await fetch(perfumesUrl);
    if (!perfumeResp.ok) {
      const errorBody = await perfumeResp.text();
      console.error(`Perfumes collection request failed with status ${perfumeResp.status}: ${errorBody}`);
      // Do not throw here, allow to return empty if this step fails but not catastrophically
      return res.status(perfumeResp.status).json({ error: `Failed to fetch perfumes from PocketBase: ${errorBody}`});
    }
    const perfumeData = await perfumeResp.json();
    matchedPerfumes = perfumeData.items || [];
    console.log(`Found ${matchedPerfumes.length} perfumes matching initial criteria.`);
  } catch (error) {
    console.error("Error fetching data from 'perfumes' collection:", error);
    return res.status(500).json({ error: "Server error while fetching perfumes.", details: error.message });
  }

  if (matchedPerfumes.length === 0) {
    console.log("No perfumes found matching the initial criteria. Returning empty list.");
    return res.json([]); // Return empty array of equivalencias
  }

  const perfumeIds = matchedPerfumes.map(p => p.id);
  if (perfumeIds.length === 0) { // Should not happen if matchedPerfumes.length > 0, but good check
      console.log("No perfume IDs extracted. Returning empty list.");
      return res.json([]);
  }
  console.log(`Extracted ${perfumeIds.length} perfume IDs for fetching equivalencias.`);

  // Step 2: Fetch equivalencias linked to these perfume IDs
  const equivalenciaIdFilterParts = perfumeIds.map(id => `perfume_id="${id}"`);
  const equivalenciaIdFilter = `(${equivalenciaIdFilterParts.join(" || ")})`;
  // Consider pagination or increasing perPage if many equivalencias are expected.
  // Sorting by title for consistent results.
  const equivalenciasUrl = `${PB_URL}/collections/equivalencias/records?filter=${encodeURIComponent(equivalenciaIdFilter)}&perPage=200&sort=title`;

  console.log(`Fetching 'equivalencias' collection with filter: ${equivalenciaIdFilter}`);
  console.log(`Equivalencias collection URL: ${equivalenciasUrl}`);

  let allEquivalencias = [];
  try {
    const equivalenciaResp = await fetch(equivalenciasUrl);
    if (!equivalenciaResp.ok) {
      const errorBody = await equivalenciaResp.text();
      console.error(`Equivalencias collection request failed with status ${equivalenciaResp.status}: ${errorBody}`);
      // Depending on desired behavior, you might return an error or an empty list.
      // For now, returning an error status.
      return res.status(equivalenciaResp.status).json({ error: `Failed to fetch equivalencias from PocketBase: ${errorBody}`});
    }
    const equivalenciaData = await equivalenciaResp.json();
    allEquivalencias = equivalenciaData.items || [];
    console.log(`Fetched ${allEquivalencias.length} total equivalencias linked to the perfumes.`);
  } catch (error) {
    console.error("Error fetching data from 'equivalencias' collection:", error);
    return res.status(500).json({ error: "Server error while fetching equivalencias.", details: error.message });
  }

  // Step 3: Refine equivalencias by searchText on their own fields (title, description)
  let refinedEquivalencias = [];
  if (allEquivalencias.length > 0) {
    console.log(`Refining ${allEquivalencias.length} equivalencias with searchText: "${decodedSearchText}"`);
    const stLower = decodedSearchText.toLowerCase();
    refinedEquivalencias = allEquivalencias.filter(eq =>
      (eq.title && eq.title.toLowerCase().includes(stLower)) ||
      (eq.description && eq.description.toLowerCase().includes(stLower))
      // Add other eq fields for refinement if needed, e.g. eq.brand
    );
    console.log(`Found ${refinedEquivalencias.length} equivalencias after refinement.`);
  } else {
    console.log("No equivalencias to refine.");
  }

  res.json(refinedEquivalencias);
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
\"${description}\"
Analiza esta descripción y extrae características clave, notas olfativas, ambiente deseado, estilos de perfume o cualquier otro atributo relevante. Los términos extraídos deben estar en español.
Devuelve tu análisis como un objeto JSON con las siguientes posibles claves (incluye solo las claves relevantes, los valores deben estar en español):
- \"keywords\": ["array", "de", "cadenas"] (ej., aromas específicos como \"vainilla\", \"rosa\", \"oud\", \"cítrico\")
- \"scent_family\": "cadena" (ej., \"Floral\", \"Oriental\", \"Amaderado\", \"Fresco\", \"Gourmand\", \"Chipre\", \"Fougère\")
- \"mood_or_occasion\": "cadena" (ej., \"noche\", \"uso diario\", \"romántico\", \"energético\")
- \"primary_notes\": ["array", "de", "cadenas"] (notas dominantes si son identificables)
- \"secondary_notes\": ["array", "de", "cadenas"] (notas de apoyo si son identificables)

Ejemplo de la salida JSON deseada (los valores deben estar en español):
{
  \"keywords\": [\"vainilla\", \"tabaco\", \"especiado\"],
  \"scent_family\": \"Oriental\",
  \"mood_or_occasion\": \"para la noche\"
}
Proporciona únicamente el objeto JSON en tu respuesta. Asegúrate de que la respuesta sea un JSON válido.
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

      const searchFields = ["title", "description"]; // Fields to search in PocketBase
      let finalFilterParts = [];

      // Handle Keywords (OR group)
      if (structuredAiResponse.keywords && structuredAiResponse.keywords.length > 0) {
        let keywordFilterGroup = [];
        structuredAiResponse.keywords.forEach(keyword => {
          if (keyword && keyword.trim() !== "") {
            const trimmedKeyword = keyword.trim();
            const keywordFieldMatches = searchFields.map(field => `${field}~\"${trimmedKeyword}\"`);
            keywordFilterGroup.push(`(${keywordFieldMatches.join(" || ")})`);
          }
        });
        if (keywordFilterGroup.length > 0) {
          finalFilterParts.push(`(${keywordFilterGroup.join(" || ")})`);
        }
      }

      // Handle Scent Family (ANDed with other groups)
      if (structuredAiResponse.scent_family && structuredAiResponse.scent_family.trim() !== "") {
        const family = structuredAiResponse.scent_family.trim();
        const familyFieldMatches = searchFields.map(field => `${field}~\"${family}\"`);
        // Each field match for scent family is ORed, then the whole group is ANDed
        if (familyFieldMatches.length > 0) {
             finalFilterParts.push(`(${familyFieldMatches.join(" || ")})`);
        }
      }

      // Handle Mood or Occasion (ANDed with other groups)
      if (structuredAiResponse.mood_or_occasion && structuredAiResponse.mood_or_occasion.trim() !== "") {
        const mood = structuredAiResponse.mood_or_occasion.trim();
        const moodFieldMatches = searchFields.map(field => `${field}~\"${mood}\"`);
        if (moodFieldMatches.length > 0) {
            finalFilterParts.push(`(${moodFieldMatches.join(" || ")})`);
        }
      }

      let perfumes = [];
      let pbFilter = "";

      if (finalFilterParts.length > 0) {
        pbFilter = finalFilterParts.join(" && ");
        console.log("Final PocketBase Filter to be used:", pbFilter);

        const pbCollection = "perfumes";
        const url = `${PB_URL}/collections/${pbCollection}/records?filter=${encodeURIComponent(pbFilter)}&perPage=20`;

        console.log(`Querying PocketBase collection '${pbCollection}' with filter: ${pbFilter}`);
        console.log(`PocketBase URL: ${url}`);
        try {
          const pbResponse = await fetch(url);
          if (!pbResponse.ok) {
            const errorBody = await pbResponse.text();
            console.error(`PocketBase request failed with status ${pbResponse.status}: ${errorBody}`);
          } else {
            const pbData = await pbResponse.json();
            perfumes = pbData.items || [];
            console.log(`PocketBase query successful. Found ${perfumes.length} perfumes.`);
            if (perfumes.length > 0) {
                 console.log("First perfume item snippet:", JSON.stringify(perfumes[0], null, 2));
            }
          }
        } catch (pbFetchError) {
          console.error("Error fetching data from PocketBase:", pbFetchError);
        }
      } else {
        console.log("No filter parts generated from AI response. Skipping PocketBase query.");
      }

      res.json({
        userInput: description,
        aiAnalysis: structuredAiResponse,
        matchedPerfumes: perfumes,
        generatedFilter: pbFilter // Include filter in response for debugging
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
