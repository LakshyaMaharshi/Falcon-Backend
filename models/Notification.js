const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema(
  {
    // Recipient Information
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientType: {
      type: String,
      enum: ["user", "group", "all"],
      default: "user",
    },

    // Notification Content
    title: {
      type: String,
      required: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },

    // Notification Type and Category
    type: {
      type: String,
      enum: [
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
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ["info", "success", "warning", "error", "reminder"],
      default: "info",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // Related Entity
    relatedEntity: {
      entityType: {
        type: String,
        enum: ["Course", "Job", "Application", "Payment", "User", "Enrollment"],
      },
      entityId: mongoose.Schema.Types.ObjectId,
    },

    // Notification Status
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read", "failed"],
      default: "pending",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,

    // Delivery Channels
    channels: {
      inApp: {
        enabled: {
          type: Boolean,
          default: true,
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
      },
      email: {
        enabled: {
          type: Boolean,
          default: false,
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
        emailId: String,
        subject: String,
      },
      sms: {
        enabled: {
          type: Boolean,
          default: false,
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
        messageId: String,
      },
      push: {
        enabled: {
          type: Boolean,
          default: false,
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
        pushId: String,
      },
    },

    // Action and Links
    action: {
      type: {
        type: String,
        enum: ["link", "button", "none"],
        default: "none",
      },
      label: String,
      url: String,
      data: mongoose.Schema.Types.Mixed,
    },

    // Scheduling
    scheduledFor: Date,
    expiresAt: Date,

    // Sender Information
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    senderType: {
      type: String,
      enum: ["user", "system", "automated"],
      default: "system",
    },

    // Metadata
    metadata: {
      source: String,
      campaign: String,
      template: String,
      variables: mongoose.Schema.Types.Mixed,
    },

    // Delivery Tracking
    deliveryAttempts: [
      {
        channel: String,
        attemptedAt: Date,
        status: String,
        error: String,
      },
    ],

    // Grouping and Batching
    batchId: String,
    groupId: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 })
notificationSchema.index({ recipient: 1, isRead: 1 })
notificationSchema.index({ type: 1 })
notificationSchema.index({ status: 1 })
notificationSchema.index({ scheduledFor: 1 })
notificationSchema.index({ expiresAt: 1 })
notificationSchema.index({ "relatedEntity.entityId": 1 })

// Virtual for is expired
notificationSchema.virtual("isExpired").get(function () {
  return this.expiresAt && new Date() > this.expiresAt
})

// Virtual for delivery status
notificationSchema.virtual("deliveryStatus").get(function () {
  const channels = this.channels
  const delivered = Object.keys(channels).some((channel) => channels[channel].sent)
  return delivered ? "delivered" : "pending"
})

// Method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.isRead = true
  this.readAt = new Date()
  this.status = "read"
  return this.save()
}

// Method to send notification
notificationSchema.methods.send = async function () {
  const io = require("../server").io

  // Send in-app notification via Socket.IO
  if (this.channels.inApp.enabled) {
    io.to(this.recipient.toString()).emit("notification", {
      id: this._id,
      title: this.title,
      message: this.message,
      type: this.type,
      category: this.category,
      action: this.action,
      createdAt: this.createdAt,
    })

    this.channels.inApp.sent = true
    this.channels.inApp.sentAt = new Date()
  }

  // TODO: Implement email, SMS, and push notifications

  this.status = "sent"
  return this.save()
}

// Static method to create and send notification
notificationSchema.statics.createAndSend = async function (notificationData) {
  const notification = new this(notificationData)
  await notification.save()
  await notification.send()
  return notification
}

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    status: { $ne: "failed" },
  })
}

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany({ recipient: userId, isRead: false }, { isRead: true, readAt: new Date(), status: "read" })
}

module.exports = mongoose.model("Notification", notificationSchema)
