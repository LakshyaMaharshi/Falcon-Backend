const mongoose = require("mongoose")

const paymentSchema = new mongoose.Schema(
  {
    // Basic Information
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Payment Details
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    // Payment Type and Related Entity
    paymentType: {
      type: String,
      enum: ["course_enrollment", "certification", "premium_subscription", "job_posting", "other"],
      required: true,
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ["Course", "Job", "Subscription"],
        required: true,
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    },

    // Amount and Currency
    amount: {
      original: {
        type: Number,
        required: true,
        min: 0,
      },
      discount: {
        type: Number,
        default: 0,
        min: 0,
      },
      tax: {
        type: Number,
        default: 0,
        min: 0,
      },
      final: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },

    // Payment Method and Gateway
    paymentMethod: {
      type: String,
      enum: ["credit_card", "debit_card", "net_banking", "upi", "wallet", "bank_transfer", "cash"],
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: ["stripe", "razorpay", "payu", "paypal", "manual"],
      required: true,
    },
    gatewayTransactionId: String,
    gatewayOrderId: String,

    // Payment Status
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled", "refunded", "partially_refunded"],
      default: "pending",
    },

    // Timestamps
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    failedAt: Date,

    // Billing Information
    billingDetails: {
      name: String,
      email: String,
      phone: String,
      address: {
        line1: String,
        line2: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
      },
    },

    // Invoice Information
    invoice: {
      invoiceNumber: {
        type: String,
        unique: true,
      },
      invoiceDate: Date,
      dueDate: Date,
      items: [
        {
          description: String,
          quantity: {
            type: Number,
            default: 1,
          },
          unitPrice: Number,
          totalPrice: Number,
        },
      ],
      notes: String,
      terms: String,
    },

    // Discount and Coupon Information
    discount: {
      couponCode: String,
      discountType: {
        type: String,
        enum: ["percentage", "fixed_amount"],
      },
      discountValue: Number,
      discountAmount: Number,
    },

    // Tax Information
    tax: {
      taxType: String, // GST, VAT, etc.
      taxRate: Number,
      taxAmount: Number,
      taxNumber: String, // GST number, etc.
    },

    // Refund Information
    refunds: [
      {
        refundId: String,
        amount: Number,
        reason: String,
        status: {
          type: String,
          enum: ["pending", "processing", "completed", "failed"],
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        processedAt: Date,
        processedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        gatewayRefundId: String,
        notes: String,
      },
    ],

    // Failure Information
    failure: {
      errorCode: String,
      errorMessage: String,
      gatewayError: String,
      retryCount: {
        type: Number,
        default: 0,
      },
      lastRetryAt: Date,
    },

    // Webhook and Notification
    webhooks: [
      {
        event: String,
        status: String,
        receivedAt: Date,
        data: mongoose.Schema.Types.Mixed,
      },
    ],

    // Metadata
    metadata: {
      userAgent: String,
      ipAddress: String,
      deviceInfo: String,
      sessionId: String,
    },

    // Internal Notes
    internalNotes: String,

    // Reconciliation
    reconciliation: {
      isReconciled: {
        type: Boolean,
        default: false,
      },
      reconciledAt: Date,
      reconciledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      bankReference: String,
      settlementDate: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes
paymentSchema.index({ user: 1 })
paymentSchema.index({ transactionId: 1 })
paymentSchema.index({ orderId: 1 })
paymentSchema.index({ status: 1 })
paymentSchema.index({ paymentType: 1 })
paymentSchema.index({ "relatedEntity.entityId": 1 })
paymentSchema.index({ createdAt: -1 })
paymentSchema.index({ "invoice.invoiceNumber": 1 })

// Virtual for total refunded amount
paymentSchema.virtual("totalRefunded").get(function () {
  return this.refunds
    .filter((refund) => refund.status === "completed")
    .reduce((total, refund) => total + refund.amount, 0)
})

// Virtual for net amount (after refunds)
paymentSchema.virtual("netAmount").get(function () {
  return this.amount.final - this.totalRefunded
})

// Virtual for is refundable
paymentSchema.virtual("isRefundable").get(function () {
  return this.status === "completed" && this.totalRefunded < this.amount.final
})

// Pre-save middleware to generate invoice number
paymentSchema.pre("save", function (next) {
  if (this.isNew && !this.invoice.invoiceNumber) {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")
    this.invoice.invoiceNumber = `INV-${year}${month}-${random}`
    this.invoice.invoiceDate = date
  }
  next()
})

// Method to update payment status
paymentSchema.methods.updateStatus = function (newStatus, gatewayData = {}) {
  this.status = newStatus

  if (newStatus === "completed") {
    this.completedAt = new Date()
    if (gatewayData.transactionId) {
      this.gatewayTransactionId = gatewayData.transactionId
    }
  } else if (newStatus === "failed") {
    this.failedAt = new Date()
    if (gatewayData.error) {
      this.failure.errorCode = gatewayData.error.code
      this.failure.errorMessage = gatewayData.error.message
      this.failure.gatewayError = gatewayData.error.gateway_error
    }
  }

  return this.save()
}

// Method to process refund
paymentSchema.methods.processRefund = function (amount, reason, processedBy) {
  if (amount > this.netAmount) {
    throw new Error("Refund amount cannot exceed net payment amount")
  }

  const refund = {
    refundId: `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    amount,
    reason,
    status: "pending",
    processedBy,
  }

  this.refunds.push(refund)

  // Update payment status if fully refunded
  if (this.totalRefunded + amount >= this.amount.final) {
    this.status = "refunded"
  } else if (this.totalRefunded + amount > 0) {
    this.status = "partially_refunded"
  }

  return this.save()
}

// Static method to generate payment report
paymentSchema.statics.generateReport = function (startDate, endDate, filters = {}) {
  const matchStage = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  }

  if (filters.status) matchStage.status = filters.status
  if (filters.paymentType) matchStage.paymentType = filters.paymentType
  if (filters.paymentMethod) matchStage.paymentMethod = filters.paymentMethod

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          status: "$status",
        },
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount.final" },
      },
    },
    { $sort: { "_id.date": 1 } },
  ])
}

module.exports = mongoose.model("Payment", paymentSchema)
