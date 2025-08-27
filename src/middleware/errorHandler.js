// Middleware de gestion d'erreurs globales
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur
  console.error('❌ Erreur:', err);

  // Erreur de contrainte d'unicité PostgreSQL
  if (err.code === '23505') {
    const message = 'Ressource déjà existante (contrainte d\'unicité violée)';
    error = { message, statusCode: 400 };
  }

  // Erreur de clé étrangère PostgreSQL
  if (err.code === '23503') {
    const message = 'Référence invalide (clé étrangère)';
    error = { message, statusCode: 400 };
  }

  // Erreur de validation PostgreSQL
  if (err.code === '23514') {
    const message = 'Données invalides (contrainte de validation)';
    error = { message, statusCode: 400 };
  }

  // Erreur de connexion PostgreSQL
  if (err.code === 'ECONNREFUSED') {
    const message = 'Erreur de connexion à la base de données';
    error = { message, statusCode: 503 };
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token invalide';
    error = { message, statusCode: 401 };
  }

  // Erreur JWT expiré
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expiré';
    error = { message, statusCode: 401 };
  }

  // Erreur de syntaxe JSON
  if (err.type === 'entity.parse.failed') {
    const message = 'Format JSON invalide';
    error = { message, statusCode: 400 };
  }

  // Erreur de taille de payload
  if (err.type === 'entity.too.large') {
    const message = 'Payload trop volumineux';
    error = { message, statusCode: 413 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};