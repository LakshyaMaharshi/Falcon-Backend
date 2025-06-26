const mongoose = require("mongoose")

const enrollmentSchema = new mongoose.Schema(
  {
    // Basic Information
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    // Enrollment Details
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "completed", "dropped", "suspended"],
      default: "active",
    },

    // Progress Tracking
    progress: {
      completedLessons: [
        {
          lessonId: mongoose.Schema.Types.ObjectId,
          completedAt: {
            type: Date,
            default: Date.now,
          },
          timeSpent: Number, // in minutes
        },
      ],
      completedModules: [
        {
          moduleId: mongoose.Schema.Types.ObjectId,
          completedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      currentLesson: {
        moduleIndex: {
          type: Number,
          default: 0,
        },
        lessonIndex: {
          type: Number,
          default: 0,
        },
      },
      totalTimeSpent: {
        type: Number,
        default: 0, // in minutes
      },
      completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      lastAccessedAt: {
        type: Date,
        default: Date.now,
      },
    },

    // Assignments and Quizzes
    assignments: [
      {
        assignmentId: mongoose.Schema.Types.ObjectId,
        submissions: [
          {
            submittedAt: {
              type: Date,
              default: Date.now,
            },
            files: [
              {
                filename: String,
                fileId: mongoose.Schema.Types.ObjectId,
              },
            ],
            textSubmission: String,
            score: Number,
            feedback: String,
            gradedAt: Date,
            gradedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          },
        ],
        status: {
          type: String,
          enum: ["not_started", "in_progress", "submitted", "graded"],
          default: "not_started",
        },
        finalScore: Number,
      },
    ],

    quizAttempts: [
      {
        quizId: mongoose.Schema.Types.ObjectId,
        attempts: [
          {
            attemptNumber: Number,
            startedAt: Date,
            submittedAt: Date,
            answers: [
              {
                questionId: mongoose.Schema.Types.ObjectId,
                answer: String,
                isCorrect: Boolean,
                points: Number,
              },
            ],
            score: Number,
            percentage: Number,
            passed: Boolean,
            timeSpent: Number, // in minutes
          },
        ],
        bestScore: {
          type: Number,
          default: 0,
        },
        bestPercentage: {
          type: Number,
          default: 0,
        },
        totalAttempts: {
          type: Number,
          default: 0,
        },
        passed: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Payment Information
    payment: {
      transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },
      amount: Number,
      currency: String,
      paymentDate: Date,
      paymentMethod: String,
    },

    // Completion and Certification
    completion: {
      completedAt: Date,
      certificateIssued: {
        type: Boolean,
        default: false,
      },
      certificateId: String,
      certificateIssuedAt: Date,
      finalGrade: {
        type: String,
        enum: ["A+", "A", "B+", "B", "C+", "C", "D", "F"],
      },
      overallScore: Number,
    },

    // Feedback and Rating
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      review: String,
      reviewDate: Date,
      wouldRecommend: Boolean,
    },

    // Notes and Bookmarks
    notes: [
      {
        lessonId: mongoose.Schema.Types.ObjectId,
        content: String,
        timestamp: Number, // for video notes
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    bookmarks: [
      {
        lessonId: mongoose.Schema.Types.ObjectId,
        timestamp: Number, // for video bookmarks
        title: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Settings and Preferences
    settings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      reminderFrequency: {
        type: String,
        enum: ["daily", "weekly", "never"],
        default: "weekly",
      },
      autoplay: {
        type: Boolean,
        default: true,
      },
      playbackSpeed: {
        type: Number,
        default: 1.0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Compound indexes
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true })
enrollmentSchema.index({ student: 1, status: 1 })
enrollmentSchema.index({ course: 1, status: 1 })
enrollmentSchema.index({ enrollmentDate: -1 })

// Virtual for days since enrollment
enrollmentSchema.virtual("daysSinceEnrollment").get(function () {
  return Math.floor((Date.now() - this.enrollmentDate) / (1000 * 60 * 60 * 24))
})

// Virtual for is active
enrollmentSchema.virtual("isActive").get(function () {
  return this.status === "active"
})

// Method to update progress
enrollmentSchema.methods.updateProgress = function (lessonId, timeSpent = 0) {
  // Check if lesson already completed
  const existingLesson = this.progress.completedLessons.find(
    (lesson) => lesson.lessonId.toString() === lessonId.toString(),
  )

  if (!existingLesson) {
    this.progress.completedLessons.push({
      lessonId,
      timeSpent,
    })
  }

  this.progress.totalTimeSpent += timeSpent
  this.progress.lastAccessedAt = new Date()

  return this.save()
}

// Method to calculate completion percentage
enrollmentSchema.methods.calculateCompletionPercentage = async function () {
  await this.populate("course")
  const totalLessons = this.course.totalLessons

  if (totalLessons === 0) {
    this.progress.completionPercentage = 0
    return 0
  }

  const completedLessons = this.progress.completedLessons.length
  const percentage = Math.round((completedLessons / totalLessons) * 100)

  this.progress.completionPercentage = percentage
  await this.save()

  return percentage
}

// Method to check if course is completed
enrollmentSchema.methods.checkCompletion = async function () {
  await this.populate("course")

  const completionPercentage = await this.calculateCompletionPercentage()
  const requiredPercentage = this.course.certificate.criteria.completionPercentage || 100

  if (completionPercentage >= requiredPercentage && this.status === "active") {
    this.status = "completed"
    this.completion.completedAt = new Date()
    await this.save()
    return true
  }

  return false
}

// Method to add quiz attempt
enrollmentSchema.methods.addQuizAttempt = function (quizId, answers, score, percentage, timeSpent) {
  let quizProgress = this.quizAttempts.find((quiz) => quiz.quizId.toString() === quizId.toString())

  if (!quizProgress) {
    quizProgress = {
      quizId,
      attempts: [],
      bestScore: 0,
      bestPercentage: 0,
      totalAttempts: 0,
      passed: false,
    }
    this.quizAttempts.push(quizProgress)
  }

  const attemptNumber = quizProgress.totalAttempts + 1

  quizProgress.attempts.push({
    attemptNumber,
    startedAt: new Date(Date.now() - timeSpent * 60 * 1000),
    submittedAt: new Date(),
    answers,
    score,
    percentage,
    passed: percentage >= 70, // Default passing score
    timeSpent,
  })

  quizProgress.totalAttempts = attemptNumber

  if (score > quizProgress.bestScore) {
    quizProgress.bestScore = score
    quizProgress.bestPercentage = percentage
  }

  if (percentage >= 70) {
    quizProgress.passed = true
  }

  return this.save()
}

module.exports = mongoose.model("Enrollment", enrollmentSchema)
