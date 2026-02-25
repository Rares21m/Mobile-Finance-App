/**
 * @fileoverview Lightweight logger utility for the Novence API server.
 * Wraps console methods so logging can be easily extended later
 * (e.g. structured JSON, external services) without touching every file.
 *
 * In production the `debug` level is silenced automatically.
 */

const isDev = process.env.NODE_ENV !== "production";

const logger = {
    /** Informational messages – always printed. */
    info: (...args) => console.log("[INFO]", ...args),

    /** Warnings – always printed. */
    warn: (...args) => console.warn("[WARN]", ...args),

    /** Errors – always printed. */
    error: (...args) => console.error("[ERROR]", ...args),

    /** Debug messages – only printed in non-production environments. */
    debug: (...args) => {
        if (isDev) console.log("[DEBUG]", ...args);
    },
};

module.exports = logger;
