// Import the Genkit core libraries
import { genkit, z } from "genkit";
import { onCallGenkit } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";

// Store your model API key in Cloud Secret Manager
const apiKey = defineSecret("GOOGLE_GENAI_API_KEY");

// Initialize Genkit
const ai = genkit({
  plugins: [
    // Add plugins like @genkit-ai/googleai, @genkit-ai/openai, etc.
  ],
});

// Define a flow that uses an LLM to generate menu suggestions
const menuSuggestionFlow = ai.defineFlow(
  {
    name: "menuSuggestionFlow",
    inputSchema: z.string().describe("A restaurant theme").default("seafood"),
    outputSchema: z.string(),
    streamSchema: z.string(),
  },
  async (subject, { sendChunk }) => {
    const prompt = `Suggest an item for the menu of a ${subject} themed restaurant`;

    // ⚠️ Replace "googleai/gemini-1.5-flash" with whichever model you’ve enabled
    const { response, stream } = ai.generateStream({
      model: "googleai/gemini-1.5-flash",
      prompt,
      config: { temperature: 1 },
    });

    for await (const chunk of stream) {
      sendChunk(chunk.text);
    }

    return (await response).text;
  }
);

// Export as a callable function
export const menuSuggestion = onCallGenkit(
  {
    secrets: [apiKey], // grants model key to the function
  },
  menuSuggestionFlow
);
