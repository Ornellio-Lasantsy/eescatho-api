require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "eescatho",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Création du pool de connexions
const pool = mysql.createPool(dbConfig);

// Routes CRUD pour la table inscription

// Créer une nouvelle inscription
app.post("/inscriptions", async (req, res) => {
  try {
    const { nom, contact, email } = req.body;

    if (!nom || !contact || !email) {
      return res
        .status(400)
        .json({ error: "Tous les champs (nom, contact, email) sont requis" });
    }

    const [result] = await pool.execute(
      "INSERT INTO inscription (nom, contact, email) VALUES (?, ?, ?)",
      [nom, contact, email]
    );

    const [newInscription] = await pool.execute(
      "SELECT * FROM inscription WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(newInscription[0]);
  } catch (error) {
    console.error("Erreur lors de la création:", error);
    res.status(500).json({ error: "Erreur serveur lors de la création" });
  }
});

// Lire toutes les inscriptions avec possibilité de recherche
app.get("/inscriptions", async (req, res) => {
  try {
    const { search } = req.query;
    let query = "SELECT * FROM inscription";
    let params = [];

    if (search) {
      query += " WHERE nom LIKE ? OR contact LIKE ? OR email LIKE ?";
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }

    query += " ORDER BY id DESC";

    const [inscriptions] = await pool.execute(query, params);
    res.json(inscriptions);
  } catch (error) {
    console.error("Erreur lors de la récupération:", error);
    res.status(500).json({ error: "Erreur serveur lors de la récupération" });
  }
});

// Lire une inscription spécifique
app.get("/inscriptions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [inscription] = await pool.execute(
      "SELECT * FROM inscription WHERE id = ?",
      [id]
    );

    if (inscription.length === 0) {
      return res.status(404).json({ error: "Inscription non trouvée" });
    }

    res.json(inscription[0]);
  } catch (error) {
    console.error("Erreur lors de la récupération:", error);
    res.status(500).json({ error: "Erreur serveur lors de la récupération" });
  }
});

// Mettre à jour une inscription
app.put("/inscriptions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, contact, email } = req.body;

    if (!nom || !contact || !email) {
      return res
        .status(400)
        .json({ error: "Tous les champs (nom, contact, email) sont requis" });
    }

    const [result] = await pool.execute(
      "UPDATE inscription SET nom = ?, contact = ?, email = ? WHERE id = ?",
      [nom, contact, email, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Inscription non trouvée" });
    }

    const [updatedInscription] = await pool.execute(
      "SELECT * FROM inscription WHERE id = ?",
      [id]
    );

    res.json(updatedInscription[0]);
  } catch (error) {
    console.error("Erreur lors de la mise à jour:", error);
    res.status(500).json({ error: "Erreur serveur lors de la mise à jour" });
  }
});

// Supprimer une inscription
app.delete("/inscriptions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      "DELETE FROM inscription WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Inscription non trouvée" });
    }

    res.status(204).end();
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    res.status(500).json({ error: "Erreur serveur lors de la suppression" });
  }
});

// Vérification de la connexion à la base de données
async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Connecté à la base de données MySQL");
    connection.release();
  } catch (error) {
    console.error("Erreur de connexion à la base de données:", error);
    process.exit(1);
  }
}

// Démarrer le serveur
app.listen(port, async () => {
  await testDbConnection();
  console.log(`Serveur en écoute sur http://localhost:${port}`);
});

// Gestion des erreurs non capturées
process.on("unhandledRejection", (err) => {
  console.error("Erreur non gérée:", err);
  process.exit(1);
});
