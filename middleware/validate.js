/**
 * INPUT VALIDATION MIDDLEWARE - Enterprise Production Ready
 * Validates and sanitizes ALL user input to prevent injection attacks
 */

const logger = require('../utils/logger').loggers.security;

/**
 * Validation schema types
 */
const TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  TELEGRAM_ID: 'telegram_id',
  WALLET_ADDRESS: 'wallet_address',
  EMAIL: 'email',
  URL: 'url',
  HASH: 'hash',
  ENUM: 'enum'
};

/**
 * Validate single value against schema
 */
function validateValue(value, schema, fieldName) {
  const errors = [];

  // Required check
  if (schema.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors, value: null };
  }

  // If optional and not provided, return
  if (!schema.required && (value === undefined || value === null)) {
    return { valid: true, errors: [], value: schema.default || null };
  }

  let sanitizedValue = value;

  // Type validation and sanitization
  switch (schema.type) {
    case TYPES.STRING:
      if (typeof value !== 'string') {
        errors.push(`${fieldName} must be a string`);
      } else {
        // Sanitize: trim whitespace
        sanitizedValue = value.trim();

        // Length validation
        if (schema.minLength && sanitizedValue.length < schema.minLength) {
          errors.push(`${fieldName} must be at least ${schema.minLength} characters`);
        }
        if (schema.maxLength && sanitizedValue.length > schema.maxLength) {
          errors.push(`${fieldName} must be at most ${schema.maxLength} characters`);
        }

        // Pattern validation
        if (schema.pattern && !schema.pattern.test(sanitizedValue)) {
          errors.push(`${fieldName} format is invalid`);
        }
      }
      break;

    case TYPES.NUMBER:
    case TYPES.INTEGER:
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`${fieldName} must be a number`);
      } else {
        if (schema.type === TYPES.INTEGER && !Number.isInteger(num)) {
          errors.push(`${fieldName} must be an integer`);
        }

        sanitizedValue = num;

        // Range validation
        if (schema.min !== undefined && num < schema.min) {
          errors.push(`${fieldName} must be at least ${schema.min}`);
        }
        if (schema.max !== undefined && num > schema.max) {
          errors.push(`${fieldName} must be at most ${schema.max}`);
        }
      }
      break;

    case TYPES.BOOLEAN:
      if (typeof value === 'boolean') {
        sanitizedValue = value;
      } else if (typeof value === 'string') {
        if (value.toLowerCase() === 'true' || value === '1') {
          sanitizedValue = true;
        } else if (value.toLowerCase() === 'false' || value === '0') {
          sanitizedValue = false;
        } else {
          errors.push(`${fieldName} must be a boolean`);
        }
      } else {
        errors.push(`${fieldName} must be a boolean`);
      }
      break;

    case TYPES.TELEGRAM_ID:
      // Telegram IDs are positive integers, typically 9-10 digits
      const telegramId = String(value);
      if (!/^\d{6,15}$/.test(telegramId)) {
        errors.push(`${fieldName} must be a valid Telegram ID (6-15 digits)`);
      } else {
        sanitizedValue = telegramId;
      }
      break;

    case TYPES.WALLET_ADDRESS:
      // TON wallet addresses start with UQ, EQ, or 0:
      const wallet = String(value);
      if (!/^(UQ|EQ|0:)[a-zA-Z0-9_-]{46,48}$/.test(wallet)) {
        errors.push(`${fieldName} must be a valid TON wallet address`);
      } else {
        sanitizedValue = wallet;
      }
      break;

    case TYPES.EMAIL:
      const email = String(value).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`${fieldName} must be a valid email address`);
      } else {
        sanitizedValue = email;
      }
      break;

    case TYPES.URL:
      try {
        new URL(value);
        sanitizedValue = String(value);
      } catch {
        errors.push(`${fieldName} must be a valid URL`);
      }
      break;

    case TYPES.HASH:
      // Hex hash (like transaction hash)
      const hash = String(value);
      if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
        errors.push(`${fieldName} must be a valid hash (64 hex characters)`);
      } else {
        sanitizedValue = hash.toLowerCase();
      }
      break;

    case TYPES.ENUM:
      if (!schema.values || !schema.values.includes(value)) {
        errors.push(`${fieldName} must be one of: ${schema.values.join(', ')}`);
      } else {
        sanitizedValue = value;
      }
      break;

    default:
      errors.push(`Unknown validation type for ${fieldName}`);
  }

  // Custom validator
  if (schema.validator && typeof schema.validator === 'function') {
    const customResult = schema.validator(sanitizedValue);
    if (customResult !== true) {
      errors.push(customResult || `${fieldName} is invalid`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? sanitizedValue : null
  };
}

/**
 * Validate request against schema
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    const sanitized = {};

    // Validate body
    if (schema.body) {
      for (const [field, fieldSchema] of Object.entries(schema.body)) {
        const result = validateValue(req.body[field], fieldSchema, field);
        if (!result.valid) {
          errors.push(...result.errors);
        } else {
          sanitized[field] = result.value;
        }
      }
    }

    // Validate query
    if (schema.query) {
      for (const [field, fieldSchema] of Object.entries(schema.query)) {
        const result = validateValue(req.query[field], fieldSchema, field);
        if (!result.valid) {
          errors.push(...result.errors);
        } else {
          sanitized[field] = result.value;
        }
      }
    }

    // Validate params
    if (schema.params) {
      for (const [field, fieldSchema] of Object.entries(schema.params)) {
        const result = validateValue(req.params[field], fieldSchema, field);
        if (!result.valid) {
          errors.push(...result.errors);
        } else {
          sanitized[field] = result.value;
        }
      }
    }

    if (errors.length > 0) {
      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Attach sanitized values
    req.validated = sanitized;

    logger.debug('Validation passed', {
      path: req.path,
      method: req.method
    });

    next();
  };
}

/**
 * Common validation schemas
 */
const commonSchemas = {
  userId: {
    type: TYPES.TELEGRAM_ID,
    required: true
  },
  walletAddress: {
    type: TYPES.WALLET_ADDRESS,
    required: true
  },
  amount: {
    type: TYPES.NUMBER,
    required: true,
    min: 0
  },
  taps: {
    type: TYPES.INTEGER,
    required: true,
    min: 1,
    max: 10000
  },
  poolId: {
    type: TYPES.STRING,
    required: true,
    pattern: /^[a-z0-9_-]+$/,
    maxLength: 50
  },
  limit: {
    type: TYPES.INTEGER,
    required: false,
    default: 50,
    min: 1,
    max: 500
  },
  offset: {
    type: TYPES.INTEGER,
    required: false,
    default: 0,
    min: 0
  }
};

module.exports = {
  validate,
  TYPES,
  commonSchemas,
  validateValue
};
