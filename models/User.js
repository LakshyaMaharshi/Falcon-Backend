const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"],
    },

    // User Type and Role
    userType: {
      type: String,
      enum: ["student", "jobseeker", "employer", "admin"],
      required: true,
      default: "student",
    },
    role: {
      type: String,
      enum: ["user", "moderator", "admin", "super_admin"],
      default: "user",
    },
    permissions: [
      {
        type: String,
        enum: ["read", "write", "delete", "manage_users", "manage_courses", "manage_payments", "view_analytics"],
      },
    ],

    // Profile Information
    avatar: {
      type: String,
      default: null,
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },

    // Professional Information
    education: [
      {
        institution: String,
        degree: String,
        fieldOfStudy: String,
        startDate: Date,
        endDate: Date,
        grade: String,
        isCurrentlyStudying: { type: Boolean, default: false },
      },
    ],
    experience: [
      {
        company: String,
        position: String,
        startDate: Date,
        endDate: Date,
        description: String,
        isCurrentJob: { type: Boolean, default: false },
      },
    ],
    skills: [String],
    resume: {
      filename: String,
      fileId: mongoose.Schema.Types.ObjectId,
      uploadDate: { type: Date, default: Date.now },
    },

    // Company Information (for employers)
    company: {
      name: String,
      website: String,
      industry: String,
      size: {
        type: String,
        enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
      },
      description: String,
      logo: String,
    },

    // Account Status
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    // Verification and Reset Tokens
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Preferences and Settings
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      marketingEmails: { type: Boolean, default: true },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "Asia/Kolkata" },
    },

    // Tracking
    registrationSource: {
      type: String,
      enum: ["website", "mobile_app", "referral", "social_media", "advertisement"],
      default: "website",
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes for better performance
userSchema.index({ email: 1 })
userSchema.index({ userType: 1 })
userSchema.index({ isActive: 1 })
userSchema.index({ createdAt: -1 })

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now())
})

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  const salt = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// Method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Method to generate JWT token
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      userType: this.userType,
      role: this.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE },
  )
}

// Method to generate refresh token
userSchema.methods.getRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE })
}

// Method to generate email verification token
userSchema.methods.getEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(20).toString("hex")

  this.emailVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex")

  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

  return verificationToken
}

// Method to generate password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex")

  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex")

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000 // 10 minutes

  return resetToken
}

// Method to handle failed login attempts
userSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    })
  }

  const updates = { $inc: { loginAttempts: 1 } }

  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 } // 2 hours
  }

  return this.updateOne(updates)
}

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  })
}

module.exports = mongoose.model("User", userSchema)
