import { OpenAPIObject } from "@nestjs/swagger";
import { ApiReferenceOptions } from "@scalar/nestjs-api-reference";

export function buildScalarConfig(content: OpenAPIObject): ApiReferenceOptions & { content: OpenAPIObject } {
  return {
    title: "TrackGeek API Reference",
    pageTitle: "TrackGeek API Reference",
    content,
    hiddenClients: true,
    hideSearch: false,
    hideModels: true,
    hideDownloadButton: true,
    hideClientButton: true,
    expandAllResponses: false,
    expandAllModelSections: false,
    hideTestRequestButton: false,
    showDeveloperTools: "never",
    forceDarkModeState: "dark",
    hideDarkModeToggle: true,
    layout: "modern",
    darkMode: false,
    defaultOpenAllTags: false,
    defaultOpenFirstTag: false,
    documentDownloadType: "none",
    agent: {
      disabled: true,
    },
  };
}
