const { body, param, query, validationResult } = require("express-validator")

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }))

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errorMessages,
    })
  }

  next()
}

// User validation rules
exports.validateUserRegistration = [
  body("fullName").trim().isLength({ min: 2, max: 100 }).withMessage("Full name must be between 2 and 100 characters"),

  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),

  body("phone").isMobilePhone().withMessage("Please provide a valid phone number"),

  body("userType").isIn(["student", "jobseeker", "employer", "admin"]).withMessage("Invalid user type"),

  exports.handleValidationErrors,
]

exports.validateUserLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),

  exports.handleValidationErrors,
]

exports.validatePasswordReset = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),

  exports.handleValidationErrors,
]

exports.validatePasswordUpdate = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("New password must contain at least one uppercase letter, one lowercase letter, and one number"),

  exports.handleValidationErrors,
]

// Course validation rules
exports.validateCourseCreation = [
  body("title").trim().isLength({ min: 5, max: 200 }).withMessage("Course title must be between 5 and 200 characters"),

  body("description")
    .trim()
    .isLength({ min: 50, max: 2000 })
    .withMessage("Course description must be between 50 and 2000 characters"),

  body("category")
    .isIn([
      "web-development",
      "mobile-development",
      "data-science",
      "ai-ml",
      "cybersecurity",
      "devops",
      "ui-ux",
      "digital-marketing",
      "other",
    ])
    .withMessage("Invalid course category"),

  body("level").isIn(["beginner", "intermediate", "advanced"]).withMessage("Invalid course level"),

  body("duration.hours").isInt({ min: 1, max: 1000 }).withMessage("Duration hours must be between 1 and 1000"),

  body("duration.weeks").isInt({ min: 1, max: 52 }).withMessage("Duration weeks must be between 1 and 52"),

  body("pricing.type").isIn(["free", "paid"]).withMessage("Invalid pricing type"),

  body("pricing.amount")
    .if(body("pricing.type").equals("paid"))
    .isFloat({ min: 1 })
    .withMessage("Price must be greater than 0 for paid courses"),

  exports.handleValidationErrors,
]

// Job validation rules
exports.validateJobCreation = [
  body("title").trim().isLength({ min: 5, max: 200 }).withMessage("Job title must be between 5 and 200 characters"),

  body("description")
    .trim()
    .isLength({ min: 100, max: 5000 })
    .withMessage("Job description must be between 100 and 5000 characters"),

  body("department")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Department must be between 2 and 100 characters"),

  body("category")
    .isIn(["engineering", "design", "marketing", "sales", "hr", "finance", "operations", "other"])
    .withMessage("Invalid job category"),

  body("jobType")
    .isIn(["full-time", "part-time", "contract", "internship", "freelance"])
    .withMessage("Invalid job type"),

  body("workMode").isIn(["remote", "on-site", "hybrid"]).withMessage("Invalid work mode"),

  body("location.city").trim().isLength({ min: 2, max: 100 }).withMessage("City must be between 2 and 100 characters"),

  body("experience.minimum")
    .isInt({ min: 0, max: 50 })
    .withMessage("Minimum experience must be between 0 and 50 years"),

  body("experience.maximum")
    .isInt({ min: 0, max: 50 })
    .withMessage("Maximum experience must be between 0 and 50 years")
    .custom((value, { req }) => {
      if (value < req.body.experience.minimum) {
        throw new Error("Maximum experience must be greater than or equal to minimum experience")
      }
      return true
    }),

  body("experience.level")
    .isIn(["entry", "mid", "senior", "lead", "executive"])
    .withMessage("Invalid experience level"),

  body("skills.required").isArray({ min: 1 }).withMessage("At least one required skill must be specified"),

  body("skills.required.*")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each skill must be between 1 and 50 characters"),

  exports.handleValidationErrors,
]

// Application validation rules
exports.validateJobApplication = [
  body("coverLetter")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Cover letter cannot exceed 2000 characters"),

  body("screeningResponses").optional().isArray().withMessage("Screening responses must be an array"),

  body("screeningResponses.*.questionId")
    .if(body("screeningResponses").exists())
    .isMongoId()
    .withMessage("Invalid question ID"),

  body("screeningResponses.*.answer")
    .if(body("screeningResponses").exists())
    .trim()
    .notEmpty()
    .withMessage("Answer is required for screening questions"),

  exports.handleValidationErrors,
]

// Payment validation rules
exports.validatePayment = [
  body("amount.original").isFloat({ min: 0 }).withMessage("Original amount must be a positive number"),

  body("amount.final").isFloat({ min: 0 }).withMessage("Final amount must be a positive number"),

  body("currency").isIn(["INR", "USD", "EUR"]).withMessage("Invalid currency"),

  body("paymentMethod")
    .isIn(["credit_card", "debit_card", "net_banking", "upi", "wallet", "bank_transfer", "cash"])
    .withMessage("Invalid payment method"),

  body("paymentGateway")
    .isIn(["stripe", "razorpay", "payu", "paypal", "manual"])
    .withMessage("Invalid payment gateway"),

  body("paymentType")
    .isIn(["course_enrollment", "certification", "premium_subscription", "job_posting", "other"])
    .withMessage("Invalid payment type"),

  exports.handleValidationErrors,
]

// Notification validation rules
exports.validateNotification = [
  body("title").trim().isLength({ min: 1, max: 200 }).withMessage("Title must be between 1 and 200 characters"),

  body("message").trim().isLength({ min: 1, max: 1000 }).withMessage("Message must be between 1 and 1000 characters"),

  body("type")
    .isIn([
      "course_enrollment",
      "course_completion",
      "assignment_due",
      "quiz_available",
      "certificate_issued",
      "job_application",
      "interview_scheduled",
      "application_status",
      "payment_success",
      "payment_failed",
      "system_announcement",
      "reminder",
      "welcome",
      "other",
    ])
    .withMessage("Invalid notification type"),

  body("category")
    .optional()
    .isIn(["info", "success", "warning", "error", "reminder"])
    .withMessage("Invalid notification category"),

  body("priority").optional().isIn(["low", "medium", "high", "urgent"]).withMessage("Invalid notification priority"),

  exports.handleValidationErrors,
]

// Parameter validation
exports.validateObjectId = (paramName) => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} ID`),

  exports.handleValidationErrors,
]

// Query validation
exports.validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),

  query("sort")
    .optional()
    .isIn(["createdAt", "-createdAt", "updatedAt", "-updatedAt", "title", "-title", "name", "-name"])
    .withMessage("Invalid sort parameter"),

  exports.handleValidationErrors,
]

// File upload validation
exports.validateFileUpload = (allowedTypes = [], maxSize = 10485760) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      })
    }

    const file = req.file || (req.files && req.files[0])

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      })
    }

    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`,
      })
    }

    next()
  }
}
