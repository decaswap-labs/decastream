"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.ConsoleLogger = void 0;
class ConsoleLogger {
    getTimestamp() {
        return new Date().toISOString();
    }
    formatMessage(level, message, data) {
        const timestamp = this.getTimestamp();
        const dataStr = data ? ` | ${JSON.stringify(data, null, 2)}` : '';
        return `[${timestamp}] [${level}] ${message}${dataStr}`;
    }
    info(message, data) {
        console.log(this.formatMessage('INFO', message, data));
    }
    warn(message, data) {
        console.warn(this.formatMessage('WARN', message, data));
    }
    error(message, error) {
        console.error(this.formatMessage('ERROR', message, error));
    }
    debug(message, data) {
        if (process.env.NODE_ENV === 'development') {
            console.log(this.formatMessage('DEBUG', message, data));
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
// Export singleton instance
exports.logger = new ConsoleLogger();
//# sourceMappingURL=logger.js.map