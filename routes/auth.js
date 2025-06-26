const express = require('express')
const { validateUserRegistration, validateUserLogin, validatePasswordReset } = require('../middleware/validation')
const { handleValidationErrors } = require('../middleware/validation')
const { protect } = require('../middleware/auth')
const User = require('../models/User')
const sendEmail = require('../utils/sendEmail')
const emailTemplates = require('../utils/emailTemplates')
const ErrorResponse = require('../utils/errorResponse')
const router = express.Router()

// @route   POST /api/auth/register
// @desc    Register user
router.post('/register', validateUserRegistration, async (req, res, next) => {
  try {
    const { fullName, email, password, phone, userType } = req.body;

    // Create user
    const user = new User({ fullName, email, password, phone, userType });
    // Generate email verification token
    const verificationToken = user.getEmailVerificationToken();
    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await sendEmail({
      email: user.email,
      subject: 'Verify Your Email - Falcons Beyond Imagination',
      html: emailTemplates.emailVerificationTemplate(user.fullName, verificationUrl),
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
    });
  } catch (err) {
    // Handle duplicate email error
    if (err.code === 11000 && err.keyValue && err.keyValue.email) {
      return next(new ErrorResponse('Email is already registered', 400));
    }
    next(err);
  }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', validateUserLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }
    // Check if account is active, not blocked, not locked, and email is verified
    if (!user.isActive) {
      return next(new ErrorResponse('User account is deactivated', 401));
    }
    if (user.isBlocked) {
      return next(new ErrorResponse('User account is blocked', 401));
    }
    if (user.isLocked) {
      await user.incLoginAttempts();
      return next(new ErrorResponse('Account is temporarily locked due to multiple failed login attempts', 401));
    }
    if (!user.isEmailVerified) {
      return next(new ErrorResponse('Please verify your email before logging in', 401));
    }
    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return next(new ErrorResponse('Invalid credentials', 401));
    }
    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();
    // Generate tokens
    const token = user.getSignedJwtToken();
    const refreshToken = user.getRefreshToken();
    // Return tokens and user info (excluding password)
    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        isBlocked: user.isBlocked,
      },
    });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/auth/password-reset
// @desc    Request password reset
router.post('/password-reset', validatePasswordReset, async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      // Generate reset token
      const resetToken = user.getResetPasswordToken();
      await user.save();
      // Send password reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request - Falcons Beyond Imagination',
        html: emailTemplates.passwordResetTemplate(user.fullName, resetUrl),
      });
    }
    // Always respond with success for security
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/auth/verify-email/:token
// @desc    Verify user email
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    }
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();
    // Optionally, send a welcome email here
    res.status(200).json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset user password
router.post('/reset-password/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }
    const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token.' });
    }
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router 