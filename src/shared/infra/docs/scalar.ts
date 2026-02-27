import { ApiReferenceOptions } from "@scalar/nestjs-api-reference";
import { OpenAPIObject } from "@nestjs/swagger";

export function buildScalarConfig(
  document: OpenAPIObject,
): ApiReferenceOptions & { content: OpenAPIObject } {
  return {
    content: document,
    hiddenClients: true,
    hideSearch: false,
    hideModels: true,
    hideDownloadButton: true,
    hideClientButton: true,
    expandAllResponses: true,
    expandAllModelSections: true,
    hideTestRequestButton: true,
    showDeveloperTools: "never",
    forceDarkModeState: "dark",
    hideDarkModeToggle: true,
    layout: "modern",
    darkMode: false,
    defaultOpenAllTags: true,
    documentDownloadType: "none",
    agent: {
      disabled: true,
    },
  }
}
