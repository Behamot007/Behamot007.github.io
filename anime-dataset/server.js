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
  const text = fs.readFileSync(DATASET_PATH, "utf-8");
  return text.split("\n").filter(Boolean).map(line => JSON.parse(line));
}

// Dataset speichern
function saveCharacters(chars) {
  const text = chars.map(c => JSON.stringify(c)).join("\n");
  fs.mkdirSync(path.dirname(DATASET_PATH), { recursive: true });
  fs.writeFileSync(DATASET_PATH, text, "utf-8");
}

// API: Alle Charaktere
app.get("/api/characters", (req, res) => {
  res.json(loadCharacters());
});

// API: Speichern
app.post("/api/characters", (req, res) => {
  const chars = req.body;
  if (!Array.isArray(chars)) return res.status(400).json({ error: "Expected array" });
  saveCharacters(chars);
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});