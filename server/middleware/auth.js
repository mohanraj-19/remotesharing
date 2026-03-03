const Logger = require('../utils/logger');
const logger = new Logger();

/**
 * Simple middleware to validate session
 */
function validateSession(req, res, next) {
  const sessionID = req.query.sessionID || req.body.sessionID;
  
  if (!sessionID) {
    logger.warn('Unauthorized access attempt', { ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized: Missing session ID' });
  }

  // Attach session info to request
  req.sessionID = sessionID;
  req.userID = sessionID.split('-')[0];

  next();
}

/**
 * Rate limiting middleware
 */
function rateLimit(windowMs = 60000, maxRequests = 30) {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);
    
    // Clean old requests
    const validRequests = userRequests.filter(time => now - time < windowMs);
    requests.set(key, validRequests);

    if (validRequests.length >= maxRequests) {
      logger.warn('Rate limit exceeded', { ip: req.ip });
      return res.status(429).json({ error: 'Too many requests' });
    }

    validRequests.push(now);
    next();
  };
}

module.exports = {
  validateSession,
  rateLimit
};
