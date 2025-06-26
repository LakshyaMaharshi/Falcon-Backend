const nodemailer = require("nodemailer")

const sendEmail = async (options) => {
  // Create transporter
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  // Define email options
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || "Falcons Beyond Imagination"} <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    html: options.html || options.message,
    text: options.text,
  }

  // Add attachments if provided
  if (options.attachments) {
    mailOptions.attachments = options.attachments
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent: ", info.messageId)
    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (error) {
    console.error("Email sending failed: ", error)
    throw new Error("Email could not be sent")
  }
}

module.exports = sendEmail
