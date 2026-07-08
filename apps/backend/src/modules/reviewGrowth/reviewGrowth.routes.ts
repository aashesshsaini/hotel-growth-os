import { Router } from "express";
import { authMiddleware } from "../../middlewares/authMiddleware";
import {
  hotelAccessMiddleware,
  requireHotelId,
} from "../../middlewares/hotelAccessMiddleware";
import { roleMiddleware } from "../../middlewares/roleMiddleware";
import { validate } from "../../validations/validate";
import * as controller from "./reviewGrowth.controller";
import {
  analyticsQuerySchema,
  autoSendToggleSchema,
  dashboardQuerySchema,
  duplicateTemplateSchema,
  exportQuerySchema,
  googleReviewUrlValidationSchema,
  guestReviewCreateSchema,
  guestReviewListQuerySchema,
  idParamSchema,
  internalFeedbackAssignSchema,
  internalFeedbackCreateSchema,
  internalFeedbackListQuerySchema,
  internalFeedbackStatusSchema,
  feedbackCategoryCreateSchema,
  feedbackCategoryUpdateSchema,
  reminderConfigurationSchema,
  reviewCampaignCreateSchema,
  reviewCampaignListQuerySchema,
  reviewCampaignUpdateSchema,
  reviewRequestCancelSchema,
  reviewRequestCreateSchema,
  reviewRequestListQuerySchema,
  reviewRequestSendSchema,
  reviewRequestStatusSchema,
  reviewSettingsSchema,
  reviewTemplateCreateSchema,
  reviewTemplateListQuerySchema,
  reviewTemplateUpdateSchema,
} from "./reviewGrowth.validation";
import {
  privateRatingSchema,
  publicFeedbackSchema,
  tokenParamSchema,
} from "./reviewGrowth.satisfaction.validation";

const router = Router();
const viewRoles = [
  "super_admin",
  "hotel_owner",
  "hotel_manager",
  "reception_staff",
  "sales_staff",
] as const;
const manageRoles = [
  "super_admin",
  "hotel_owner",
  "hotel_manager",
  "sales_staff",
] as const;

router.get(
  "/public/:token",
  validate(tokenParamSchema, "params"),
  controller.getPublicSatisfaction,
);
router.post(
  "/public/:token/rating",
  validate(tokenParamSchema, "params"),
  validate(privateRatingSchema),
  controller.submitPrivateRating,
);
router.post(
  "/public/:token/google-click",
  validate(tokenParamSchema, "params"),
  controller.trackGoogleClick,
);
router.post(
  "/public/:token/google-complete",
  validate(tokenParamSchema, "params"),
  controller.confirmGoogleReview,
);
router.post(
  "/public/:token/feedback",
  validate(tokenParamSchema, "params"),
  validate(publicFeedbackSchema),
  controller.submitPublicFeedback,
);

router.use(authMiddleware, hotelAccessMiddleware);

router.get(
  "/dashboard",
  roleMiddleware(...viewRoles),
  validate(dashboardQuerySchema, "query"),
  requireHotelId,
  controller.dashboard,
);
router.get(
  "/analytics",
  roleMiddleware(...viewRoles),
  validate(analyticsQuerySchema, "query"),
  requireHotelId,
  controller.analytics,
);
router.get(
  "/export",
  roleMiddleware(...viewRoles),
  validate(exportQuerySchema, "query"),
  requireHotelId,
  controller.exportReviews,
);

router.get(
  "/campaigns",
  roleMiddleware(...viewRoles),
  validate(reviewCampaignListQuerySchema, "query"),
  requireHotelId,
  controller.listCampaigns,
);
router.post(
  "/campaigns",
  roleMiddleware(...manageRoles),
  validate(reviewCampaignCreateSchema),
  requireHotelId,
  controller.createCampaign,
);
router.get(
  "/campaigns/:id",
  roleMiddleware(...viewRoles),
  validate(idParamSchema, "params"),
  controller.getCampaign,
);
router.patch(
  "/campaigns/:id",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  validate(reviewCampaignUpdateSchema),
  controller.updateCampaign,
);
router.delete(
  "/campaigns/:id",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  controller.deleteCampaign,
);
router.post(
  "/campaigns/:id/enable",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  controller.enableCampaign,
);
router.post(
  "/campaigns/:id/disable",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  controller.disableCampaign,
);
router.post(
  "/campaigns/:id/complete",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  controller.completeCampaign,
);
router.post(
  "/campaigns/:id/fail",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  controller.failCampaign,
);

router.get(
  "/requests",
  roleMiddleware(...viewRoles),
  validate(reviewRequestListQuerySchema, "query"),
  requireHotelId,
  controller.listRequests,
);
router.post(
  "/requests",
  roleMiddleware(...manageRoles),
  validate(reviewRequestCreateSchema),
  requireHotelId,
  controller.createRequest,
);
router.get(
  "/requests/:id",
  roleMiddleware(...viewRoles),
  validate(idParamSchema, "params"),
  controller.getRequest,
);
router.get(
  "/requests/:id/history",
  roleMiddleware(...viewRoles),
  validate(idParamSchema, "params"),
  controller.requestHistory,
);
router.post(
  "/requests/:id/send",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  validate(reviewRequestSendSchema),
  controller.sendRequest,
);
router.post(
  "/requests/:id/resend",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  validate(reviewRequestSendSchema),
  controller.resendRequest,
);
router.post(
  "/requests/:id/cancel",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  validate(reviewRequestCancelSchema),
  controller.cancelRequest,
);
router.patch(
  "/requests/:id/status",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  validate(reviewRequestStatusSchema),
  controller.updateRequestStatus,
);

router.get(
  "/templates",
  roleMiddleware(...viewRoles),
  validate(reviewTemplateListQuerySchema, "query"),
  requireHotelId,
  controller.listTemplates,
);
router.post(
  "/templates",
  roleMiddleware(...manageRoles),
  validate(reviewTemplateCreateSchema),
  requireHotelId,
  controller.createTemplate,
);
router.get(
  "/templates/:id",
  roleMiddleware(...viewRoles),
  validate(idParamSchema, "params"),
  controller.getTemplate,
);
router.patch(
  "/templates/:id",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  validate(reviewTemplateUpdateSchema),
  controller.updateTemplate,
);
router.delete(
  "/templates/:id",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  controller.deleteTemplate,
);
router.post(
  "/templates/:id/duplicate",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  validate(duplicateTemplateSchema),
  controller.duplicateTemplate,
);
router.post(
  "/templates/:id/set-default",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  controller.setDefaultTemplate,
);

router.get(
  "/settings",
  roleMiddleware(...viewRoles),
  requireHotelId,
  controller.getSettings,
);
router.put(
  "/settings",
  roleMiddleware(...manageRoles),
  validate(reviewSettingsSchema),
  requireHotelId,
  controller.updateSettings,
);
router.post(
  "/settings/validate-google-url",
  roleMiddleware(...manageRoles),
  validate(googleReviewUrlValidationSchema),
  controller.validateGoogleUrl,
);
router.post(
  "/settings/auto-send",
  roleMiddleware(...manageRoles),
  validate(autoSendToggleSchema),
  requireHotelId,
  controller.toggleAutoSend,
);
router.post(
  "/settings/reminders",
  roleMiddleware(...manageRoles),
  validate(reminderConfigurationSchema),
  requireHotelId,
  controller.configureReminders,
);

router.get(
  "/feedback",
  roleMiddleware(...viewRoles),
  validate(internalFeedbackListQuerySchema, "query"),
  requireHotelId,
  controller.listFeedback,
);
router.post(
  "/feedback",
  roleMiddleware(...manageRoles),
  validate(internalFeedbackCreateSchema),
  requireHotelId,
  controller.submitFeedback,
);
router.get(
  "/feedback/:id",
  roleMiddleware(...viewRoles),
  validate(idParamSchema, "params"),
  controller.getFeedback,
);
router.post(
  "/feedback/:id/assign",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  validate(internalFeedbackAssignSchema),
  controller.assignFeedback,
);
router.patch(
  "/feedback/:id/status",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  validate(internalFeedbackStatusSchema),
  controller.updateFeedbackStatus,
);
router.post(
  "/feedback/:id/resolve",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  validate(internalFeedbackStatusSchema),
  controller.resolveFeedback,
);
router.get(
  "/feedback/categories",
  roleMiddleware(...viewRoles),
  controller.listCategories,
);
router.post(
  "/feedback/categories",
  roleMiddleware(...manageRoles),
  validate(feedbackCategoryCreateSchema),
  controller.createCategory,
);
router.patch(
  "/feedback/categories/:id",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  validate(feedbackCategoryUpdateSchema),
  controller.updateCategory,
);
router.delete(
  "/feedback/categories/:id",
  roleMiddleware(...manageRoles),
  validate(idParamSchema, "params"),
  controller.deleteCategory,
);

router.get(
  "/guest-reviews",
  roleMiddleware(...viewRoles),
  validate(guestReviewListQuerySchema, "query"),
  requireHotelId,
  controller.listGuestReviews,
);
router.post(
  "/guest-reviews",
  roleMiddleware(...manageRoles),
  validate(guestReviewCreateSchema),
  requireHotelId,
  controller.submitGuestReview,
);
router.get(
  "/guest-reviews/:id",
  roleMiddleware(...viewRoles),
  validate(idParamSchema, "params"),
  controller.getGuestReview,
);

export default router;
