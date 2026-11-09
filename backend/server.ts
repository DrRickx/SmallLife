import app from "./app";
import { env } from "./src/config/env";

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});