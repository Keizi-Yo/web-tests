const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function adminOnly(req, res, next) {
  const password = req.headers["x-admin-password"];
  const expected = process.env.ADMIN_PASSWORD || "roseadmin";
  if (password !== expected) {
    return res.status(401).json({ message: "Password admin salah." });
  }
  next();
}

app.get("/api/data", (req, res) => {
  res.json(readData());
});

app.post("/api/login", (req, res) => {
  const password = req.body?.password || "";
  const expected = process.env.ADMIN_PASSWORD || "roseadmin";
  if (password !== expected) return res.status(401).json({ message: "Password admin salah." });
  res.json({ success: true });
});

app.put("/api/settings", adminOnly, (req, res) => {
  const data = readData();
  data.settings = { ...data.settings, ...req.body };
  writeData(data);
  res.json(data.settings);
});

app.post("/api/menus", adminOnly, (req, res) => {
  const data = readData();
  const menu = {
    id: Date.now(),
    name: req.body.name || "Menu Baru",
    category: req.body.category || "Main Course",
    price: Number(req.body.price) || 0,
    description: req.body.description || "",
    image: req.body.image || "",
    badge: req.body.badge || "",
    available: req.body.available !== false
  };
  data.menus.push(menu);
  if (!data.categories.includes(menu.category)) data.categories.push(menu.category);
  writeData(data);
  res.status(201).json(menu);
});

app.put("/api/menus/:id", adminOnly, (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const index = data.menus.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ message: "Menu tidak ditemukan." });

  data.menus[index] = {
    ...data.menus[index],
    ...req.body,
    id,
    price: Number(req.body.price ?? data.menus[index].price)
  };

  const category = data.menus[index].category;
  if (category && !data.categories.includes(category)) data.categories.push(category);

  writeData(data);
  res.json(data.menus[index]);
});

app.delete("/api/menus/:id", adminOnly, (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const before = data.menus.length;
  data.menus = data.menus.filter(m => m.id !== id);
  if (data.menus.length === before) return res.status(404).json({ message: "Menu tidak ditemukan." });
  writeData(data);
  res.json({ success: true });
});

app.put("/api/categories", adminOnly, (req, res) => {
  const data = readData();
  const categories = Array.isArray(req.body.categories) ? req.body.categories : [];
  data.categories = [...new Set(["Semua", ...categories.filter(Boolean)])];
  writeData(data);
  res.json(data.categories);
});

app.listen(PORT, () => {
  console.log(`Rose Restaurant berjalan di http://localhost:${PORT}`);
});