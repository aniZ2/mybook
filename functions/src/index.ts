import { setGlobalOptions } from "firebase-functions";

setGlobalOptions({ maxInstances: 10 });

// Uncomment if you want a test endpoint
// import { onRequest } from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", { structuredData: true });
//   response.send("Hello from Firebase!");
// });

// Export your Genkit functions
export { menuSuggestion } from "./genkit-sample";
