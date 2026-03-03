const express = require('express');
const router = express.Router();
const IDGenerator = require('../utils/idGenerator');
const Logger = require('../utils/logger');

const logger = new Logger();

/**
 * API Routes for AnyDesk application
 */

// Generate new connection ID
router.post('/api/generate-id', (req, res) => {
  try {
    const connectionID = IDGenerator.generateUniqueID();
    const sessionID = IDGenerator.generateSessionID();
    
    logger.success('New connection ID generated', {
      connectionID,
      sessionID
    });

    res.json({
      success: true,
      connectionID,
      sessionID,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error generating ID', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate ID' });
  }
});

// Validate connection ID
router.post('/api/validate-id', (req, res) => {
  try {
    const { connectionID } = req.body;

    if (!connectionID) {
      return res.status(400).json({ success: false, error: 'Connection ID required' });
    }

    const isValid = IDGenerator.isValidConnectionID(connectionID);

    res.json({
      success: true,
      isValid,
      connectionID
    });
  } catch (error) {
    logger.error('Error validating ID', { error: error.message });
    res.status(500).json({ success: false, error: 'Validation failed' });
  }
});

// Get connection status
router.get('/api/status/:connectionID', (req, res) => {
  try {
    const { connectionID } = req.params;

    // In a real app, this would query a database
    res.json({
      success: true,
      connectionID,
      status: 'available',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching status', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch status' });
  }
});

// Get server configuration (ICE servers for WebRTC)
router.get('/api/config', (req, res) => {
  try {
    const config = require('../config/config');
    
    res.json({
      success: true,
      iceServers: config.webrtc.iceServers,
      maxFileSize: config.fileTransfer.maxFileSize,
      chunkSize: config.fileTransfer.chunkSize
    });
  } catch (error) {
    logger.error('Error fetching config', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch configuration' });
  }
});

// Health check
router.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
