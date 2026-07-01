import { z } from 'zod';

const phoneSchema = z.string().regex(/^\+?[0-9\s-]{7,20}$/, 'Invalid phone number');
const optionalPhoneSchema = phoneSchema.optional().or(z.literal(''));
const emailSchema = z.string().email();
const optionalEmailSchema = emailSchema.optional().or(z.literal(''));
const optionalUrlSchema = z.string().url().optional().or(z.literal(''));
const secretSchema = z.string().min(8).max(500).optional().or(z.literal(''));

const googleReviewUrlSchema = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return /(google|g\.page|maps\.app\.goo\.gl|goo\.gl)/i.test(url.hostname + url.pathname);
  } catch {
    return false;
  }
}, 'Invalid Google Review URL');

export const integrationTypeParamSchema = z.object({
  type: z.enum(['whatsapp', 'email', 'googleReview']),
});

export const whatsappIntegrationSchema = z.object({
  businessName: z.string().min(2).max(120),
  phoneNumber: phoneSchema,
  phoneNumberId: z.string().min(4).max(80),
  businessAccountId: z.string().min(4).max(80),
  permanentAccessToken: secretSchema,
  webhookVerifyToken: secretSchema,
  webhookSecret: secretSchema,
});

export const emailIntegrationSchema = z.object({
  smtpHost: z.string().min(2).max(200),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  username: z.string().min(1).max(200),
  password: secretSchema,
  encryption: z.enum(['none', 'ssl', 'tls', 'starttls']).default('tls'),
  senderName: z.string().min(2).max(120),
  senderEmail: emailSchema,
  replyToEmail: optionalEmailSchema,
});

export const googleReviewIntegrationSchema = z.object({
  googleReviewUrl: googleReviewUrlSchema,
  googleBusinessName: z.string().min(2).max(160),
  googlePlaceId: z.string().max(160).optional().or(z.literal('')),
  reviewButtonLabel: z.string().min(2).max(80).default('Review us on Google'),
  automationEnabled: z.boolean().default(true),
});

export const integrationUpdateSchema = z.union([
  whatsappIntegrationSchema,
  emailIntegrationSchema,
  googleReviewIntegrationSchema,
]);

export type IntegrationType = z.infer<typeof integrationTypeParamSchema>['type'];
export type WhatsAppIntegrationInput = z.infer<typeof whatsappIntegrationSchema>;
export type EmailIntegrationInput = z.infer<typeof emailIntegrationSchema>;
export type GoogleReviewIntegrationInput = z.infer<typeof googleReviewIntegrationSchema>;
export type IntegrationUpdateInput = z.infer<typeof integrationUpdateSchema>;
