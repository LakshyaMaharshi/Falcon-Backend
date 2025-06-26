const ErrorResponse = require("../utils/errorResponse")

const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log to console for dev
  console.log(err)

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found"
    error = new ErrorResponse(message, 404)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = "Duplicate field value entered"

    // Extract field name from error
    const field = Object.keys(err.keyValue)[0]
    const value = err.keyValue[field]

    if (field === "email") {
      message = `Email ${value} is already registered`
    } else if (field === "slug") {
      message = `A resource with this name already exists`
    } else {
      message = `${field} '${value}' already exists`
    }

    error = new ErrorResponse(message, 400)
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ")
    error = new ErrorResponse(message, 400)
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token"
    error = new ErrorResponse(message, 401)
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired"
    error = new ErrorResponse(message, 401)
  }

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    const message = "File too large"
    error = new ErrorResponse(message, 400)
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    const message = "Unexpected file field"
    error = new ErrorResponse(message, 400)
  }

  // MongoDB connection errors
  if (err.name === "MongoNetworkError") {
    const message = "Database connection error"
    error = new ErrorResponse(message, 500)
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = "Too many requests, please try again later"
    error = new ErrorResponse(message, 429)
  }

  // Payment gateway errors
  if (err.type === "StripeCardError") {
    const message = `Payment failed: ${err.message}`
    error = new ErrorResponse(message, 400)
  }

  // File upload errors
  if (err.code === "ENOENT") {
    const message = "File not found"
    error = new ErrorResponse(message, 404)
  }

  // Default error response
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      error: err,
    }),
  })
}

module.exports = errorHandler
