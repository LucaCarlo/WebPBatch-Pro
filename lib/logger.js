const fs = require('fs');
const path = require('path');

function getLogger(logDir) {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, `webpbatch-${new Date().toISOString().slice(0, 10)}.log`);
  const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

  function formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    let line = `[${timestamp}] [${level}] ${message}`;
    if (data) {
      if (data instanceof Error) {
        line += ` | ${data.message}\n${data.stack}`;
      } else if (typeof data === 'object') {
        line += ` | ${JSON.stringify(data)}`;
      } else {
        line += ` | ${data}`;
      }
    }
    return line + '\n';
  }

  function write(level, message, data) {
    try {
      // Rotate if needed
      if (fs.existsSync(logFile)) {
        const stat = fs.statSync(logFile);
        if (stat.size > MAX_LOG_SIZE) {
          const rotated = logFile + '.old';
          if (fs.existsSync(rotated)) fs.unlinkSync(rotated);
          fs.renameSync(logFile, rotated);
        }
      }
      fs.appendFileSync(logFile, formatMessage(level, message, data));
    } catch {
      // Silently ignore logging errors
    }
  }

  return {
    info(message, data) { write('INFO', message, data); },
    warn(message, data) { write('WARN', message, data); },
    error(message, data) { write('ERROR', message, data); },

    getRecentLog(lines = 200) {
      try {
        if (!fs.existsSync(logFile)) return 'No log file found.';
        const content = fs.readFileSync(logFile, 'utf-8');
        const allLines = content.split('\n');
        return allLines.slice(-lines).join('\n');
      } catch {
        return 'Error reading log file.';
      }
    },

    getLogPath() {
      return logFile;
    }
  };
}

module.exports = { getLogger };
