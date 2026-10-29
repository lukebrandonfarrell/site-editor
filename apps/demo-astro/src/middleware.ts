import { applyEditableCacheHeaders } from "@thereactnativerewind/inplace/astro";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const locals = context.locals as { siteEditor?: boolean };
  if (locals.siteEditor) applyEditableCacheHeaders(response);
  return response;
});
