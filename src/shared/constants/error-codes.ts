export const ERROR_CODES = {
	USER_NOT_FOUND: { message: "USER_NOT_FOUND", status: 404 },
	IMAGE_TYPE_NOT_SUPPORTED: {
		message: "IMAGE_TYPE_NOT_SUPPORTED",
		status: 415,
	},
	FAILED_TO_UPLOAD_IMAGE: { message: "FAILED_TO_UPLOAD_IMAGE", status: 400 },
	RATE_LIMIT_EXCEEDED: { message: "RATE_LIMIT_EXCEEDED", status: 429 },
	IGDB_SERVICE_UNAVAILABLE: {
		message: "GAME_SERVICE_UNAVAILABLE",
		status: 503,
	},
	IGDB_GAME_NOT_FOUND: { message: "IGDB_GAME_NOT_FOUND", status: 404 },
	GAME_NOT_FOUND: { message: "GAME_NOT_FOUND", status: 404 },
	GAME_ALREADY_REFRESHED: { message: "GAME_ALREADY_REFRESHED", status: 409 },
	INTERNAL_SERVER_ERROR: { message: "INTERNAL_SERVER_ERROR", status: 500 },
	NOT_FOUND: { message: "NOT_FOUND", status: 404 },
	CONFLICT: { message: "CONFLICT", status: 409 },
	UNAUTHORIZED: { message: "UNAUTHORIZED", status: 401 },
	UNPROCESSABLE_ENTITY: { message: "UNPROCESSABLE_ENTITY", status: 422 },
	PROFILE_NOT_FOUND: { message: "PROFILE_NOT_FOUND", status: 404 },
	COMMENT_NOT_FOUND: { message: "COMMENT_NOT_FOUND", status: 404 },
	REACTION_NOT_FOUND: { message: "REACTION_NOT_FOUND", status: 404 },
	TMDB_SERVICE_UNAVAILABLE: {
		message: "TMDB_SERVICE_UNAVAILABLE",
		status: 503,
	},
	USER_CANNOT_FOLLOW_SELF: {
		message: "USER_CANNOT_FOLLOW_SELF",
		status: 400,
	},
	USER_ALREADY_FOLLOWING: {
		message: "USER_ALREADY_FOLLOWING",
		status: 400,
	},
	USER_NOT_FOLLOWING: {
		message: "USER_NOT_FOLLOWING",
		status: 400,
	},
	BOOK_NOT_FOUND: {
		message: "BOOK_NOT_FOUND",
		status: 404,
	},
	TVSHOW_NOT_FOUND: {
		message: "TVSHOW_NOT_FOUND",
		status: 404,
	},
	TVSHOW_ALREADY_REFRESHED: {
		message: "TVSHOW_ALREADY_REFRESHED",
		status: 409,
	},
	MOVIE_NOT_FOUND: {
		message: "MOVIE_NOT_FOUND",
		status: 404,
	},
	MOVIE_ALREADY_REFRESHED: {
		message: "MOVIE_ALREADY_REFRESHED",
		status: 409,
	},
	MANGA_NOT_FOUND: {
		message: "MANGA_NOT_FOUND",
		status: 404,
	},
	ANIME_NOT_FOUND: {
		message: "ANIME_NOT_FOUND",
		status: 404,
	},
	JIKAN_SERVICE_UNAVAILABLE: {
		message: "JIKAN_SERVICE_UNAVAILABLE",
		status: 503,
	},
	ANIME_ALREADY_REFRESHED: {
		message: "ANIME_ALREADY_REFRESHED",
		status: 409,
	},
	BOOK_ALREADY_REFRESHED: {
		message: "BOOK_ALREADY_REFRESHED",
		status: 409,
	},
	MANGA_ALREADY_REFRESHED: {
		message: "MANGA_ALREADY_REFRESHED",
		status: 409,
	},
	HARDCOVER_SERVICE_UNAVAILABLE: {
		message: "HARDCOVER_SERVICE_UNAVAILABLE",
		status: 503,
	},
	HARDCOVER_BOOK_NOT_FOUND: {
		message: "HARDCOVER_BOOK_NOT_FOUND",
		status: 404,
	},
	FAVORITE_ALREADY_EXISTS: {
		message: "FAVORITE_ALREADY_EXISTS",
		status: 409,
	},
	FAVORITE_NOT_FOUND: {
		message: "FAVORITE_NOT_FOUND",
		status: 404,
	},
	FEED_EVENT_NOT_FOUND: {
		message: "FEED_EVENT_NOT_FOUND",
		status: 404,
	},
} as const;
