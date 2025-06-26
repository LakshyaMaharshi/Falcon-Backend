// Email verification template
exports.emailVerificationTemplate = (name, verificationUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Falcons Beyond Imagination</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Falcons Beyond Imagination!</h1>
                <p>Transform Your Career with Us</p>
            </div>
            <div class="content">
                <h2>Hello ${name},</h2>
                <p>Thank you for registering with Falcons Beyond Imagination! We're excited to have you join our community of learners and professionals.</p>
                <p>To complete your registration and start your journey with us, please verify your email address by clicking the button below:</p>
                <div style="text-align: center;">
                    <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </div>
                <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                <p><strong>This verification link will expire in 24 hours.</strong></p>
                <p>If you didn't create an account with us, please ignore this email.</p>
                <p>Best regards,<br>The Falcons Beyond Imagination Team</p>
            </div>
            <div class="footer">
                <p>© 2024 Falcons Beyond Imagination. All rights reserved.</p>
                <p>If you have any questions, contact us at support@falconsbeyond.com</p>
            </div>
        </div>
    </body>
    </html>
  `
}

// Password reset template
exports.passwordResetTemplate = (name, resetUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Falcons Beyond Imagination</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
                <p>Falcons Beyond Imagination</p>
            </div>
            <div class="content">
                <h2>Hello ${name},</h2>
                <p>We received a request to reset your password for your Falcons Beyond Imagination account.</p>
                <p>If you made this request, click the button below to reset your password:</p>
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #e74c3c;">${resetUrl}</p>
                <div class="warning">
                    <strong>Important:</strong>
                    <ul>
                        <li>This password reset link will expire in 10 minutes</li>
                        <li>If you didn't request this password reset, please ignore this email</li>
                        <li>Your password will remain unchanged until you create a new one</li>
                    </ul>
                </div>
                <p>For security reasons, we recommend choosing a strong password that includes:</p>
                <ul>
                    <li>At least 8 characters</li>
                    <li>A mix of uppercase and lowercase letters</li>
                    <li>Numbers and special characters</li>
                </ul>
                <p>Best regards,<br>The Falcons Beyond Imagination Team</p>
            </div>
            <div class="footer">
                <p>© 2024 Falcons Beyond Imagination. All rights reserved.</p>
                <p>If you have any questions, contact us at support@falconsbeyond.com</p>
            </div>
        </div>
    </body>
    </html>
  `
}

// Welcome email template
exports.welcomeEmailTemplate = (name, userType) => {
  const dashboardUrl =
    userType === "employer" ? "/dashboard/employer" : userType === "admin" ? "/dashboard/admin" : "/dashboard/student"

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Falcons Beyond Imagination!</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to Falcons Beyond Imagination!</h1>
                <p>Your Journey to Success Starts Here</p>
            </div>
            <div class="content">
                <h2>Hello ${name},</h2>
                <p>Congratulations! Your email has been verified and your account is now active. We're thrilled to have you as part of our community.</p>
                
                ${
                  userType === "student" || userType === "jobseeker"
                    ? `
                <div class="feature">
                    <h3>🎓 For Students & Job Seekers</h3>
                    <ul>
                        <li>Access to premium courses and training programs</li>
                        <li>Personalized career guidance and mentorship</li>
                        <li>Job placement assistance with 95% success rate</li>
                        <li>Industry-recognized certifications</li>
                        <li>Live projects and hands-on experience</li>
                    </ul>
                </div>
                `
                    : ""
                }
                
                ${
                  userType === "employer"
                    ? `
                <div class="feature">
                    <h3>🏢 For Employers</h3>
                    <ul>
                        <li>Access to a pool of skilled and trained candidates</li>
                        <li>Post job openings and manage applications</li>
                        <li>Streamlined hiring process with pre-screened talent</li>
                        <li>Custom training programs for your team</li>
                        <li>Dedicated account management support</li>
                    </ul>
                </div>
                `
                    : ""
                }
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}${dashboardUrl}" class="button">Go to Dashboard</a>
                </div>
                
                <div class="feature">
                    <h3>🚀 Next Steps</h3>
                    <ol>
                        <li>Complete your profile to get personalized recommendations</li>
                        <li>Explore our courses and programs</li>
                        <li>Connect with our community</li>
                        <li>Start your learning journey today!</li>
                    </ol>
                </div>
                
                <p>If you have any questions or need assistance, our support team is here to help. You can reach us at support@falconsbeyond.com or through the help section in your dashboard.</p>
                
                <p>Welcome aboard, and let's achieve great things together!</p>
                
                <p>Best regards,<br>The Falcons Beyond Imagination Team</p>
            </div>
            <div class="footer">
                <p>© 2024 Falcons Beyond Imagination. All rights reserved.</p>
                <p>📧 support@falconsbeyond.com | 📞 +91 9876543210</p>
            </div>
        </div>
    </body>
    </html>
  `
}

// Course enrollment confirmation
exports.courseEnrollmentTemplate = (name, courseName, courseUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Course Enrollment Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .course-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #ddd; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Enrollment Successful!</h1>
                <p>You're now enrolled in the course</p>
            </div>
            <div class="content">
                <h2>Hello ${name},</h2>
                <p>Congratulations! You have successfully enrolled in:</p>
                
                <div class="course-info">
                    <h3>📚 ${courseName}</h3>
                    <p>Your learning journey begins now! You now have full access to all course materials, videos, assignments, and resources.</p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${courseUrl}" class="button">Start Learning Now</a>
                </div>
                
                <h3>What's Next?</h3>
                <ul>
                    <li>Access your course dashboard to track progress</li>
                    <li>Download course materials and resources</li>
                    <li>Join the course community for discussions</li>
                    <li>Complete assignments and quizzes</li>
                    <li>Earn your certificate upon completion</li>
                </ul>
                
                <p>Remember, our instructors and support team are here to help you succeed. Don't hesitate to reach out if you have any questions.</p>
                
                <p>Happy learning!</p>
                
                <p>Best regards,<br>The Falcons Beyond Imagination Team</p>
            </div>
            <div class="footer">
                <p>© 2024 Falcons Beyond Imagination. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `
}

// Job application confirmation
exports.jobApplicationTemplate = (name, jobTitle, companyName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Application Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .job-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #ddd; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Application Submitted!</h1>
                <p>Your job application has been received</p>
            </div>
            <div class="content">
                <h2>Hello ${name},</h2>
                <p>Thank you for your interest in joining our team! Your application has been successfully submitted.</p>
                
                <div class="job-info">
                    <h3>💼 ${jobTitle}</h3>
                    <p><strong>Company:</strong> ${companyName}</p>
                    <p><strong>Application Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <h3>What Happens Next?</h3>
                <ol>
                    <li><strong>Application Review:</strong> Our team will review your application within 2-3 business days</li>
                    <li><strong>Initial Screening:</strong> If shortlisted, you'll receive a call or email for initial screening</li>
                    <li><strong>Interview Process:</strong> Qualified candidates will be invited for interviews</li>
                    <li><strong>Final Decision:</strong> We'll notify you of the final decision within 1-2 weeks</li>
                </ol>
                
                <p>You can track the status of your application by logging into your dashboard. We'll also send you email updates as your application progresses through our hiring process.</p>
                
                <p>Thank you for considering Falcons Beyond Imagination as your career partner. We look forward to potentially welcoming you to our team!</p>
                
                <p>Best regards,<br>The Hiring Team<br>Falcons Beyond Imagination</p>
            </div>
            <div class="footer">
                <p>© 2024 Falcons Beyond Imagination. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `
}
