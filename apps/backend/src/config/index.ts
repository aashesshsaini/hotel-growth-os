import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  apiPrefix: process.env.API_PREFIX || "/api/v1",
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/hotel-growth-os",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.AWS_REGION || "ap-south-1",
    s3Bucket: process.env.AWS_S3_BUCKET || "",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  },
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || "https://graph.facebook.com",
    apiVersion: process.env.WHATSAPP_API_VERSION || "v18.0",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    verifyToken:
      process.env.WHATSAPP_VERIFY_TOKEN || "hotel-growth-os-verify-token",
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || "",
  },
  automation: {
    queueName: process.env.AUTOMATION_QUEUE_NAME || "automation",
    schedulerEnabled: process.env.AUTOMATION_SCHEDULER_ENABLED !== "false",
    schedulerPollIntervalMs: parseInt(
      process.env.AUTOMATION_SCHEDULER_POLL_INTERVAL_MS || "30000",
      10,
    ),
    workerCount: parseInt(process.env.AUTOMATION_WORKER_COUNT || "2", 10),
    defaultRetryCount: parseInt(
      process.env.AUTOMATION_DEFAULT_RETRY_COUNT || "3",
      10,
    ),
    defaultRetryDelayMs: parseInt(
      process.env.AUTOMATION_DEFAULT_RETRY_DELAY_MS || "300000",
      10,
    ),
    defaultTimeoutMs: parseInt(
      process.env.AUTOMATION_DEFAULT_TIMEOUT_MS || "60000",
      10,
    ),
    defaultJobExpiryMs: parseInt(
      process.env.AUTOMATION_DEFAULT_JOB_EXPIRY_MS || "604800000",
      10,
    ),
    removeOnComplete: parseInt(
      process.env.AUTOMATION_REMOVE_ON_COMPLETE || "1000",
      10,
    ),
    removeOnFail: parseInt(process.env.AUTOMATION_REMOVE_ON_FAIL || "5000", 10),
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  seed: {
    superAdminEmail: process.env.SUPER_ADMIN_EMAIL || "admin@hotelgrowthos.com",
    superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || "Admin@123456",
    superAdminName: process.env.SUPER_ADMIN_NAME || "Super Admin",
  },
};

export default config;
