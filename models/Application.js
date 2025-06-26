const mongoose = require("mongoose")

const applicationSchema = new mongoose.Schema(
  {
    // Basic Information
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    // Application Details
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: [
        "submitted",
        "under_review",
        "screening",
        "shortlisted",
        "interview_scheduled",
        "interviewed",
        "technical_round",
        "final_round",
        "selected",
        "rejected",
        "withdrawn",
        "on_hold",
      ],
      default: "submitted",
    },

    // Application Content
    coverLetter: {
      type: String,
      maxlength: [2000, "Cover letter cannot exceed 2000 characters"],
    },

    // Resume and Documents
    documents: {
      resume: {
        filename: String,
        fileId: mongoose.Schema.Types.ObjectId,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
      portfolio: {
        url: String,
        description: String,
      },
      additionalDocuments: [
        {
          title: String,
          filename: String,
          fileId: mongoose.Schema.Types.ObjectId,
          uploadDate: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },

    // Screening Questions Responses
    screeningResponses: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        question: String,
        answer: String,
        score: Number, // if question has scoring
      },
    ],

    // Interview Process
    interviews: [
      {
        type: {
          type: String,
          enum: ["phone", "video", "in_person", "technical", "hr", "final"],
          required: true,
        },
        scheduledDate: Date,
        duration: Number, // in minutes
        interviewer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        interviewerName: String,
        interviewerEmail: String,
        meetingLink: String,
        location: String,
        status: {
          type: String,
          enum: ["scheduled", "completed", "cancelled", "rescheduled", "no_show"],
          default: "scheduled",
        },
        feedback: {
          rating: {
            type: Number,
            min: 1,
            max: 10,
          },
          technicalSkills: Number,
          communicationSkills: Number,
          problemSolving: Number,
          culturalFit: Number,
          comments: String,
          recommendation: {
            type: String,
            enum: ["strong_hire", "hire", "no_hire", "strong_no_hire"],
          },
          submittedAt: Date,
          submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        },
        notes: String,
        recordingUrl: String,
      },
    ],

    // Assessment and Tests
    assessments: [
      {
        title: String,
        type: {
          type: String,
          enum: ["coding", "aptitude", "personality", "technical", "custom"],
        },
        assignedDate: Date,
        dueDate: Date,
        submittedDate: Date,
        score: Number,
        maxScore: Number,
        percentage: Number,
        status: {
          type: String,
          enum: ["assigned", "in_progress", "submitted", "evaluated"],
          default: "assigned",
        },
        feedback: String,
        testUrl: String,
        resultUrl: String,
      },
    ],

    // Communication History
    communications: [
      {
        type: {
          type: String,
          enum: ["email", "phone", "message", "note"],
          required: true,
        },
        direction: {
          type: String,
          enum: ["inbound", "outbound"],
          required: true,
        },
        subject: String,
        content: String,
        sentBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        sentTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        attachments: [
          {
            filename: String,
            fileId: mongoose.Schema.Types.ObjectId,
          },
        ],
      },
    ],

    // Offer Details
    offer: {
      isOffered: {
        type: Boolean,
        default: false,
      },
      offeredDate: Date,
      salary: {
        amount: Number,
        currency: String,
        period: String,
      },
      benefits: [String],
      startDate: Date,
      joiningBonus: Number,
      otherTerms: String,
      offerLetter: {
        filename: String,
        fileId: mongoose.Schema.Types.ObjectId,
      },
      response: {
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected", "negotiating"],
        },
        responseDate: Date,
        counterOffer: {
          salary: Number,
          startDate: Date,
          terms: String,
        },
        rejectionReason: String,
      },
      expiryDate: Date,
    },

    // Scoring and Evaluation
    evaluation: {
      overallScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      technicalScore: Number,
      experienceScore: Number,
      educationScore: Number,
      skillsMatch: Number,
      culturalFitScore: Number,
      evaluatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      evaluatedAt: Date,
      notes: String,
    },

    // Timeline and Status History
    statusHistory: [
      {
        status: String,
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: String,
        notes: String,
      },
    ],

    // Metadata
    source: {
      type: String,
      enum: ["website", "referral", "job_board", "social_media", "campus", "walk_in"],
      default: "website",
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Internal Notes and Tags
    internalNotes: String,
    tags: [String],
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // Withdrawal Information
    withdrawal: {
      isWithdrawn: {
        type: Boolean,
        default: false,
      },
      withdrawnAt: Date,
      reason: String,
      canReapply: {
        type: Boolean,
        default: true,
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
applicationSchema.index({ applicant: 1, job: 1 }, { unique: true })
applicationSchema.index({ job: 1, status: 1 })
applicationSchema.index({ applicant: 1, status: 1 })
applicationSchema.index({ applicationDate: -1 })
applicationSchema.index({ status: 1, createdAt: -1 })

// Virtual for days since application
applicationSchema.virtual("daysSinceApplication").get(function () {
  return Math.floor((Date.now() - this.applicationDate) / (1000 * 60 * 60 * 24))
})

// Virtual for current interview
applicationSchema.virtual("currentInterview").get(function () {
  return this.interviews
    .filter((interview) => interview.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0]
})

// Virtual for latest communication
applicationSchema.virtual("latestCommunication").get(function () {
  return this.communications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
})

// Pre-save middleware to update status history
applicationSchema.pre("save", function (next) {
  if (this.isModified("status") && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    })
  }
  next()
})

// Method to update status
applicationSchema.methods.updateStatus = function (newStatus, changedBy, reason, notes) {
  this.status = newStatus
  this.statusHistory.push({
    status: newStatus,
    changedBy,
    reason,
    notes,
    changedAt: new Date(),
  })
  return this.save()
}

// Method to schedule interview
applicationSchema.methods.scheduleInterview = function (interviewData) {
  this.interviews.push(interviewData)
  if (this.status === "shortlisted" || this.status === "under_review") {
    this.status = "interview_scheduled"
  }
  return this.save()
}

// Method to add communication
applicationSchema.methods.addCommunication = function (communicationData) {
  this.communications.push(communicationData)
  return this.save()
}

// Method to calculate overall score
applicationSchema.methods.calculateOverallScore = function () {
  const weights = {
    technical: 0.3,
    experience: 0.25,
    education: 0.15,
    skills: 0.2,
    cultural: 0.1,
  }

  const scores = this.evaluation
  if (!scores.technicalScore && !scores.experienceScore) return 0

  const weightedScore =
    (scores.technicalScore || 0) * weights.technical +
    (scores.experienceScore || 0) * weights.experience +
    (scores.educationScore || 0) * weights.education +
    (scores.skillsMatch || 0) * weights.skills +
    (scores.culturalFitScore || 0) * weights.cultural

  this.evaluation.overallScore = Math.round(weightedScore)
  return this.evaluation.overallScore
}

// Static method to get applications by status
applicationSchema.statics.getByStatus = function (status, jobId = null) {
  const query = { status }
  if (jobId) query.job = jobId
  return this.find(query).populate("applicant job")
}

// Static method to get application statistics
applicationSchema.statics.getStatistics = function (jobId = null) {
  const matchStage = jobId ? { $match: { job: mongoose.Types.ObjectId(jobId) } } : { $match: {} }

  return this.aggregate([
    matchStage,
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ])
}

module.exports = mongoose.model("Application", applicationSchema)
