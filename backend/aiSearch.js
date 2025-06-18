const fetch = require("node-fetch");
const { OpenAI } = require("openai"); // Required for OpenAI initialization

// Note: 'openai' instance and 'PB_URL' will be passed to the handler function
// as they are initialized/defined in server.js

async function handleAiSearch(req, res, openai, PB_URL) {
  // Logic from the original /api/perfumes/ai-search route
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ error: "description field is required in the request body" });
  }

  if (!openai || !openai.apiKey) { // Check if openai object and apiKey are valid
    console.error("OpenAI API key is not configured or OpenAI instance is missing.");
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
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
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

      const searchFields = ["perfume_id","title", "description"];
      let pbFilter = "";
      let aiMatchedPerfumes = [];
      let finalEquivalencias = [];

      if (allSearchTerms.length > 0) {
          const uniqueSearchTerms = [...new Set(allSearchTerms)];
          console.log("Unique search terms from AI:", uniqueSearchTerms);

          const filterConditions = uniqueSearchTerms.map(term => {
              const escapedTerm = term.replace(/"/g, '""');
              return searchFields.map(field => `${field}~"${escapedTerm}"`).join(" || ");
          });

          pbFilter = `(${filterConditions.map(fc => `(${fc})`).join(" || ")})`;
          console.log("Final PocketBase Filter for 'perfumes':", pbFilter);

          const perfumesUrl = `${PB_URL}/collections/perfumes/records?filter=${encodeURIComponent(pbFilter)}&perPage=20`;

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
          const perfumeIds = aiMatchedPerfumes.map(p => p.id).filter(id => id);
          if (perfumeIds.length > 0) {
              console.log(`Found ${perfumeIds.length} perfume IDs from AI search. Fetching their equivalencias.`);
              const equivalenciaIdFilterParts = perfumeIds.map(id => `perfume_id="${id}"`);
              const equivalenciaIdFilter = `(${equivalenciaIdFilterParts.join(" || ")})`;
              // Added expand=perfume_id to fetch related perfume data
              const equivalenciasUrl = `${PB_URL}/collections/equivalencias/records?filter=${encodeURIComponent(equivalenciaIdFilter)}&expand=perfume_id&perPage=100&sort=title`;

              console.log(`Fetching 'equivalencias' for AI results with filter: ${equivalenciaIdFilter}`);
              console.log(`Equivalencias URL: ${equivalenciasUrl}`);

              try {
                  const equivalenciaResp = await fetch(equivalenciasUrl);
                  if (equivalenciaResp.ok) {
                      const equivalenciaData = await equivalenciaResp.json();
                      // Process finalEquivalencias to include perfume_title
                      finalEquivalencias = (equivalenciaData.items || []).map(eq => ({
                        ...eq,
                        perfume_title: eq.expand?.perfume_id?.title || "Nombre de Perfume Original no Disponible"
                      }));
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
        matchedEquivalencias: finalEquivalencias,
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
}

module.exports = { handleAiSearch };
