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
import type * as blocks_helpers from "../blocks/helpers.js";
import type * as blocks_mutations from "../blocks/mutations.js";
import type * as blocks_queries from "../blocks/queries.js";
import type * as bookGenreVotes_mutations from "../bookGenreVotes/mutations.js";
import type * as bookGenreVotes_queries from "../bookGenreVotes/queries.js";
import type * as bookNotes_mutations from "../bookNotes/mutations.js";
import type * as bookNotes_queries from "../bookNotes/queries.js";
import type * as bookUserData_migrations from "../bookUserData/migrations.js";
import type * as bookUserData_mutations from "../bookUserData/mutations.js";
import type * as bookUserData_queries from "../bookUserData/queries.js";
import type * as books_mutations from "../books/mutations.js";
import type * as books_queries from "../books/queries.js";
import type * as cleanup_deleteOrphanedBooks from "../cleanup/deleteOrphanedBooks.js";
import type * as follows_mutations from "../follows/mutations.js";
import type * as follows_queries from "../follows/queries.js";
import type * as genres_mutations from "../genres/mutations.js";
import type * as genres_queries from "../genres/queries.js";
import type * as http from "../http.js";
import type * as images_actions from "../images/actions.js";
import type * as lib_audioFileNames from "../lib/audioFileNames.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_bookRatings from "../lib/bookRatings.js";
import type * as lib_bookUserData from "../lib/bookUserData.js";
import type * as lib_enrichment from "../lib/enrichment.js";
import type * as lib_memoryTags from "../lib/memoryTags.js";
import type * as lib_r2Client from "../lib/r2Client.js";
import type * as lib_r2Keys from "../lib/r2Keys.js";
import type * as lib_wantToReadShelf from "../lib/wantToReadShelf.js";
import type * as listeningProgress_mutations from "../listeningProgress/mutations.js";
import type * as listeningProgress_queries from "../listeningProgress/queries.js";
import type * as messages_actions from "../messages/actions.js";
import type * as messages_helpers from "../messages/helpers.js";
import type * as messages_mutations from "../messages/mutations.js";
import type * as messages_queries from "../messages/queries.js";
import type * as migration_mutations from "../migration/mutations.js";
import type * as openLibrary_actions from "../openLibrary/actions.js";
import type * as openLibrary_types from "../openLibrary/types.js";
import type * as reports_mutations from "../reports/mutations.js";
import type * as reports_queries from "../reports/queries.js";
import type * as search_queries from "../search/queries.js";
import type * as seed_mutations from "../seed/mutations.js";
import type * as seed_queries from "../seed/queries.js";
import type * as series_mutations from "../series/mutations.js";
import type * as series_queries from "../series/queries.js";
import type * as shelves_mutations from "../shelves/mutations.js";
import type * as shelves_queries from "../shelves/queries.js";
import type * as storageAccounts_actions from "../storageAccounts/actions.js";
import type * as storageAccounts_internal from "../storageAccounts/internal.js";
import type * as storageAccounts_mutations from "../storageAccounts/mutations.js";
import type * as storageAccounts_queries from "../storageAccounts/queries.js";
import type * as supportRequests_actions from "../supportRequests/actions.js";
import type * as supportRequests_mutations from "../supportRequests/mutations.js";
import type * as supportRequests_queries from "../supportRequests/queries.js";
import type * as userPreferences_mutations from "../userPreferences/mutations.js";
import type * as userPreferences_queries from "../userPreferences/queries.js";
import type * as users_deleteAccount from "../users/deleteAccount.js";
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
  "blocks/helpers": typeof blocks_helpers;
  "blocks/mutations": typeof blocks_mutations;
  "blocks/queries": typeof blocks_queries;
  "bookGenreVotes/mutations": typeof bookGenreVotes_mutations;
  "bookGenreVotes/queries": typeof bookGenreVotes_queries;
  "bookNotes/mutations": typeof bookNotes_mutations;
  "bookNotes/queries": typeof bookNotes_queries;
  "bookUserData/migrations": typeof bookUserData_migrations;
  "bookUserData/mutations": typeof bookUserData_mutations;
  "bookUserData/queries": typeof bookUserData_queries;
  "books/mutations": typeof books_mutations;
  "books/queries": typeof books_queries;
  "cleanup/deleteOrphanedBooks": typeof cleanup_deleteOrphanedBooks;
  "follows/mutations": typeof follows_mutations;
  "follows/queries": typeof follows_queries;
  "genres/mutations": typeof genres_mutations;
  "genres/queries": typeof genres_queries;
  http: typeof http;
  "images/actions": typeof images_actions;
  "lib/audioFileNames": typeof lib_audioFileNames;
  "lib/auth": typeof lib_auth;
  "lib/bookRatings": typeof lib_bookRatings;
  "lib/bookUserData": typeof lib_bookUserData;
  "lib/enrichment": typeof lib_enrichment;
  "lib/memoryTags": typeof lib_memoryTags;
  "lib/r2Client": typeof lib_r2Client;
  "lib/r2Keys": typeof lib_r2Keys;
  "lib/wantToReadShelf": typeof lib_wantToReadShelf;
  "listeningProgress/mutations": typeof listeningProgress_mutations;
  "listeningProgress/queries": typeof listeningProgress_queries;
  "messages/actions": typeof messages_actions;
  "messages/helpers": typeof messages_helpers;
  "messages/mutations": typeof messages_mutations;
  "messages/queries": typeof messages_queries;
  "migration/mutations": typeof migration_mutations;
  "openLibrary/actions": typeof openLibrary_actions;
  "openLibrary/types": typeof openLibrary_types;
  "reports/mutations": typeof reports_mutations;
  "reports/queries": typeof reports_queries;
  "search/queries": typeof search_queries;
  "seed/mutations": typeof seed_mutations;
  "seed/queries": typeof seed_queries;
  "series/mutations": typeof series_mutations;
  "series/queries": typeof series_queries;
  "shelves/mutations": typeof shelves_mutations;
  "shelves/queries": typeof shelves_queries;
  "storageAccounts/actions": typeof storageAccounts_actions;
  "storageAccounts/internal": typeof storageAccounts_internal;
  "storageAccounts/mutations": typeof storageAccounts_mutations;
  "storageAccounts/queries": typeof storageAccounts_queries;
  "supportRequests/actions": typeof supportRequests_actions;
  "supportRequests/mutations": typeof supportRequests_mutations;
  "supportRequests/queries": typeof supportRequests_queries;
  "userPreferences/mutations": typeof userPreferences_mutations;
  "userPreferences/queries": typeof userPreferences_queries;
  "users/deleteAccount": typeof users_deleteAccount;
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
