import { Logger } from './types';
export declare class ConsoleLogger implements Logger {
    private getTimestamp;
    private formatMessage;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: any): void;
    debug(message: string, data?: any): void;
}
export declare const logger: ConsoleLogger;
//# sourceMappingURL=logger.d.ts.map