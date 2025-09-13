const { z } = require('zod');

// Auth schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

// Submission schemas
const submissionSchema = z.object({
  userId: z.string(),
  channel: z.enum(['sms', 'email', 'chat']),
  content: z.string().max(2000, 'Content too long').min(1, 'Content is required'),
  sender: z.string().optional(),
  subject: z.string().optional()
});

const fileUploadSchema = z.object({
  userId: z.string(),
  type: z.enum(['image', 'video', 'document', 'audio']),
  file: z.object({
    originalname: z.string(),
    mimetype: z.string(),
    size: z.number(),
    buffer: z.instanceof(Buffer)
  })
});

// Webhook schema
const webhookSchema = z.object({
  submissionId: z.string(),
  status: z.enum(['ANALYSIS_STARTED', 'ANALYSIS_UPDATE', 'REPORT_READY', 'ERROR']),
  suspicious: z.boolean().optional(),
  riskScore: z.number().min(0).max(1).optional(),
  reasons: z.array(z.string()).optional(),
  timestamps: z.array(z.object({
    start: z.number(),
    end: z.number(),
    label: z.string().optional()
  })).optional(),
  progress: z.number().min(0).max(100).optional(),
  note: z.string().optional(),
  raw: z.record(z.any()).optional()
}).refine((data) => {
  // If status is REPORT_READY, suspicious and riskScore are required
  if (data.status === 'REPORT_READY') {
    return data.suspicious !== undefined && data.riskScore !== undefined;
  }
  return true;
}, {
  message: 'suspicious and riskScore are required for REPORT_READY status',
  path: ['suspicious', 'riskScore']
});

// Query params schema for submissions
const submissionsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  channel: z.enum(['sms', 'email', 'chat', 'image', 'video', 'document', 'audio']).optional(),
  riskMin: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).optional(),
  riskMax: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  query: z.string().optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  submissionSchema,
  fileUploadSchema,
  webhookSchema,
  submissionsQuerySchema
};