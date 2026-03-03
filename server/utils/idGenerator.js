const { v4: uuidv4 } = require('uuid');

class IDGenerator {
  /**
   * Generate a unique connection ID
   * Format: ANYX-XXXX-XXXX (Easy to remember like AnyDesk)
   */
  static generateUniqueID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    
    // Generate 3 groups of 4 characters each
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < 2) id += '-';
    }
    
    return id;
  }

  /**
   * Generate a session UUID
   */
  static generateSessionID() {
    return uuidv4();
  }

  /**
   * Generate a peer ID for WebRTC
   */
  static generatePeerID() {
    return `peer-${uuidv4().split('-')[0]}`;
  }

  /**
   * Validate connection ID format
   */
  static isValidConnectionID(id) {
    const regex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return regex.test(id);
  }

  /**
   * Generate a file transfer ID
   */
  static generateFileTransferID() {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = IDGenerator;
