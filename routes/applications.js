const express = require('express')
const { protect, authorize } = require('../middleware/auth')
const { validateJobApplication, validateObjectId, validatePagination, handleValidationErrors } = require('../middleware/validation')
const Application = require('../models/Application')
const Job = require('../models/Job')
const User = require('../models/User')
const Notification = require('../models/Notification')
const ErrorResponse = require('../utils/errorResponse')
const sendEmail = require('../utils/sendEmail')
const { body, query } = require('express-validator')

const router = express.Router()

// Apply authentication to all routes
router.use(protect)

// @route   GET /api/applications
// @desc    Get all applications with filtering, pagination, and sorting
// @access  Private (Admin, Employer, Job Seeker)
router.get('/', validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', status, jobId, applicantId, search } = req.query

    // Build query object
    const queryObj = {}

    // Role-based filtering
    if (req.user.userType === 'employer') {
      const employerJobs = await Job.find({ employer: req.user._id }).select('_id')
      queryObj.job = { $in: employerJobs.map(job => job._id) }
    } else if (req.user.userType === 'jobseeker' || req.user.userType === 'student') {
      queryObj.applicant = req.user._id
    }

    // Apply filters
    if (status) queryObj.status = status
    if (jobId) queryObj.job = jobId
    if (applicantId) queryObj.applicant = applicantId

    // Search functionality
    if (search) {
      queryObj.$or = [
        { 'job.title': { $regex: search, $options: 'i' } },
        { 'applicant.fullName': { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const applications = await Application.find(queryObj)
      .populate('applicant', '-password')
      .populate('job')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))

    const totalCount = await Application.countDocuments(queryObj)
    const totalPages = Math.ceil(totalCount / parseInt(limit))

    res.status(200).json({
      success: true,
      count: applications.length,
      totalCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
      data: applications,
    })
  } catch (error) {
    next(error)
  }
})

// @route   GET /api/applications/:id
// @desc    Get application by ID
// @access  Private (Admin, Employer, Job Seeker - own applications)
router.get('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('applicant', '-password')
      .populate('job')
      .populate('interviews.interviewer', 'fullName email')

    if (!application) {
      return next(new ErrorResponse('Application not found', 404))
    }

    // Authorization check
    if (req.user.userType === 'jobseeker' || req.user.userType === 'student') {
      if (application.applicant._id.toString() !== req.user._id.toString()) {
        return next(new ErrorResponse('Not authorized to access this application', 403))
      }
    } else if (req.user.userType === 'employer') {
      const job = await Job.findById(application.job._id)
      if (job.employer.toString() !== req.user._id.toString()) {
        return next(new ErrorResponse('Not authorized to access this application', 403))
      }
    }

    res.status(200).json({
      success: true,
      data: application,
    })
  } catch (error) {
    next(error)
  }
})

// @route   POST /api/applications
// @desc    Create a new application
// @access  Private (Job Seeker, Student)
router.post('/', [
  body('jobId').isMongoId().withMessage('Valid job ID is required'),
  body('coverLetter').optional().trim().isLength({ max: 2000 }).withMessage('Cover letter cannot exceed 2000 characters'),
  handleValidationErrors,
], async (req, res, next) => {
  try {
    const { jobId, coverLetter } = req.body

    // Check if user is authorized to apply
    if (req.user.userType !== 'jobseeker' && req.user.userType !== 'student') {
      return next(new ErrorResponse('Only job seekers and students can apply for jobs', 403))
    }

    // Check if job exists and is active
    const job = await Job.findById(jobId)
    if (!job) {
      return next(new ErrorResponse('Job not found', 404))
    }

    if (job.status !== 'active' || !job.isActive) {
      return next(new ErrorResponse('This job is not currently accepting applications', 400))
    }

    // Check if user has already applied for this job
    const existingApplication = await Application.findOne({
      applicant: req.user._id,
      job: jobId,
    })

    if (existingApplication) {
      return next(new ErrorResponse('You have already applied for this job', 400))
    }

    // Create application
    const application = await Application.create({
      applicant: req.user._id,
      job: jobId,
      coverLetter,
    })

    // Update job application count
    await Job.findByIdAndUpdate(jobId, {
      $inc: { currentApplications: 1, 'stats.applications': 1 },
    })

    await application.populate([
      { path: 'applicant', select: '-password' },
      { path: 'job' },
    ])

    // Send notification to employer
    try {
      await Notification.create({
        recipient: job.employer,
        title: 'New Job Application',
        message: `New application received for ${job.title} from ${req.user.fullName}`,
        type: 'job_application',
        data: {
          applicationId: application._id,
          jobId: job._id,
          applicantId: req.user._id,
        },
      })
    } catch (notificationError) {
      console.error('Notification error:', notificationError)
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    })
  } catch (error) {
    next(error)
  }
})

// @route   PUT /api/applications/:id
// @desc    Update application by ID
// @access  Private (Admin, Employer, Job Seeker - own applications)
router.put('/:id', [
  validateObjectId('id'),
  body('status').optional().isIn([
    'submitted', 'under_review', 'screening', 'shortlisted', 'interview_scheduled',
    'interviewed', 'technical_round', 'final_round', 'selected', 'rejected', 'withdrawn', 'on_hold'
  ]).withMessage('Invalid status'),
  body('coverLetter').optional().trim().isLength({ max: 2000 }).withMessage('Cover letter cannot exceed 2000 characters'),
  handleValidationErrors,
], async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('applicant', 'fullName email')
      .populate('job', 'title employer')

    if (!application) {
      return next(new ErrorResponse('Application not found', 404))
    }

    // Authorization check
    let canUpdate = false

    if (req.user.userType === 'admin') {
      canUpdate = true
    } else if (req.user.userType === 'employer') {
      const job = await Job.findById(application.job._id)
      if (job.employer.toString() === req.user._id.toString()) {
        canUpdate = true
      }
    } else if (req.user.userType === 'jobseeker' || req.user.userType === 'student') {
      if (application.applicant._id.toString() === req.user._id.toString()) {
        // Job seekers can only update certain fields
        const allowedFields = ['coverLetter', 'withdrawal']
        const updateFields = Object.keys(req.body)
        const hasUnauthorizedFields = updateFields.some(field => !allowedFields.includes(field))
        
        if (hasUnauthorizedFields) {
          return next(new ErrorResponse('You can only update cover letter and withdrawal status', 403))
        }
        canUpdate = true
      }
    }

    if (!canUpdate) {
      return next(new ErrorResponse('Not authorized to update this application', 403))
    }

    // Handle withdrawal
    if (req.body.withdrawal && req.body.withdrawal.isWithdrawn) {
      application.withdrawal = {
        isWithdrawn: true,
        withdrawnAt: new Date(),
        reason: req.body.withdrawal.reason || 'Withdrawn by applicant',
        canReapply: req.body.withdrawal.canReapply !== false,
      }
      application.status = 'withdrawn'
    }

    // Update allowed fields
    const allowedFields = ['status', 'coverLetter', 'priority', 'internalNotes', 'evaluation', 'offer']
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        application[field] = req.body[field]
      }
    })

    // Update status history if status changed
    if (req.body.status && req.body.status !== application.status) {
      application.statusHistory.push({
        status: req.body.status,
        changedBy: req.user._id,
        reason: 'Status update',
        changedAt: new Date(),
      })
    }

    await application.save()

    await application.populate([
      { path: 'applicant', select: '-password' },
      { path: 'job' },
    ])

    res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      data: application,
    })
  } catch (error) {
    next(error)
  }
})

// @route   DELETE /api/applications/:id
// @desc    Delete application by ID
// @access  Private (Admin, Employer, Job Seeker - own applications)
router.delete('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job', 'title employer currentApplications')

    if (!application) {
      return next(new ErrorResponse('Application not found', 404))
    }

    // Authorization check
    let canDelete = false

    if (req.user.userType === 'admin') {
      canDelete = true
    } else if (req.user.userType === 'employer') {
      if (application.job.employer.toString() === req.user._id.toString()) {
        canDelete = true
      }
    } else if (req.user.userType === 'jobseeker' || req.user.userType === 'student') {
      if (application.applicant.toString() === req.user._id.toString()) {
        canDelete = true
      }
    }

    if (!canDelete) {
      return next(new ErrorResponse('Not authorized to delete this application', 403))
    }

    // Update job application count
    await Job.findByIdAndUpdate(application.job._id, {
      $inc: { currentApplications: -1, 'stats.applications': -1 },
    })

    await Application.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully',
    })
  } catch (error) {
    next(error)
  }
})

// @route   POST /api/applications/:id/schedule-interview
// @desc    Schedule an interview for an application
// @access  Private (Admin, Employer)
router.post('/:id/schedule-interview', [
  validateObjectId('id'),
  body('type').isIn(['phone', 'video', 'in_person', 'technical', 'hr', 'final']).withMessage('Invalid interview type'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('duration').isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
  handleValidationErrors,
], async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('applicant', 'fullName email')
      .populate('job', 'title employer')

    if (!application) {
      return next(new ErrorResponse('Application not found', 404))
    }

    // Authorization check
    if (req.user.userType !== 'admin' && req.user.userType !== 'employer') {
      return next(new ErrorResponse('Only admins and employers can schedule interviews', 403))
    }

    if (req.user.userType === 'employer') {
      const job = await Job.findById(application.job._id)
      if (job.employer.toString() !== req.user._id.toString()) {
        return next(new ErrorResponse('Not authorized to schedule interview for this application', 403))
      }
    }

    const interviewData = {
      type: req.body.type,
      scheduledDate: new Date(req.body.scheduledDate),
      duration: req.body.duration,
      interviewer: req.user._id,
      status: 'scheduled',
    }

    // Schedule interview using model method
    await application.scheduleInterview(interviewData)

    // Send notification to applicant
    try {
      await Notification.create({
        recipient: application.applicant._id,
        title: 'Interview Scheduled',
        message: `Interview scheduled for ${application.job.title} on ${new Date(req.body.scheduledDate).toLocaleDateString()}`,
        type: 'interview_scheduled',
        data: {
          applicationId: application._id,
          jobId: application.job._id,
          interviewData,
        },
      })
    } catch (notificationError) {
      console.error('Notification error:', notificationError)
    }

    res.status(200).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: application,
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router 