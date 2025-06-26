const mongoose = require("mongoose")

const jobSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },

    // Company Information
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    company: {
      name: String,
      logo: String,
      website: String,
      industry: String,
    },

    // Job Details
    department: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["engineering", "design", "marketing", "sales", "hr", "finance", "operations", "other"],
    },
    jobType: {
      type: String,
      required: true,
      enum: ["full-time", "part-time", "contract", "internship", "freelance"],
    },
    workMode: {
      type: String,
      required: true,
      enum: ["remote", "on-site", "hybrid"],
    },

    // Location
    location: {
      city: {
        type: String,
        required: true,
      },
      state: String,
      country: {
        type: String,
        default: "India",
      },
      isRemote: {
        type: Boolean,
        default: false,
      },
    },

    // Experience and Skills
    experience: {
      minimum: {
        type: Number,
        required: true,
        min: 0,
      },
      maximum: {
        type: Number,
        required: true,
      },
      level: {
        type: String,
        enum: ["entry", "mid", "senior", "lead", "executive"],
        required: true,
      },
    },

    skills: {
      required: [
        {
          type: String,
          required: true,
        },
      ],
      preferred: [String],
      technologies: [String],
    },

    // Education Requirements
    education: {
      minimumQualification: {
        type: String,
        enum: ["high-school", "diploma", "bachelor", "master", "phd"],
        required: true,
      },
      preferredFields: [String],
      certifications: [String],
    },

    // Compensation
    salary: {
      minimum: Number,
      maximum: Number,
      currency: {
        type: String,
        default: "INR",
      },
      period: {
        type: String,
        enum: ["hourly", "monthly", "yearly"],
        default: "yearly",
      },
      isNegotiable: {
        type: Boolean,
        default: true,
      },
    },

    benefits: [String],

    // Job Requirements and Responsibilities
    responsibilities: [String],
    requirements: [String],
    niceToHave: [String],

    // Application Details
    applicationDeadline: Date,
    startDate: Date,
    applicationProcess: {
      steps: [
        {
          step: String,
          description: String,
          order: Number,
        },
      ],
      estimatedDuration: String, // e.g., "2-3 weeks"
      contactPerson: {
        name: String,
        email: String,
        phone: String,
      },
    },

    // Job Status and Settings
    status: {
      type: String,
      enum: ["draft", "active", "paused", "closed", "filled"],
      default: "draft",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },

    // Application Limits
    maxApplications: {
      type: Number,
      default: null, // null means unlimited
    },
    currentApplications: {
      type: Number,
      default: 0,
    },

    // Statistics
    stats: {
      views: {
        type: Number,
        default: 0,
      },
      applications: {
        type: Number,
        default: 0,
      },
      shortlisted: {
        type: Number,
        default: 0,
      },
      interviewed: {
        type: Number,
        default: 0,
      },
      hired: {
        type: Number,
        default: 0,
      },
    },

    // SEO and Visibility
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },
    tags: [String],

    // Internal Notes
    internalNotes: String,

    // Screening Questions
    screeningQuestions: [
      {
        question: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["text", "multiple_choice", "yes_no", "number"],
          required: true,
        },
        options: [String], // for multiple choice
        isRequired: {
          type: Boolean,
          default: true,
        },
        order: Number,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes
jobSchema.index({ slug: 1 })
jobSchema.index({ employer: 1 })
jobSchema.index({ status: 1 })
jobSchema.index({ category: 1 })
jobSchema.index({ jobType: 1 })
jobSchema.index({ "location.city": 1 })
jobSchema.index({ "experience.level": 1 })
jobSchema.index({ createdAt: -1 })
jobSchema.index({ applicationDeadline: 1 })

// Text index for search
jobSchema.index({
  title: "text",
  description: "text",
  "skills.required": "text",
  "company.name": "text",
})

// Virtual for days until deadline
jobSchema.virtual("daysUntilDeadline").get(function () {
  if (!this.applicationDeadline) return null
  const now = new Date()
  const deadline = new Date(this.applicationDeadline)
  const diffTime = deadline - now
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

// Virtual for is expired
jobSchema.virtual("isExpired").get(function () {
  if (!this.applicationDeadline) return false
  return new Date() > new Date(this.applicationDeadline)
})

// Virtual for salary range display
jobSchema.virtual("salaryRange").get(function () {
  if (!this.salary.minimum && !this.salary.maximum) return "Not disclosed"

  const formatSalary = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`
    if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`
    return amount.toString()
  }

  if (this.salary.minimum && this.salary.maximum) {
    return `${formatSalary(this.salary.minimum)} - ${formatSalary(this.salary.maximum)} ${this.salary.currency}`
  } else if (this.salary.minimum) {
    return `${formatSalary(this.salary.minimum)}+ ${this.salary.currency}`
  } else {
    return `Up to ${formatSalary(this.salary.maximum)} ${this.salary.currency}`
  }
})

// Pre-save middleware to generate slug
jobSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug =
      this.title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Date.now()
  }
  next()
})

// Method to increment view count
jobSchema.methods.incrementViews = function () {
  this.stats.views += 1
  return this.save()
}

// Method to check if applications are still open
jobSchema.methods.isApplicationOpen = function () {
  if (this.status !== "active") return false
  if (this.isExpired) return false
  if (this.maxApplications && this.currentApplications >= this.maxApplications) return false
  return true
}

// Method to increment application count
jobSchema.methods.incrementApplications = function () {
  this.stats.applications += 1
  this.currentApplications += 1
  return this.save()
}

// Static method to find jobs by criteria
jobSchema.statics.findByFilters = function (filters) {
  const query = {}

  if (filters.category) query.category = filters.category
  if (filters.jobType) query.jobType = filters.jobType
  if (filters.workMode) query.workMode = filters.workMode
  if (filters.location) query["location.city"] = new RegExp(filters.location, "i")
  if (filters.experience) query["experience.level"] = filters.experience
  if (filters.skills) query["skills.required"] = { $in: filters.skills }

  // Salary range filter
  if (filters.minSalary || filters.maxSalary) {
    query.$and = []
    if (filters.minSalary) {
      query.$and.push({
        $or: [{ "salary.minimum": { $gte: filters.minSalary } }, { "salary.maximum": { $gte: filters.minSalary } }],
      })
    }
    if (filters.maxSalary) {
      query.$and.push({
        $or: [{ "salary.minimum": { $lte: filters.maxSalary } }, { "salary.maximum": { $lte: filters.maxSalary } }],
      })
    }
  }

  // Only active jobs that haven't expired
  query.status = "active"
  query.$or = [{ applicationDeadline: { $gte: new Date() } }, { applicationDeadline: null }]

  return this.find(query)
}

module.exports = mongoose.model("Job", jobSchema)
