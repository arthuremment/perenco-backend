// Middleware pour les routes non trouvées
export const notFound = (req, res, next) => {
  const error = new Error(`Route non trouvée - ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: error.message,
    availableRoutes: [
      'GET /health',
      'POST /api/auth/login/admin',
      'POST /api/auth/login/ship',
      'GET /api/auth/me',
      'GET /api/ships',
      'POST /api/ships',
      'GET /api/ships/:id',
      'PUT /api/ships/:id',
      'DELETE /api/ships/:id',
      'GET /api/ships/me/profile'
    ]
  });
};