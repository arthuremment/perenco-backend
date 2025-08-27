import express from "express";
import { query } from "../config/database.js";
import {
  authenticateUser,
  authenticateShip,
  authenticateAny,
  requireRole,
} from "../middleware/auth.js";
import { body, param, validationResult } from "express-validator";

const router = express.Router();

// Validation pour les navires
const validateShip = [
  body("name")
    .notEmpty()
    .withMessage("Nom requis")
    .isLength({ min: 2, max: 100 }),
  //body('type').isIn(['PETROLIER', 'CARGO', 'TANKER', 'REMORQUEUR']).withMessage('Type invalide'),
  body("captain").notEmpty().withMessage("Capitaine requis"),
  body("username")
    .isLength({ min: 3, max: 50 })
    .withMessage("Nom d'utilisateur 3-50 caractères"),
];

// GET /api/ships - Liste des navires (Admin seulement)
router.get("/", authenticateUser, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await query(
      `
      SELECT *
      FROM ships
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    );

    const countResult = await query("SELECT COUNT(*) FROM ships");
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        ships: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Erreur récupération navires:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});

// GET /api/ships/:id - Détails d'un navire
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT id, name, type, status, captain, username, last_login, created_at, updated_at
      FROM ships WHERE id = $1
    `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Navire non trouvé",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur récupération navire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});

// POST /api/ships - Créer un nouveau navire (Admin seulement)
router.post(
  "/",
  authenticateUser,
  requireRole(["admin"]),
  validateShip,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Données invalides",
          errors: errors.array(),
        });
      }

      const { name, type, captain, username, password, status, small_name, crew, position } = req.body;

      const result = await query(
        `
      INSERT INTO ships (
         name, type, captain, username, password, status, small_name, crew, position
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING id, name, type, status, captain, username
    `,
        [name, type, captain, username, password, status, small_name, crew, position]
      );

      res.status(201).json({
        success: true,
        message: "Navire créé avec succès",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Erreur création navire:", error);

      if (error.code === "23505") {
        // Contrainte d'unicité PostgreSQL
        return res.status(400).json({
          success: false,
          message: "Un navire avec ce nom ou nom d'utilisateur existe déjà",
        });
      }

      res.status(500).json({
        success: false,
        message: "Erreur interne du serveur",
      });
    }
  }
);

// PUT /api/ships/:id - Mettre à jour un navire
router.put(
  "/:id",
  authenticateUser,
  requireRole(["admin", "supervisor"]),
  async (req, res) => {
    try {
      const { name, password, type, status, captain, username, crew, small_name, position } = req.body;
      const shipId = parseInt(req.params.id, 10);

      // Construction dynamique de la requête
      let queryText = 'UPDATE ships SET ';
      const queryParams = [shipId];
      let paramCount = 1;
      const setClauses = [];

      if (name !== undefined) {
        paramCount++;
        setClauses.push(`name = $${paramCount}`);
        queryParams.push(name);
      }

      if (password !== undefined) {
        paramCount++;
        setClauses.push(`password = $${paramCount}`);
        queryParams.push(password);
      }

      if (type !== undefined) {
        paramCount++;
        setClauses.push(`type = $${paramCount}`);
        queryParams.push(type);
      }

      if (status !== undefined) {
        paramCount++;
        setClauses.push(`status = $${paramCount}`);
        queryParams.push(status);
      }

      if (captain !== undefined) {
        paramCount++;
        setClauses.push(`captain = $${paramCount}`);
        queryParams.push(captain);
      }

      if (username !== undefined) {
        paramCount++;
        setClauses.push(`username = $${paramCount}`);
        queryParams.push(username);
      }

      if (crew !== undefined) {
        paramCount++;
        setClauses.push(`crew = $${paramCount}`);
        queryParams.push(crew);
      }

      if (small_name !== undefined) {
        paramCount++;
        setClauses.push(`small_name = $${paramCount}`);
        queryParams.push(small_name);
      }

      if (position !== undefined) {
        paramCount++;
        setClauses.push(`position = $${paramCount}`);
        queryParams.push(position);
      }

      // Ajouter la date de mise à jour
      setClauses.push('updated_at = CURRENT_TIMESTAMP');

      queryText += setClauses.join(', ') + ' WHERE id = $1 RETURNING *';

      const result = await query(queryText, queryParams);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Navire non trouvé",
        });
      }

      res.json({
        success: true,
        message: "Navire mis à jour avec succès",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Erreur mise à jour navire:", error);
      res.status(500).json({
        success: false,
        message: "Erreur interne du serveur",
      });
    }
  }
);

// DELETE /api/ships/:id - Supprimer un navire (Admin seulement)
router.delete(
  "/:id",
  authenticateUser,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const result = await query(
        "DELETE FROM ships WHERE id = $1 RETURNING id",
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Navire non trouvé",
        });
      }

      res.json({
        success: true,
        message: "Navire supprimé avec succès",
      });
    } catch (error) {
      console.error("Erreur suppression navire:", error);
      res.status(500).json({
        success: false,
        message: "Erreur interne du serveur",
      });
    }
  }
);

// GET /api/ships/me/profile - Profil du navire connecté
router.get("/me/profile", authenticateAny, async (req, res) => {
  try {
    const result = await query(
      "SELECT id, name, role, type, captain, username, position, small_name, role, crew FROM ships WHERE id = $1",
      [req.ship.id]
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur récupération profil navire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});

export default router;
