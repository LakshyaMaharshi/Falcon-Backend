const express = require('express')
const { protect, authorize } = require('../middleware/auth')
const router = express.Router()

// @route   GET /api/analytics/overview
// @desc    Get analytics overview (admin only)
router.get('/overview', protect, authorize('admin'), async (req, res, next) => {
  // Analytics overview logic here
  res.json({ message: 'Analytics overview' })
})

module.exports = router 