"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuSuggestion = void 0;
const firebase_functions_1 = require("firebase-functions");
(0, firebase_functions_1.setGlobalOptions)({ maxInstances: 10 });
// Uncomment if you want a test endpoint
// import { onRequest } from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";
// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", { structuredData: true });
//   response.send("Hello from Firebase!");
// });
// Export your Genkit functions
var genkit_sample_1 = require("./genkit-sample");
Object.defineProperty(exports, "menuSuggestion", { enumerable: true, get: function () { return genkit_sample_1.menuSuggestion; } });
//# sourceMappingURL=index.js.map