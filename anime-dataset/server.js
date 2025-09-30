import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const DATASET_PATH = path.resolve(
  process.env.DATASET_PATH ?? "dataset/characters.jsonl"
);

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.static("public")); // Hier liegt index.html

// Dataset laden
function loadCharacters() {
  if (!fs.existsSync(DATASET_PATH)) return [];

  try {
    const text = fs.readFileSync(DATASET_PATH, "utf-8");
    const characters = [];

    text
      .split("\n")
      .filter(Boolean)
      .forEach((line, index) => {
        try {
          characters.push(JSON.parse(line));
        } catch (error) {
          console.error(
            `Fehler beim Parsen der Zeile ${index + 1} aus ${DATASET_PATH}:`,
            error
          );
        }
      });

    return characters;
  } catch (error) {
    console.error(
      `Datensatz ${DATASET_PATH} konnte nicht gelesen werden:`,
      error
    );
    return [];
  }
}

// Dataset speichern
function saveCharacters(chars) {
  const text = chars.map(c => JSON.stringify(c)).join("\n");
  try {
    fs.mkdirSync(path.dirname(DATASET_PATH), { recursive: true });
    fs.writeFileSync(DATASET_PATH, text, "utf-8");
  } catch (error) {
    console.error(`Datensatz ${DATASET_PATH} konnte nicht gespeichert werden:`, error);
    throw error;
  }
}

// API: Alle Charaktere
app.get("/api/characters", (req, res) => {
  res.json(loadCharacters());
});

// API: Speichern
app.post("/api/characters", (req, res) => {
  const chars = req.body;
  if (!Array.isArray(chars)) return res.status(400).json({ error: "Expected array" });
  try {
    saveCharacters(chars);
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to persist dataset" });
  }
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
