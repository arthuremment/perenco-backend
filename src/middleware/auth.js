import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

// Middleware d'authentification pour les utilisateurs admin
export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'user') {
      return res.status(401).json({
        success: false,
        message: 'Type de token invalide'
      });
    }

    const result = await query(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé ou inactif'
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
};

// Middleware d'authentification pour les navires
export const authenticateShip = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'ship') {
      return res.status(401).json({
        success: false,
        message: 'Type de token invalide'
      });
    }

    const result = await query(
      'SELECT id, name, type, status, captain, username FROM ships WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Navire non trouvé'
      });
    }

    req.ship = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
};

// Middleware de vérification des rôles
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }

    next();
  };
};

// Middleware pour authentifier soit un utilisateur soit un navire
export const authenticateAny = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type === 'user') {
      const result = await query(
        'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé ou inactif'
        });
      }

      req.user = result.rows[0];
      req.authType = 'user';
    } else if (decoded.type === 'ship') {
      const result = await query(
        'SELECT id, name, type, status, captain, username FROM ships WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Navire non trouvé'
        });
      }

      req.ship = result.rows[0];
      req.authType = 'ship';
    } else {
      return res.status(401).json({
        success: false,
        message: 'Type de token invalide'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
};