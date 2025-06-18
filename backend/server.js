const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

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

  // No need to decode searchText here as encodeURIComponent will handle it.
  // PocketBase expects the part after ~ to be enclosed in quotes if it contains spaces or special chars,
  // and the value itself should be URI encoded.
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

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
