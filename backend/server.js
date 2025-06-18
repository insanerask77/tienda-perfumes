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

// Endpoint for perfume search
app.get("/api/perfumes", async (req, res) => {
  const { searchText } = req.query;

  if (!searchText) {
    return res.status(400).json({ error: "searchText query parameter is required" });
  }

  const filter = `title~"${searchText}"`;
  const url = `${PB_URL}/collections/perfumes/records?filter=${encodeURIComponent(filter)}&perPage=50`;

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
    console.error("Error fetching perfumes:", error);
    res.status(500).json({ error: "Failed to fetch perfumes", details: error.message });
  }
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
Eres un experto en recomendaciones de perfumes.
Un usuario está buscando un perfume y ha proporcionado la siguiente descripción:
\"${description}\"

Analiza esta descripción y extrae las características clave, notas olfativas, estado de ánimo deseado, estilos de perfume u otros atributos relevantes.
Devuelve tu análisis como un objeto JSON con las siguientes claves posibles (incluye solo las claves relevantes):
- \"keywords\": ["array", "de", "cadenas"] (por ejemplo, aromas específicos como vainilla, rosa, oud, cítrico)
- \"scent_family\": "cadena" (por ejemplo, Floral, Oriental, Amaderado, Fresco, Gourmand, Chipre, Fougère)
- \"mood_or_occasion\": "cadena" (por ejemplo, \"uso nocturno\", \"uso diario\", \"romántico\", \"enérgico\")
- \"primary_notes\": ["array", "de", "cadenas"] (notas dominantes si son identificables)
- \"secondary_notes\": ["array", "de", "cadenas"] (notas secundarias si son identificables)

Ejemplo del resultado JSON deseado:
{
  \"keywords\": [\"vainilla\", \"tabaco\", \"especiado\"],
  \"scent_family\": \"Oriental\",
  \"mood_or_occasion\": \"uso nocturno\"
}

Proporciona únicamente el objeto JSON en tu respuesta.
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
      // For now, just return the structured AI response.
      // The next step will be to use this to query PocketBase.
      // --- PocketBase Query Logic based on AI Analysis ---
      let pbFilterParts = [];
      const searchFields = ["title", "description"]; // Fields to search in PocketBase

      if (structuredAiResponse.keywords && structuredAiResponse.keywords.length > 0) {
        structuredAiResponse.keywords.forEach(keyword => {
          if (keyword.trim() !== "") {
            const keywordParts = searchFields.map(field => `${field}~\"${keyword.trim()}\"`);
            pbFilterParts.push(`(${keywordParts.join(" || ")})`);
          }
        });
      }

      // Example: Add scent_family to search if present (searching in description for now)
      if (structuredAiResponse.scent_family && structuredAiResponse.scent_family.trim() !== "") {
        const family = structuredAiResponse.scent_family.trim();
        const familyParts = searchFields.map(field => `${field}~\"${family}\"`);
        pbFilterParts.push(`(${familyParts.join(" || ")})`);
      }

      let perfumes = [];
      if (pbFilterParts.length > 0) {
        const pbFilter = pbFilterParts.join(" && ");
        const pbCollection = "perfumes"; // Or "equivalencias" depending on what we are searching
        const url = `${PB_URL}/collections/${pbCollection}/records?filter=${encodeURIComponent(pbFilter)}&perPage=20`;

        console.log(`Querying PocketBase collection '${pbCollection}' with filter: ${pbFilter}`);
        console.log(`PocketBase URL: ${url}`);
        try {
          const pbResponse = await fetch(url);
          if (!pbResponse.ok) {
            const errorBody = await pbResponse.text();
            console.error(`PocketBase request failed with status ${pbResponse.status}: ${errorBody}`);
            // Decide if to throw or return empty/error to client
            // For now, continue and return potentially empty perfumes list along with AI analysis
          } else {
            const pbData = await pbResponse.json();
            perfumes = pbData.items || [];
          }
        } catch (pbFetchError) {
          console.error("Error fetching data from PocketBase:", pbFetchError);
          // Decide if to throw or return empty/error to client
        }
      }

      res.json({
        userInput: description,
        aiAnalysis: structuredAiResponse,
        matchedPerfumes: perfumes
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
