export const FeedEventType = {
  newFollower: "follower.new",
  newComment: "comment.new",
} as const

export type FeedEventType = typeof FeedEventType[keyof typeof FeedEventType];