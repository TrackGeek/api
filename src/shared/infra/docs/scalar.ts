import { OpenAPIObject } from "@nestjs/swagger";
import { ApiReferenceOptions } from "@scalar/nestjs-api-reference";

export function buildScalarConfig(document: OpenAPIObject): ApiReferenceOptions & { content: OpenAPIObject } {
  return {
    content: document,
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
