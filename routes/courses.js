const express = require('express')
const { protect, authorize } = require('../middleware/auth')
const { 
  validateCourseCreation, 
  validateObjectId, 
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation')
const { body, query } = require('express-validator')
const Course = require('../models/Course')
const Enrollment = require('../models/Enrollment')
const User = require('../models/User')
const ErrorResponse = require('../utils/errorResponse')
const router = express.Router()

// Advanced validation for course updates
const validateCourseUpdate = [
  body('title').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Course title must be between 5 and 200 characters'),
  body('description').optional().trim().isLength({ min: 50, max: 2000 }).withMessage('Course description must be between 50 and 2000 characters'),
  body('shortDescription').optional().trim().isLength({ max: 500 }).withMessage('Short description cannot exceed 500 characters'),
  body('category').optional().isIn([
    'web-development', 'mobile-development', 'data-science', 'ai-ml', 
    'cybersecurity', 'devops', 'ui-ux', 'digital-marketing', 'other'
  ]).withMessage('Invalid course category'),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid course level'),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid course status'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('pricing.type').optional().isIn(['free', 'paid']).withMessage('Invalid pricing type'),
  body('pricing.amount').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('pricing.currency').optional().isIn(['INR', 'USD', 'EUR']).withMessage('Invalid currency'),
  body('pricing.discount.percentage').optional().isInt({ min: 0, max: 100 }).withMessage('Discount percentage must be between 0 and 100'),
  body('enrollmentLimit').optional().isInt({ min: 1 }).withMessage('Enrollment limit must be a positive integer'),
  body('enrollmentStartDate').optional().isISO8601().withMessage('Invalid enrollment start date'),
  body('enrollmentEndDate').optional().isISO8601().withMessage('Invalid enrollment end date'),
  body('courseStartDate').optional().isISO8601().withMessage('Invalid course start date'),
  body('courseEndDate').optional().isISO8601().withMessage('Invalid course end date'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Each tag must be between 1 and 50 characters'),
  body('requirements').optional().isArray().withMessage('Requirements must be an array'),
  body('whatYouWillLearn').optional().isArray().withMessage('Learning outcomes must be an array'),
  body('prerequisites').optional().isArray().withMessage('Prerequisites must be an array'),
  body('prerequisites.*').optional().isMongoId().withMessage('Invalid prerequisite course ID'),
  handleValidationErrors
]

// Advanced validation for course search and filters
const validateCourseFilters = [
  query('search').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  query('category').optional().isIn([
    'web-development', 'mobile-development', 'data-science', 'ai-ml', 
    'cybersecurity', 'devops', 'ui-ux', 'digital-marketing', 'other'
  ]).withMessage('Invalid category filter'),
  query('level').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid level filter'),
  query('pricing').optional().isIn(['free', 'paid']).withMessage('Invalid pricing filter'),
  query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status filter'),
  query('instructor').optional().isMongoId().withMessage('Invalid instructor ID'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be a positive number'),
  query('minRating').optional().isFloat({ min: 0, max: 5 }).withMessage('Minimum rating must be between 0 and 5'),
  query('maxRating').optional().isFloat({ min: 0, max: 5 }).withMessage('Maximum rating must be between 0 and 5'),
  query('duration').optional().isIn(['short', 'medium', 'long']).withMessage('Invalid duration filter'),
  query('sort').optional().isIn([
    'title', '-title', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt',
    'price', '-price', 'rating', '-rating', 'enrollments', '-enrollments',
    'completionRate', '-completionRate'
  ]).withMessage('Invalid sort parameter'),
  validatePagination,
  handleValidationErrors
]

// @route   GET /api/courses
// @desc    Get all courses with advanced filtering, search, and pagination
// @access  Public
router.get('/', validateCourseFilters, async (req, res, next) => {
  try {
    const {
      search,
      category,
      level,
      pricing,
      status = 'published',
      instructor,
      minPrice,
      maxPrice,
      minRating,
      maxRating,
      duration,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query

    // Build filter object
    const filter = { isActive: true }

    // Status filter (default to published for public access)
    if (status) {
      filter.status = status
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ]
    }

    // Category filter
    if (category) {
      filter.category = category
    }

    // Level filter
    if (level) {
      filter.level = level
    }

    // Pricing filter
    if (pricing) {
      filter['pricing.type'] = pricing
    }

    // Instructor filter
    if (instructor) {
      filter['instructors.user'] = instructor
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter['pricing.amount'] = {}
      if (minPrice) filter['pricing.amount'].$gte = parseFloat(minPrice)
      if (maxPrice) filter['pricing.amount'].$lte = parseFloat(maxPrice)
    }

    // Rating range filter
    if (minRating || maxRating) {
      filter['stats.averageRating'] = {}
      if (minRating) filter['stats.averageRating'].$gte = parseFloat(minRating)
      if (maxRating) filter['stats.averageRating'].$lte = parseFloat(maxRating)
    }

    // Duration filter
    if (duration) {
      const durationRanges = {
        short: { $lte: 10 }, // 10 hours or less
        medium: { $gt: 10, $lte: 30 }, // 11-30 hours
        long: { $gt: 30 } // More than 30 hours
      }
      filter['duration.hours'] = durationRanges[duration]
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const sortObj = {}
    
    // Handle sort parameter
    if (sort.startsWith('-')) {
      sortObj[sort.substring(1)] = -1
    } else {
      sortObj[sort] = 1
    }

    // Execute query with population
    const courses = await Course.find(filter)
      .populate('instructors.user', 'fullName email avatar')
      .populate('prerequisites', 'title slug')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-modules.lessons.content -assignments -quizzes')

    // Get total count for pagination
    const total = await Course.countDocuments(filter)

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / parseInt(limit))
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      },
      filters: {
        applied: Object.keys(filter).filter(key => key !== 'isActive' && key !== 'status'),
        available: {
          categories: await Course.distinct('category'),
          levels: await Course.distinct('level'),
          pricing: await Course.distinct('pricing.type')
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

// @route   GET /api/courses/featured
// @desc    Get featured courses (high rating, high enrollment)
// @access  Public
router.get('/featured', async (req, res, next) => {
  try {
    const { limit = 6 } = req.query

    const featuredCourses = await Course.find({
      status: 'published',
      isActive: true,
      'stats.averageRating': { $gte: 4.0 },
      'stats.totalEnrollments': { $gte: 10 }
    })
      .populate('instructors.user', 'fullName email avatar')
      .sort({ 'stats.averageRating': -1, 'stats.totalEnrollments': -1 })
      .limit(parseInt(limit))
      .select('-modules.lessons.content -assignments -quizzes')

    res.status(200).json({
      success: true,
      data: featuredCourses
    })
  } catch (error) {
    next(error)
  }
})

// @route   GET /api/courses/popular
// @desc    Get popular courses based on enrollments
// @access  Public
router.get('/popular', async (req, res, next) => {
  try {
    const { limit = 10, period = '30' } = req.query // period in days

    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - parseInt(period))

    const popularCourses = await Course.find({
      status: 'published',
      isActive: true,
      createdAt: { $gte: dateFilter }
    })
      .populate('instructors.user', 'fullName email avatar')
      .sort({ 'stats.totalEnrollments': -1, 'stats.averageRating': -1 })
      .limit(parseInt(limit))
      .select('-modules.lessons.content -assignments -quizzes')

    res.status(200).json({
      success: true,
      data: popularCourses
    })
  } catch (error) {
    next(error)
  }
})

// @route   GET /api/courses/:id
// @desc    Get course by ID with detailed information
// @access  Public
router.get('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructors.user', 'fullName email avatar bio')
      .populate('prerequisites', 'title slug description thumbnail')
      .populate('assignments')
      .populate('quizzes')

    if (!course) {
      return next(new ErrorResponse('Course not found', 404))
    }

    // Check if user is enrolled (if authenticated)
    let enrollment = null
    if (req.user) {
      enrollment = await Enrollment.findOne({
        course: req.params.id,
        student: req.user.id,
        status: { $in: ['active', 'completed'] }
      }).select('status progress completion')
    }

    // Get related courses
    const relatedCourses = await Course.find({
      _id: { $ne: req.params.id },
      category: course.category,
      status: 'published',
      isActive: true
    })
      .populate('instructors.user', 'fullName email avatar')
      .limit(6)
      .select('-modules.lessons.content -assignments -quizzes')

    // Increment view count (you might want to track this in a separate analytics model)
    // await Course.findByIdAndUpdate(req.params.id, { $inc: { 'stats.views': 1 } })

    res.status(200).json({
      success: true,
      data: {
        course,
        enrollment,
        relatedCourses
      }
    })
  } catch (error) {
    next(error)
  }
})

// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Admin/Instructor)
router.post('/', protect, authorize('admin', 'instructor'), validateCourseCreation, async (req, res, next) => {
  try {
    const courseData = {
      ...req.body,
      instructors: [{
        user: req.user.id,
        role: 'primary'
      }]
    }

    const course = await Course.create(courseData)

    // Populate instructor information
    await course.populate('instructors.user', 'fullName email avatar')

    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully'
    })
  } catch (error) {
    if (error.code === 11000) {
      return next(new ErrorResponse('Course with this title already exists', 400))
    }
    next(error)
  }
})

// @route   PUT /api/courses/:id
// @desc    Update course by ID
// @access  Private (Admin/Instructor - course owner)
router.put('/:id', protect, authorize('admin', 'instructor'), validateObjectId('id'), validateCourseUpdate, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)

    if (!course) {
      return next(new ErrorResponse('Course not found', 404))
    }

    // Check if user is authorized to update this course
    const isInstructor = course.instructors.some(instructor => 
      instructor.user.toString() === req.user.id
    )
    
    if (!isInstructor && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this course', 403))
    }

    // Update course
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('instructors.user', 'fullName email avatar')
      .populate('prerequisites', 'title slug')

    res.status(200).json({
      success: true,
      data: updatedCourse,
      message: 'Course updated successfully'
    })
  } catch (error) {
    if (error.code === 11000) {
      return next(new ErrorResponse('Course with this title already exists', 400))
    }
    next(error)
  }
})

// @route   DELETE /api/courses/:id
// @desc    Delete course by ID (soft delete)
// @access  Private (Admin/Instructor - course owner)
router.delete('/:id', protect, authorize('admin', 'instructor'), validateObjectId('id'), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)

    if (!course) {
      return next(new ErrorResponse('Course not found', 404))
    }

    // Check if user is authorized to delete this course
    const isInstructor = course.instructors.some(instructor => 
      instructor.user.toString() === req.user.id
    )
    
    if (!isInstructor && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this course', 403))
    }

    // Check if there are active enrollments
    const activeEnrollments = await Enrollment.countDocuments({
      course: req.params.id,
      status: { $in: ['active', 'completed'] }
    })

    if (activeEnrollments > 0) {
      // Soft delete - archive the course
      course.status = 'archived'
      course.isActive = false
      await course.save()

      return res.status(200).json({
        success: true,
        message: 'Course archived successfully (cannot delete due to active enrollments)'
      })
    }

    // Hard delete if no active enrollments
    await Course.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    })
  } catch (error) {
    next(error)
  }
})

// @route   GET /api/courses/:id/enrollments
// @desc    Get course enrollments (for instructors/admins)
// @access  Private (Admin/Instructor - course owner)
router.get('/:id/enrollments', protect, authorize('admin', 'instructor'), validateObjectId('id'), validatePagination, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)

    if (!course) {
      return next(new ErrorResponse('Course not found', 404))
    }

    // Check if user is authorized to view enrollments
    const isInstructor = course.instructors.some(instructor => 
      instructor.user.toString() === req.user.id
    )
    
    if (!isInstructor && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to view enrollments for this course', 403))
    }

    const { page = 1, limit = 20, status } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const filter = { course: req.params.id }
    if (status) {
      filter.status = status
    }

    const enrollments = await Enrollment.find(filter)
      .populate('student', 'fullName email avatar')
      .populate('payment')
      .sort({ enrollmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Enrollment.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: enrollments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    })
  } catch (error) {
    next(error)
  }
})

// @route   GET /api/courses/:id/analytics
// @desc    Get course analytics (for instructors/admins)
// @access  Private (Admin/Instructor - course owner)
router.get('/:id/analytics', protect, authorize('admin', 'instructor'), validateObjectId('id'), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)

    if (!course) {
      return next(new ErrorResponse('Course not found', 404))
    }

    // Check if user is authorized to view analytics
    const isInstructor = course.instructors.some(instructor => 
      instructor.user.toString() === req.user.id
    )
    
    if (!isInstructor && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to view analytics for this course', 403))
    }

    // Get enrollment statistics
    const enrollmentStats = await Enrollment.aggregate([
      { $match: { course: course._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$payment.amount' }
        }
      }
    ])

    // Get completion statistics
    const completionStats = await Enrollment.aggregate([
      { $match: { course: course._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalCompleted: { $sum: 1 },
          avgCompletionTime: { $avg: { $subtract: ['$completion.completedAt', '$enrollmentDate'] } },
          avgFinalScore: { $avg: '$completion.overallScore' }
        }
      }
    ])

    // Get recent enrollments (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentEnrollments = await Enrollment.countDocuments({
      course: course._id,
      enrollmentDate: { $gte: thirtyDaysAgo }
    })

    // Get average rating
    const ratingStats = await Enrollment.aggregate([
      { $match: { course: course._id, 'feedback.rating': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$feedback.rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ])

    res.status(200).json({
      success: true,
      data: {
        course: {
          title: course.title,
          totalEnrollments: course.stats.totalEnrollments,
          completionRate: course.stats.completionRate,
          averageRating: course.stats.averageRating
        },
        enrollmentStats,
        completionStats: completionStats[0] || {
          totalCompleted: 0,
          avgCompletionTime: 0,
          avgFinalScore: 0
        },
        recentEnrollments,
        ratingStats: ratingStats[0] || {
          avgRating: 0,
          totalRatings: 0
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

// @route   POST /api/courses/:id/enroll
// @desc    Enroll in a course
// @access  Private (Student)
router.post('/:id/enroll', protect, authorize('student'), validateObjectId('id'), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)

    if (!course) {
      return next(new ErrorResponse('Course not found', 404))
    }

    if (course.status !== 'published') {
      return next(new ErrorResponse('Course is not available for enrollment', 400))
    }

    if (!course.isActive) {
      return next(new ErrorResponse('Course is currently inactive', 400))
    }

    // Check enrollment dates
    const now = new Date()
    if (course.enrollmentStartDate && now < course.enrollmentStartDate) {
      return next(new ErrorResponse('Course enrollment has not started yet', 400))
    }

    if (course.enrollmentEndDate && now > course.enrollmentEndDate) {
      return next(new ErrorResponse('Course enrollment has ended', 400))
    }

    // Check enrollment limit
    if (course.enrollmentLimit && course.stats.totalEnrollments >= course.enrollmentLimit) {
      return next(new ErrorResponse('Course enrollment limit reached', 400))
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      course: req.params.id,
      student: req.user.id
    })

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active' || existingEnrollment.status === 'completed') {
        return next(new ErrorResponse('Already enrolled in this course', 400))
      } else if (existingEnrollment.status === 'dropped') {
        // Reactivate enrollment
        existingEnrollment.status = 'active'
        existingEnrollment.enrollmentDate = new Date()
        await existingEnrollment.save()

        return res.status(200).json({
          success: true,
          data: existingEnrollment,
          message: 'Enrollment reactivated successfully'
        })
      }
    }

    // Create new enrollment
    const enrollment = await Enrollment.create({
      course: req.params.id,
      student: req.user.id,
      payment: {
        amount: course.pricing.amount,
        currency: course.pricing.currency
      }
    })

    // Update course enrollment count
    await Course.findByIdAndUpdate(req.params.id, {
      $inc: { 'stats.totalEnrollments': 1 }
    })

    await enrollment.populate('course', 'title slug')
    await enrollment.populate('student', 'fullName email')

    res.status(201).json({
      success: true,
      data: enrollment,
      message: 'Successfully enrolled in course'
    })
  } catch (error) {
    next(error)
  }
})

// @route   GET /api/courses/:id/progress
// @desc    Get user's course progress
// @access  Private (Student - enrolled user)
router.get('/:id/progress', protect, authorize('student'), validateObjectId('id'), async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({
      course: req.params.id,
      student: req.user.id,
      status: { $in: ['active', 'completed'] }
    }).populate('course')

    if (!enrollment) {
      return next(new ErrorResponse('Not enrolled in this course', 404))
    }

    const course = enrollment.course
    const progress = enrollment.progress

    // Calculate completion percentage
    const totalLessons = course.totalLessons
    const completedLessons = progress.completedLessons.length
    const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    // Get current module and lesson
    const currentModule = course.modules[progress.currentLesson.moduleIndex] || null
    const currentLesson = currentModule ? currentModule.lessons[progress.currentLesson.lessonIndex] : null

    res.status(200).json({
      success: true,
      data: {
        enrollment: {
          status: enrollment.status,
          enrollmentDate: enrollment.enrollmentDate,
          completion: enrollment.completion
        },
        progress: {
          completedLessons: progress.completedLessons,
          completedModules: progress.completedModules,
          currentLesson: progress.currentLesson,
          totalTimeSpent: progress.totalTimeSpent,
          completionPercentage,
          lastAccessedAt: progress.lastAccessedAt
        },
        course: {
          title: course.title,
          totalLessons,
          totalDuration: course.totalDuration,
          modules: course.modules.map(module => ({
            id: module._id,
            title: module.title,
            order: module.order,
            lessonCount: module.lessons.length,
            completed: progress.completedModules.some(cm => cm.moduleId.toString() === module._id.toString())
          }))
        },
        currentModule,
        currentLesson
      }
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router 