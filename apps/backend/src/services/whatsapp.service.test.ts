import assert from "node:assert/strict";
import test from "node:test";
import { WhatsAppService } from "./whatsapp.service";

test("sendReviewRequest uses the configured Meta WhatsApp Cloud API endpoint", async () => {
  process.env.WHATSAPP_ACCESS_TOKEN = "access-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";
  process.env.WHATSAPP_API_VERSION = "v25.0";

  const service = new WhatsAppService();
  let requestedUrl: string | undefined;
  let requestBody: Record<string, unknown> | undefined;

  const originalFetch = global.fetch;
  global.fetch = (async (input: string | URL, init?: RequestInit) => {
    requestedUrl = String(input);
    requestBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const result = await service.sendReviewRequest({
      phone: "+1 555 123 4567",
      content: "Please review your stay",
    });

    assert.equal(result.success, true);
    assert.equal(
      requestedUrl,
      "https://graph.facebook.com/v25.0/123456789/messages",
    );
    assert.equal(requestBody?.to, "15551234567");
    assert.equal(result.whatsappMessageId, "wamid.test");
  } finally {
    global.fetch = originalFetch;
  }
});
