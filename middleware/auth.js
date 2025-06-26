const jwt = require("jsonwebtoken")
const User = require("../models/User")

// Protect routes - require authentication
exports.protect = async (req, res, next) => {
  try {
    let token

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      })
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Get user from token
      const user = await User.findById(decoded.id).select("-password")

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "No user found with this token",
        })
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "User account is deactivated",
        })
      }

      // Check if user is blocked
      if (user.isBlocked) {
        return res.status(401).json({
          success: false,
          message: "User account is blocked",
        })
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(401).json({
          success: false,
          message: "Account is temporarily locked due to multiple failed login attempts",
        })
      }

      req.user = user
      next()
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      })
    }
  } catch (error) {
    next(error)
  }
}

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      })
    }
    next()
  }
}

// Grant access to specific user types
exports.authorizeUserType = (...userTypes) => {
  return (req, res, next) => {
    if (!userTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: `User type ${req.user.userType} is not authorized to access this route`,
      })
    }
    next()
  }
}

// Check specific permissions
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to ${permission}`,
      })
    }
    next()
  }
}

// Optional authentication - doesn't fail if no token
exports.optionalAuth = async (req, res, next) => {
  try {
    let token

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id).select("-password")

        if (user && user.isActive && !user.isBlocked && !user.isLocked) {
          req.user = user
        }
      } catch (err) {
        // Token invalid, but continue without user
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Check if user owns resource or is admin
exports.checkOwnership = (resourceModel, resourceIdParam = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam]
      const resource = await resourceModel.findById(resourceId)

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
        })
      }

      // Admin can access everything
      if (req.user.role === "admin" || req.user.role === "super_admin") {
        req.resource = resource
        return next()
      }

      // Check ownership based on different fields
      let isOwner = false

      if (resource.user && resource.user.toString() === req.user._id.toString()) {
        isOwner = true
      } else if (resource.student && resource.student.toString() === req.user._id.toString()) {
        isOwner = true
      } else if (resource.applicant && resource.applicant.toString() === req.user._id.toString()) {
        isOwner = true
      } else if (resource.employer && resource.employer.toString() === req.user._id.toString()) {
        isOwner = true
      } else if (resource._id.toString() === req.user._id.toString()) {
        isOwner = true
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this resource",
        })
      }

      req.resource = resource
      next()
    } catch (error) {
      next(error)
    }
  }
}
