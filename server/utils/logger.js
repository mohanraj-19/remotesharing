const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logFile = './logs/app.log') {
    this.logFile = logFile;
    this.logDir = path.dirname(logFile);
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Write log to file and console
   */
  write(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...metadata
    };

    const logString = `[${timestamp}] [${level}] ${message} ${Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : ''}`;
    
    // Console output
    console[level.toLowerCase()]?.(logString) || console.log(logString);
    
    // File output
    try {
      fs.appendFileSync(this.logFile, logString + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  info(message, metadata = {}) {
    this.write('INFO', message, metadata);
  }

  error(message, metadata = {}) {
    this.write('ERROR', message, metadata);
  }

  warn(message, metadata = {}) {
    this.write('WARN', message, metadata);
  }

  debug(message, metadata = {}) {
    this.write('DEBUG', message, metadata);
  }

  success(message, metadata = {}) {
    this.write('SUCCESS', message, metadata);
  }

  /**
   * Log connection event
   */
  logConnection(event, userID, metadata = {}) {
    this.info(`Connection Event: ${event}`, {
      userID,
      ...metadata
    });
  }

  /**
   * Log remote control action
   */
  logRemoteControl(action, fromUser, toUser, metadata = {}) {
    this.info(`Remote Control: ${action}`, {
      fromUser,
      toUser,
      ...metadata
    });
  }

  /**
   * Log file transfer
   */
  logFileTransfer(event, fromUser, toUser, fileName, size) {
    this.info(`File Transfer: ${event}`, {
      fromUser,
      toUser,
      fileName,
      size
    });
  }

  /**
   * Clear old logs (older than days)
   */
  clearOldLogs(days = 7) {
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    const stats = fs.statSync(this.logFile);
    
    if (stats.mtime.getTime() < cutoffDate) {
      fs.unlinkSync(this.logFile);
      this.info('Old log file cleared');
    }
  }
}

module.exports = Logger;
