import { openai } from "@ai-sdk/openai";
import { LanguageModelV1 } from "@ai-sdk/provider";

export interface Model {
  model: string;
  displayName: string;
  description: string;
  provider: LanguageModelV1;
}

export const mainModels: Model[] = [
  {
    model: "gpt-4o",
    displayName: "4o",
    description: "Great for most tasks",
    provider: openai('gpt-4o'),
  },

  {
    model: "o3",
    displayName: "o3",
    description: "Uses advanced reasoning",
    provider: openai('o3'),
  },
  {
    model: "o4-mini",
    displayName: "o4-mini",
    description: "Fastest at advanced reasoning",
    provider: openai('o4-mini'),
  },
];

export const moreModels: Model[] = [
  {
    model: "gpt-4.1",
    displayName: "4.1",
    description: "Good for writing and exploring ideas",
    provider: openai('gpt-4.1'),
  },
  {
    model: "gpt-4.1-mini",
    displayName: "4.1 mini",
    description: "Great for coding and analysis",
    provider: openai('gpt-4.1-mini'),
  },
  {
    model: "gpt-4.1-nano",
    displayName: "4.1 nano",
    description: "Faster for everyday tasks",
    provider: openai('gpt-4.1-mini'),
  },
];
