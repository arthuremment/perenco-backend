import express from "express";
import jwt from "jsonwebtoken";
import { query } from "../config/database.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

// Validation des données de connexion
const validateLogin = [
  body("email").optional().isEmail().withMessage("Email invalide"),
  body("username")
    .optional()
    .isLength({ min: 3 })
    .withMessage("Nom d'utilisateur trop court"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Mot de passe requis (min 6 caractères)"),
];

// Génération du token JWT
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// POST /api/auth/login/admin - Connexion utilisateur admin
router.post("/login/admin", validateLogin, async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const result = await query(
      "SELECT id, name, email, password, name, role, is_active FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe
    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe incorrect",
      });
    }

    // Générer le token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      type: "user",
    });

    // Réponse sans le mot de passe
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Connexion réussie",
      data: {
        user: userWithoutPassword,
        token,
        type: "admin",
      },
    });
  } catch (error) {
    console.error("Erreur lors de la connexion admin:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});

// POST /api/auth/login/ship - Connexion navire
router.post("/login/ship", validateLogin, async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: errors.array(),
      });
    }

    const { username, password } = req.body;

    // Vérifier si le navire existe
    const result = await query(
      `
      SELECT id, name, type, status, captain, username, password, position, small_name, role
      FROM ships WHERE username = $1
    `,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Nom d'utilisateur ou mot de passe incorrect",
      });
    }

    const ship = result.rows[0];

    // Vérifier le mot de passe
    if (password !== ship.password) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe incorrect",
      });
    }

    // Mettre à jour la dernière connexion
    await query(
      "UPDATE ships SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [ship.id]
    );

    // Générer le token
    const token = generateToken({
      id: ship.id,
      username: ship.username,
      name: ship.name,
      type: "ship",
    });

    // Réponse sans le mot de passe
    const { password: _, ...shipWithoutPassword } = ship;

    res.json({
      success: true,
      message: "Connexion réussie",
      data: {
        ship: shipWithoutPassword,
        token,
        type: "ship",
      },
    });
  } catch (error) {
    console.error("Erreur lors de la connexion navire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});

// POST /api/auth/logout - Déconnexion
router.post("/logout", (req, res) => {
  res.json({
    success: true,
    message: "Déconnexion réussie",
  });
});

// GET /api/auth/me - Informations utilisateur connecté
router.get("/me", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token manquant",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === "user") {
      const result = await query(
        "SELECT id, email, name, role, is_active FROM users WHERE id = $1",
        [decoded.id]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return res.status(401).json({
          success: false,
          message: "Utilisateur non trouvé",
        });
      }

      res.json({
        success: true,
        data: {
          user: result.rows[0],
          type: "admin",
        },
      });
    } else if (decoded.type === "ship") {
      const result = await query(
        `
        SELECT id, name, type, status, captain, username
        FROM ships WHERE id = $1
      `,
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Navire non trouvé",
        });
      }

      res.json({
        success: true,
        data: {
          ship: result.rows[0],
          type: "ship",
        },
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Type de token invalide",
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token invalide",
    });
  }
});

export default router;
