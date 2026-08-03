export const ERROR_CODES = {
  USER_NOT_FOUND: {
    code: "USER_NOT_FOUND",
    status: 404,
  },
  IMAGE_TYPE_NOT_SUPPORTED: {
    code: "IMAGE_TYPE_NOT_SUPPORTED",
    status: 415,
  },
  FAILED_TO_UPLOAD_IMAGE: {
    code: "FAILED_TO_UPLOAD_IMAGE",
    status: 400,
  },
  RATE_LIMIT_EXCEEDED: {
    code: "RATE_LIMIT_EXCEEDED",
    status: 429,
  },
  IGDB_SERVICE_UNAVAILABLE: {
    code: "GAME_SERVICE_UNAVAILABLE",
    status: 503,
  },
  IGDB_GAME_NOT_FOUND: {
    code: "IGDB_GAME_NOT_FOUND",
    status: 404,
  },
  GAME_NOT_FOUND: {
    code: "GAME_NOT_FOUND",
    status: 404,
  },
  GAME_ALREADY_REFRESHED: {
    code: "GAME_ALREADY_REFRESHED",
    status: 409,
  },
  INTERNAL_SERVER_ERROR: {
    code: "INTERNAL_SERVER_ERROR",
    status: 500,
  },
  NOT_FOUND: {
    code: "NOT_FOUND",
    status: 404,
  },
  DATABASE_CONFLICT: {
    code: "DATABASE_CONFLICT",
    status: 409,
  },
  DATABASE_ITEM_NOT_FOUND: {
    code: "DATABASE_ITEM_NOT_FOUND",
    status: 404,
  },
  DATABASE_VALIDATION_ERROR: {
    code: "DATABASE_VALIDATION_ERROR",
    status: 422,
  },
  CONFLICT: {
    code: "CONFLICT",
    status: 409,
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    status: 401,
  },
  UNPROCESSABLE_ENTITY: {
    code: "UNPROCESSABLE_ENTITY",
    status: 422,
  },
  PROFILE_NOT_FOUND: {
    code: "PROFILE_NOT_FOUND",
    status: 404,
  },
  COMMENT_NOT_FOUND: {
    code: "COMMENT_NOT_FOUND",
    status: 404,
  },
  REACTION_NOT_FOUND: {
    code: "REACTION_NOT_FOUND",
    status: 404,
  },
  NOTIFICATION_NOT_FOUND: {
    code: "NOTIFICATION_NOT_FOUND",
    status: 404,
  },
  TMDB_SERVICE_UNAVAILABLE: {
    code: "TMDB_SERVICE_UNAVAILABLE",
    status: 503,
  },
  USER_CANNOT_FOLLOW_SELF: {
    code: "USER_CANNOT_FOLLOW_SELF",
    status: 400,
  },
  USER_ALREADY_FOLLOWING: {
    code: "USER_ALREADY_FOLLOWING",
    status: 400,
  },
  USER_NOT_FOLLOWING: {
    code: "USER_NOT_FOLLOWING",
    status: 400,
  },
  BOOK_NOT_FOUND: {
    code: "BOOK_NOT_FOUND",
    status: 404,
  },
  TV_SHOW_NOT_FOUND: {
    code: "TVSHOW_NOT_FOUND",
    status: 404,
  },
  TV_SHOW_ALREADY_REFRESHED: {
    code: "TVSHOW_ALREADY_REFRESHED",
    status: 409,
  },
  MOVIE_NOT_FOUND: {
    code: "MOVIE_NOT_FOUND",
    status: 404,
  },
  MOVIE_ALREADY_REFRESHED: {
    code: "MOVIE_ALREADY_REFRESHED",
    status: 409,
  },
  MOVIE_FRANCHISE_NOT_FOUND: {
    code: "MOVIE_FRANCHISE_NOT_FOUND",
    status: 404,
  },
  GAME_FRANCHISE_NOT_FOUND: {
    code: "GAME_FRANCHISE_NOT_FOUND",
    status: 404,
  },
  BOOK_FRANCHISE_NOT_FOUND: {
    code: "BOOK_FRANCHISE_NOT_FOUND",
    status: 404,
  },
  MANGA_NOT_FOUND: {
    code: "MANGA_NOT_FOUND",
    status: 404,
  },
  ANIME_NOT_FOUND: {
    code: "ANIME_NOT_FOUND",
    status: 404,
  },
  TENRAI_SERVICE_UNAVAILABLE: {
    code: "TENRAI_SERVICE_UNAVAILABLE",
    status: 503,
  },
  ANILIST_SERVICE_UNAVAILABLE: {
    code: "ANILIST_SERVICE_UNAVAILABLE",
    status: 503,
  },
  ANIME_ALREADY_REFRESHED: {
    code: "ANIME_ALREADY_REFRESHED",
    status: 409,
  },
  BOOK_ALREADY_REFRESHED: {
    code: "BOOK_ALREADY_REFRESHED",
    status: 409,
  },
  MANGA_ALREADY_REFRESHED: {
    code: "MANGA_ALREADY_REFRESHED",
    status: 409,
  },
  HARDCOVER_SERVICE_UNAVAILABLE: {
    code: "HARDCOVER_SERVICE_UNAVAILABLE",
    status: 503,
  },
  HARDCOVER_BOOK_NOT_FOUND: {
    code: "HARDCOVER_BOOK_NOT_FOUND",
    status: 404,
  },
  FAVORITE_ALREADY_EXISTS: {
    code: "FAVORITE_ALREADY_EXISTS",
    status: 409,
  },
  FAVORITE_NOT_FOUND: {
    code: "FAVORITE_NOT_FOUND",
    status: 404,
  },
  FEED_EVENT_NOT_FOUND: {
    code: "FEED_EVENT_NOT_FOUND",
    status: 404,
  },
  LIST_ALREADY_EXISTS: {
    code: "LIST_ALREADY_EXISTS",
    status: 409,
  },
  LIST_NOT_FOUND: {
    code: "LIST_NOT_FOUND",
    status: 404,
  },
  LIST_ITEM_ALREADY_EXISTS: {
    code: "LIST_ITEM_ALREADY_EXISTS",
    status: 409,
  },
  LIST_ITEM_NOT_FOUND: {
    code: "LIST_ITEM_NOT_FOUND",
    status: 404,
  },
  REVIEW_NOT_FOUND: {
    code: "REVIEW_NOT_FOUND",
    status: 404,
  },
  REVIEW_ALREADY_EXISTS: {
    code: "REVIEW_ALREADY_EXISTS",
    status: 409,
  },
  PROGRESS_NOT_FOUND: {
    code: "PROGRESS_NOT_FOUND",
    status: 404,
  },
  INVALID_CHAPTERS_READ: {
    code: "INVALID_CHAPTERS_READ",
    status: 400,
  },
  INVALID_EPISODES_WATCHED: {
    code: "INVALID_EPISODES_WATCHED",
    status: 400,
  },
  ANIME_EPISODES_NOT_FOUND: {
    code: "ANIME_EPISODES_NOT_FOUND",
    status: 404,
  },
  EPISODE_NOT_FOUND: {
    code: "EPISODE_NOT_FOUND",
    status: 404,
  },
  TV_SHOW_SEASONS_NOT_FOUND: {
    code: "TV_SHOW_SEASONS_NOT_FOUND",
    status: 404,
  },
  STRIPE_WEBHOOK_ERROR: {
    code: "STRIPE_WEBHOOK_ERROR",
    status: 400,
  },
  STRIPE_DONATE_PRODUCT_NOT_FOUND: {
    code: "STRIPE_DONATE_PRODUCT_NOT_FOUND",
    status: 404,
  },
  STRIPE_PRODUCT_NOT_FOUND: {
    code: "STRIPE_PRODUCT_NOT_FOUND",
    status: 404,
  },
  STRIPE_PRICE_NOT_FOUND: {
    code: "STRIPE_PRICE_NOT_FOUND",
    status: 404,
  },
  STRIPE_SUBSCRIPTION_NOT_FOUND: {
    code: "STRIPE_SUBSCRIPTION_NOT_FOUND",
    status: 404,
  },
  PAYMENT_NOT_FOUND: {
    code: "PAYMENT_NOT_FOUND",
    status: 404,
  },
  STRIPE_SUBSCRIPTION_NO_UPGRADE: {
    code: "STRIPE_SUBSCRIPTION_NO_UPGRADE",
    status: 400,
  },
  ACTIVE_SUBSCRIPTION_EXISTS: {
    code: "ACTIVE_SUBSCRIPTION_EXISTS",
    status: 400,
  },
  USER_CANNOT_UNFOLLOW_SELF: {
    code: "USER_CANNOT_UNFOLLOW_SELF",
    status: 400,
  },
  USER_USERNAME_ALREADY_EXISTS: {
    code: "USER_USERNAME_ALREADY_EXISTS",
    status: 409,
  },
} as const;
