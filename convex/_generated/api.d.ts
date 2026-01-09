/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth_clerkWebhook from "../auth/clerkWebhook.js";
import type * as authors_mutations from "../authors/mutations.js";
import type * as authors_queries from "../authors/queries.js";
import type * as books_mutations from "../books/mutations.js";
import type * as books_queries from "../books/queries.js";
import type * as http from "../http.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "auth/clerkWebhook": typeof auth_clerkWebhook;
  "authors/mutations": typeof authors_mutations;
  "authors/queries": typeof authors_queries;
  "books/mutations": typeof books_mutations;
  "books/queries": typeof books_queries;
  http: typeof http;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
