import { rm } from "node:fs/promises";

const paths = [".next", ".open-next"];

await Promise.all(
  paths.map((path) =>
    rm(path, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    }),
  ),
);
