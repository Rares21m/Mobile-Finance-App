const isDev = process.env.NODE_ENV !== "production";

function normalizeArg(arg) {
  if (arg instanceof Error) {
    return {
      name: arg.name,
      message: arg.message,
      stack: arg.stack
    };
  }

  return arg;
}

function write(level, args) {
  const timestamp = new Date().toISOString();
  const [first, ...rest] = args;
  const message = typeof first === "string" ? first : "log";
  const meta =
  typeof first === "string" ?
  rest.map(normalizeArg) :
  [first, ...rest].map(normalizeArg);

  const entry = {
    timestamp,
    level,
    message
  };

  if (meta.length > 0) {
    entry.meta = meta.length === 1 ? meta[0] : meta;
  }

  const out = JSON.stringify(entry);
  if (level === "error") return console.error(out);
  if (level === "warn") return console.warn(out);
  return console.log(out);
}

const logger = {
  info: (...args) => write("info", args),
  warn: (...args) => write("warn", args),
  error: (...args) => write("error", args),
  debug: (...args) => {
    if (isDev) write("debug", args);
  }
};

module.exports = logger;