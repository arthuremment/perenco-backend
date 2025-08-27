import express from "express";
import { query } from "../config/database.js";
import {
  authenticateUser,
  authenticateShip,
  authenticateAny,
} from "../middleware/auth.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

// Validation pour les rapports journaliers
const validateDailyReport = [
  body("ship_id").isInt({ min: 1 }).withMessage("ID navire requis"),
  body("report_date").isISO8601().withMessage("Date invalide"),
  body('vessel_name').optional().isString(),
  body("prepared_by").optional().isString(),
  body('operations').isArray().withMessage('Operations doit être un tableau'),
  body('tanks').isArray().withMessage('Tanks doit être un tableau'),
  body('silos').isArray().withMessage('Silos doit être un tableau'),
];

// Middleware de gestion d'erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array().map(error => ({
        path: error.param,
        msg: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// GET /api/reports - Liste des rapports journaliers (Admin)
router.get("/", authenticateUser, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const shipId = req.query.ship_id;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    let whereClause = "";
    let params = [limit, offset];
    let paramIndex = 3;

    if (shipId) {
      whereClause += ` WHERE dr.ship_id = $${paramIndex}`;
      params.push(shipId);
      paramIndex++;
    }

    if (startDate) {
      whereClause += shipId ? " AND" : " WHERE";
      whereClause += ` dr.report_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += shipId || startDate ? " AND" : " WHERE";
      whereClause += ` dr.report_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const result = await query(
      `
      SELECT dr.*, s.name as ship_name, s.type as ship_type
      FROM daily_reports dr
      JOIN ships s ON dr.ship_id = s.id
      ${whereClause}
      ORDER BY dr.report_date DESC, dr.update_at DESC
      LIMIT $1 OFFSET $2
    `,
      params
    );

    const countResult = await query(
      `
      SELECT COUNT(*) 
      FROM daily_reports dr
      JOIN ships s ON dr.ship_id = s.id
      ${whereClause}
    `,
      params.slice(2)
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        reports: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Erreur récupération rapports:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});

// GET /api/reports/ship/:shipId - Rapports d'un navire spécifique
router.get("/ship/:shipId", authenticateAny, async (req, res) => {
  try {
    // Vérifier que l'utilisateur peut accéder à ces données
    if (
      req.authType === "ship" &&
      req.ship.id !== parseInt(req.params.shipId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé",
      });
    }

    const result = await query(
      `
      SELECT * FROM daily_reports 
      WHERE ship_id = $1 
      ORDER BY report_date DESC, update_at DESC
    `,
      [req.params.shipId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Erreur récupération rapports navire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});

// POST /api/reports - Créer un rapport journalier
router.post("/", authenticateAny, validateDailyReport, handleValidationErrors, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: errors.array(),
      });
    }

    const {
      ship_id,
      report_date,
      crew,
      visitors,
      sailing_eco,
      sailing_full,
      cargo_ops,
      lifting_ops,
      standby_offshore,
      standby_port,
      standby_anchorage,
      downtime,
      distance,
      operations,
      tanks,
      silos,
      fuel_transfers,
      fuel_oil_rob,
      fuel_oil_received,
      fuel_oil_consumed,
      fuel_oil_delivered,
      lub_oil_rob,
      lub_oil_received,
      lub_oil_consumed,
      lub_oil_delivered,
      fresh_water_rob,
      fresh_water_received,
      fresh_water_consumed,
      fresh_water_delivered,
      remarks,
      prepared_by,
      vessel_name,
    } = req.body;

    // Si c'est un navire connecté, vérifier qu'il modifie ses propres données
    if (req.authType === "ship" && req.ship.id !== ship_id) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez créer que vos propres rapports",
      });
    }

    // Vérifier si un rapport existe déjà pour cette date
    const existingReport = await query(
      `
      SELECT id FROM daily_reports 
      WHERE ship_id = $1 AND report_date = $2
    `,
      [ship_id, report_date]
    );

    if (existingReport.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Un rapport existe déjà pour cette date",
      });
    }

    const result = await query(
      `
      INSERT INTO daily_reports (
        ship_id, 
        report_date, 
        crew, 
        visitors, 
        sailing_eco, 
        sailing_full, 
        cargo_ops, 
        lifting_ops, 
        standby_offshore,
        standby_port,
        standby_anchorage,
        downtime,
        distance,
        operations,
        tanks,
        silos,
        fuel_transfers,
        fuel_oil_rob,
        fuel_oil_received,
        fuel_oil_consumed,
        fuel_oil_delivered,
        lub_oil_rob,
        lub_oil_received,
        lub_oil_consumed,
        lub_oil_delivered,
        fresh_water_rob,
        fresh_water_received,
        fresh_water_consumed,
        fresh_water_delivered,
        remarks,
        prepared_by,
        vessel_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
      RETURNING *
    `,
      [
        ship_id,
        report_date,
        crew,
        visitors,
        sailing_eco,
        sailing_full,
        cargo_ops,
        lifting_ops,
        standby_offshore,
        standby_port,
        standby_anchorage,
        downtime,
        distance,
        JSON.stringify(operations),
        JSON.stringify(tanks),
        JSON.stringify(silos),
        JSON.stringify(fuel_transfers),
        fuel_oil_rob,
        fuel_oil_received,
        fuel_oil_consumed,
        fuel_oil_delivered,
        lub_oil_rob,
        lub_oil_received,
        lub_oil_consumed,
        lub_oil_delivered,
        fresh_water_rob,
        fresh_water_received,
        fresh_water_consumed,
        fresh_water_delivered,
        remarks,
        prepared_by,
        vessel_name
     ]
    );

    res.status(201).json({
      success: true,
      message: "Rapport journalier créé avec succès",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur création rapport:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});

// GET /api/reports/:id - Récupérer un rapport spécifique
router.get('/:id', authenticateAny, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT dr.*, s.name as ship_name 
      FROM daily_reports dr
      JOIN ships s ON dr.ship_id = s.id
      WHERE dr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    const report = result.rows[0];

    // Vérifier l'accès
    if (req.authType === 'ship' && req.ship.id !== report.ship_id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Erreur récupération rapport:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});


// PUT /api/reports/:id - Modifier un rapport journalier
router.put("/:id", authenticateAny, async (req, res) => {
  try {
    const { go_consumed, notes } = req.body;

    // Si c'est un navire connecté, vérifier qu'il modifie ses propres données
    if (req.authType === "ship") {
      const reportCheck = await query(
        `
        SELECT ship_id FROM daily_reports WHERE id = $1
      `,
        [req.params.id]
      );

      if (reportCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Rapport non trouvé",
        });
      }

      if (reportCheck.rows[0].ship_id !== req.ship.id) {
        return res.status(403).json({
          success: false,
          message: "Vous ne pouvez modifier que vos propres rapports",
        });
      }
    }

    const result = await query(
      `
      UPDATE daily_reports SET
        go_consumed = COALESCE($2, go_consumed),
        notes = COALESCE($3, notes),
        update_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
      [req.params.id, go_consumed, notes]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Rapport non trouvé",
      });
    }

    res.json({
      success: true,
      message: "Rapport mis à jour avec succès",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur mise à jour rapport:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});

// DELETE /api/reports/:id - Supprimer un rapport journalier
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const result = await query(
      "DELETE FROM daily_reports WHERE id = $1 RETURNING id",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Rapport non trouvé",
      });
    }

    res.json({
      success: true,
      message: "Rapport supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression rapport:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});

// GET /api/reports/stats - Statistiques des rapports
router.get("/stats", authenticateUser, async (req, res) => {
  try {
    const totalReportsResult = await query(`
      SELECT COUNT(*) as total_reports,
             COUNT(DISTINCT ship_id) as ships_reporting,
             AVG(go_consumed) as avg_consumption
      FROM daily_reports
    `);

    const weeklyStatsResult = await query(`
      SELECT SUM(go_consumed) as weekly_consumption,
             COUNT(*) as weekly_reports
      FROM daily_reports
      WHERE report_date >= CURRENT_DATE - INTERVAL '7 days'
    `);

    const topConsumersResult = await query(`
      SELECT s.name, s.type, SUM(dr.go_consumed) as total_consumption
      FROM daily_reports dr
      JOIN ships s ON dr.ship_id = s.id
      WHERE dr.report_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY s.id, s.name, s.type
      ORDER BY total_consumption DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        total_reports: parseInt(totalReportsResult.rows[0].total_reports) || 0,
        ships_reporting:
          parseInt(totalReportsResult.rows[0].ships_reporting) || 0,
        avg_consumption:
          parseFloat(totalReportsResult.rows[0].avg_consumption) || 0,
        weekly_consumption:
          parseFloat(weeklyStatsResult.rows[0].weekly_consumption) || 0,
        weekly_reports: parseInt(weeklyStatsResult.rows[0].weekly_reports) || 0,
        top_consumers: topConsumersResult.rows,
      },
    });
  } catch (error) {
    console.error("Erreur récupération statistiques:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});

export default router;
