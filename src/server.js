import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import bodyParser from "body-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

// Import des routes
import authRoutes from "./routes/auth.js";
import shipRoutes from "./routes/ships.js";
import reportRoutes from "./routes/reports.js";

// Import des middlewares
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { testConnection } from "./config/database.js";

// Configuration des variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration du rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limite chaque IP à 100 requêtes par windowMs
  message: {
    error: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard.",
  },
});

// Middlewares globaux
app.use(helmet()); // Sécurité des headers HTTP
app.use(compression()); // Compression gzip
app.use(limiter); // Rate limiting
app.use(morgan("combined")); // Logging des requêtes

// Configuration CORS
app.use(
  cors({
    origin: ["http://localhost:5173", 'https://perenco-frontend.onrender.com'],
    credentials: true,
    //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    //   allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Parsing du body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route de santé
app.get("/api/health", async (req, res) => {
  const dbConnected = await testConnection();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "OK" : "ERROR",
    message: "OpéraLog API is running",
    database: dbConnected ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Routes API
app.use("/api/auth", authRoutes);
app.use("/api/ships", shipRoutes);
app.use("/api/reports", reportRoutes);

// Middlewares de gestion d'erreurs
app.use(notFound);
app.use(errorHandler);

// Démarrage du serveur
const startServer = async () => {
  try {
    // Test de connexion à la base de données
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error("❌ Impossible de se connecter à la base de données");
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Serveur OpéraLog démarré sur le port ${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV}`);
      console.log(`📊 API disponible sur: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 Base de données PostgreSQL connectée`);
    });
  } catch (error) {
    console.error("❌ Erreur lors du démarrage du serveur:", error);
    process.exit(1);
  }
};

startServer();

export default app;
