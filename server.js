const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const compression = require("compression")
const morgan = require("morgan")
const rateLimit = require("express-rate-limit")
const http = require("http")
const socketIo = require("socket.io")
require("dotenv").config()

// Import routes
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")
const courseRoutes = require("./routes/courses")
const applicationRoutes = require("./routes/applications")
const jobRoutes = require("./routes/jobs")
const paymentRoutes = require("./routes/payments")
const notificationRoutes = require("./routes/notifications")
const analyticsRoutes = require("./routes/analytics")
const fileRoutes = require("./routes/files")

// Import middleware
const errorHandler = require("./middleware/errorHandler")
const notFound = require("./middleware/notFound")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

// Security middleware
app.use(helmet())
app.use(compression())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
})
app.use("/api/", limiter)

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Logging
app.use(morgan("combined"))

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/falcons-db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err))

// Socket.IO for real-time notifications
io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  socket.on("join", (userId) => {
    socket.join(userId)
    console.log(`User ${userId} joined room`)
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })
})

// Make io accessible to routes
app.set("io", io)

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Falcons Backend API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
})

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/courses", courseRoutes)
app.use("/api/applications", applicationRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/files", fileRoutes)

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`)
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`)
})

module.exports = app
