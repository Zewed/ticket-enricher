import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.PORT, () => {
  // Keep log simple and explicit for local bootstrapping.
  console.log(`ticket-enricher running on http://localhost:${env.PORT}`);
});
