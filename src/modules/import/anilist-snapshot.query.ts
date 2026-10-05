export const ANILIST_USER_QUERY = `
  query SnapshotUser($name: String!) {
    User(name: $name) {
      id name about siteUrl avatar { large medium } bannerImage createdAt updatedAt
      mediaListOptions {
        scoreFormat rowOrder
        animeList { sectionOrder splitCompletedSectionByFormat customLists advancedScoring advancedScoringEnabled }
        mangaList { sectionOrder splitCompletedSectionByFormat customLists advancedScoring advancedScoringEnabled }
      }
    }
  }
`;

export const ANILIST_COLLECTION_QUERY = `
  query SnapshotCollection($userId: Int!, $type: MediaType!, $chunk: Int!, $scoreFormat: ScoreFormat!) {
    MediaListCollection(userId: $userId, type: $type, chunk: $chunk, perChunk: 500) {
      hasNextChunk
      lists {
        name isCustomList isSplitCompletedList status
        entries {
          id userId mediaId status score(format: $scoreFormat) scoreRaw: score(format: POINT_100)
          progress progressVolumes repeat priority private notes hiddenFromStatusLists
          customLists advancedScores
          startedAt { year month day }
          completedAt { year month day }
          createdAt updatedAt
          media {
            id idMal type format status(version: 2)
            title { romaji english native userPreferred }
            synonyms description(asHtml: false)
            startDate { year month day } endDate { year month day }
            season seasonYear seasonInt episodes duration chapters volumes countryOfOrigin
            isLicensed source(version: 3) hashtag updatedAt
            coverImage { extraLarge large medium color } bannerImage
            genres tags { id name description category rank isGeneralSpoiler isMediaSpoiler isAdult }
            averageScore meanScore popularity favourites trending isAdult siteUrl
            nextAiringEpisode { id airingAt timeUntilAiring episode }
            trailer { id site thumbnail }
            externalLinks { id url site siteId type language color icon notes isDisabled }
            streamingEpisodes { title thumbnail url site }
            rankings { id rank type format year season allTime context }
            studios { nodes { id name isAnimationStudio siteUrl } }
          }
        }
      }
    }
  }
`;
