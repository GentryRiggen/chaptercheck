import { httpRouter } from "convex/server";
import { handleClerkWebhook } from "./auth/clerkWebhook";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: handleClerkWebhook,
});

export default http;
