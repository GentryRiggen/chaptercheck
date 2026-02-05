/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audioFiles_actions from "../audioFiles/actions.js";
import type * as audioFiles_internal from "../audioFiles/internal.js";
import type * as audioFiles_mutations from "../audioFiles/mutations.js";
import type * as audioFiles_queries from "../audioFiles/queries.js";
import type * as auth_clerkWebhook from "../auth/clerkWebhook.js";
import type * as authors_mutations from "../authors/mutations.js";
import type * as authors_queries from "../authors/queries.js";
import type * as bookUserData_mutations from "../bookUserData/mutations.js";
import type * as bookUserData_queries from "../bookUserData/queries.js";
import type * as books_mutations from "../books/mutations.js";
import type * as books_queries from "../books/queries.js";
import type * as http from "../http.js";
import type * as images_actions from "../images/actions.js";
import type * as lib_audioFileNames from "../lib/audioFileNames.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_r2Client from "../lib/r2Client.js";
import type * as lib_r2Keys from "../lib/r2Keys.js";
import type * as migration_mutations from "../migration/mutations.js";
import type * as openLibrary_actions from "../openLibrary/actions.js";
import type * as openLibrary_types from "../openLibrary/types.js";
import type * as seed_mutations from "../seed/mutations.js";
import type * as series_mutations from "../series/mutations.js";
import type * as series_queries from "../series/queries.js";
import type * as storageAccounts_internal from "../storageAccounts/internal.js";
import type * as storageAccounts_mutations from "../storageAccounts/mutations.js";
import type * as storageAccounts_queries from "../storageAccounts/queries.js";
import type * as users_helpers from "../users/helpers.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "audioFiles/actions": typeof audioFiles_actions;
  "audioFiles/internal": typeof audioFiles_internal;
  "audioFiles/mutations": typeof audioFiles_mutations;
  "audioFiles/queries": typeof audioFiles_queries;
  "auth/clerkWebhook": typeof auth_clerkWebhook;
  "authors/mutations": typeof authors_mutations;
  "authors/queries": typeof authors_queries;
  "bookUserData/mutations": typeof bookUserData_mutations;
  "bookUserData/queries": typeof bookUserData_queries;
  "books/mutations": typeof books_mutations;
  "books/queries": typeof books_queries;
  http: typeof http;
  "images/actions": typeof images_actions;
  "lib/audioFileNames": typeof lib_audioFileNames;
  "lib/auth": typeof lib_auth;
  "lib/r2Client": typeof lib_r2Client;
  "lib/r2Keys": typeof lib_r2Keys;
  "migration/mutations": typeof migration_mutations;
  "openLibrary/actions": typeof openLibrary_actions;
  "openLibrary/types": typeof openLibrary_types;
  "seed/mutations": typeof seed_mutations;
  "series/mutations": typeof series_mutations;
  "series/queries": typeof series_queries;
  "storageAccounts/internal": typeof storageAccounts_internal;
  "storageAccounts/mutations": typeof storageAccounts_mutations;
  "storageAccounts/queries": typeof storageAccounts_queries;
  "users/helpers": typeof users_helpers;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
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
