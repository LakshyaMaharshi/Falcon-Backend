const mongoose = require("mongoose")

const courseSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: [true, "Course title is required"],
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
      required: [true, "Course description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },

    // Course Details
    category: {
      type: String,
      required: true,
      enum: [
        "web-development",
        "mobile-development",
        "data-science",
        "ai-ml",
        "cybersecurity",
        "devops",
        "ui-ux",
        "digital-marketing",
        "other",
      ],
    },
    level: {
      type: String,
      required: true,
      enum: ["beginner", "intermediate", "advanced"],
    },
    duration: {
      hours: { type: Number, required: true },
      weeks: { type: Number, required: true },
    },
    language: {
      type: String,
      default: "English",
    },

    // Pricing
    pricing: {
      type: {
        type: String,
        enum: ["free", "paid"],
        required: true,
      },
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
      currency: {
        type: String,
        default: "INR",
      },
      discount: {
        percentage: { type: Number, min: 0, max: 100 },
        validUntil: Date,
      },
    },

    // Media
    thumbnail: {
      type: String,
      required: true,
    },
    previewVideo: {
      url: String,
      duration: Number,
    },

    // Course Structure
    modules: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        order: {
          type: Number,
          required: true,
        },
        lessons: [
          {
            title: {
              type: String,
              required: true,
            },
            description: String,
            type: {
              type: String,
              enum: ["video", "text", "quiz", "assignment", "live_session"],
              required: true,
            },
            content: {
              videoUrl: String,
              videoDuration: Number,
              textContent: String,
              attachments: [
                {
                  filename: String,
                  fileId: mongoose.Schema.Types.ObjectId,
                  fileType: String,
                },
              ],
            },
            order: {
              type: Number,
              required: true,
            },
            isPreview: {
              type: Boolean,
              default: false,
            },
            duration: Number, // in minutes
            resources: [
              {
                title: String,
                url: String,
                type: String,
              },
            ],
          },
        ],
      },
    ],

    // Assignments and Quizzes
    assignments: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        instructions: String,
        dueDate: Date,
        maxScore: {
          type: Number,
          default: 100,
        },
        attachments: [
          {
            filename: String,
            fileId: mongoose.Schema.Types.ObjectId,
          },
        ],
        moduleId: mongoose.Schema.Types.ObjectId,
        isRequired: {
          type: Boolean,
          default: true,
        },
      },
    ],

    quizzes: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        timeLimit: Number, // in minutes
        maxAttempts: {
          type: Number,
          default: 3,
        },
        passingScore: {
          type: Number,
          default: 70,
        },
        questions: [
          {
            question: {
              type: String,
              required: true,
            },
            type: {
              type: String,
              enum: ["multiple_choice", "true_false", "short_answer"],
              required: true,
            },
            options: [String], // for multiple choice
            correctAnswer: String,
            explanation: String,
            points: {
              type: Number,
              default: 1,
            },
          },
        ],
        moduleId: mongoose.Schema.Types.ObjectId,
        isRequired: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Prerequisites and Requirements
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    requirements: [String],
    whatYouWillLearn: [String],

    // Instructor Information
    instructors: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["primary", "assistant", "guest"],
          default: "primary",
        },
        bio: String,
      },
    ],

    // Course Status and Settings
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    enrollmentLimit: {
      type: Number,
      default: null, // null means unlimited
    },
    enrollmentStartDate: Date,
    enrollmentEndDate: Date,
    courseStartDate: Date,
    courseEndDate: Date,

    // Statistics
    stats: {
      totalEnrollments: {
        type: Number,
        default: 0,
      },
      completionRate: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalRatings: {
        type: Number,
        default: 0,
      },
    },

    // SEO and Marketing
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },
    tags: [String],

    // Certification
    certificate: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      template: String,
      criteria: {
        completionPercentage: {
          type: Number,
          default: 100,
        },
        minimumQuizScore: {
          type: Number,
          default: 70,
        },
        requiredAssignments: {
          type: Number,
          default: 0,
        },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes
courseSchema.index({ slug: 1 })
courseSchema.index({ category: 1 })
courseSchema.index({ level: 1 })
courseSchema.index({ status: 1 })
courseSchema.index({ "pricing.type": 1 })
courseSchema.index({ createdAt: -1 })
courseSchema.index({ "stats.averageRating": -1 })

// Virtual for total lessons count
courseSchema.virtual("totalLessons").get(function () {
  return this.modules.reduce((total, module) => total + module.lessons.length, 0)
})

// Virtual for total duration
courseSchema.virtual("totalDuration").get(function () {
  return this.modules.reduce((total, module) => {
    return (
      total +
      module.lessons.reduce((moduleTotal, lesson) => {
        return moduleTotal + (lesson.duration || 0)
      }, 0)
    )
  }, 0)
})

// Pre-save middleware to generate slug
courseSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
  }
  next()
})

// Method to calculate completion percentage for a user
courseSchema.methods.getCompletionPercentage = function (userProgress) {
  const totalLessons = this.totalLessons
  if (totalLessons === 0) return 0

  const completedLessons = userProgress.completedLessons.length
  return Math.round((completedLessons / totalLessons) * 100)
}

// Method to check if user can access lesson
courseSchema.methods.canAccessLesson = function (moduleIndex, lessonIndex, userProgress) {
  const module = this.modules[moduleIndex]
  const lesson = module.lessons[lessonIndex]

  // Always allow preview lessons
  if (lesson.isPreview) return true

  // Check if user is enrolled
  if (!userProgress) return false

  // Check prerequisites (previous lessons in order)
  for (let i = 0; i < moduleIndex; i++) {
    const prevModule = this.modules[i]
    for (let j = 0; j < prevModule.lessons.length; j++) {
      const lessonId = prevModule.lessons[j]._id.toString()
      if (!userProgress.completedLessons.includes(lessonId)) {
        return false
      }
    }
  }

  // Check previous lessons in current module
  for (let i = 0; i < lessonIndex; i++) {
    const lessonId = module.lessons[i]._id.toString()
    if (!userProgress.completedLessons.includes(lessonId)) {
      return false
    }
  }

  return true
}

module.exports = mongoose.model("Course", courseSchema)
