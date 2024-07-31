const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors, colorize } = format;

const customFormat = printf((info) => {
    info.correlationId = info.correlationId || 'not provided'; // Default logId if not provided
    const levelSymbol = Symbol.for('level');
    if (info[levelSymbol] === 'error') {
        const { level, message, timestamp, correlationId, stack } = info;
        return `[${level}] \n[Correlation-ID]: ${correlationId}\n[${timestamp}] [${message}] \n\n${stack ? stack.stack : ''}`
    } else {
        const { level, message, timestamp, correlationId } = info;
        return `[${level}] \n[Correlation-ID]: ${correlationId}\n[${timestamp}] [${message}]`
    }
})


const logger = createLogger({
    format: combine(
        colorize(),
        timestamp({ format: 'HH:mm' }),
        errors({ stack: true }), // <-- use this to capture stack trace error 
        customFormat
    ),
    // transports: [
    //     new transports.Console()
    // ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console());
}

module.exports = { logger };
/**
const error1 = new Error('something went wrong');
logger.error({ message: 'from message 1', logId: '01', stack: error1 })

logger.warn({ message: 'from message 1' })

logger.info({ message: 'fwef', logId: '02' })
  
*/
