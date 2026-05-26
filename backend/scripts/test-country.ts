import { createApp } from "../src/server/app";

async function test() {
  console.log("=== IN-MEMORY ELYSIA ROUTE DIAGNOSTIC ===");
  const app = createApp();

  const paths = [
    "/api/v1/events",
    "/api/v1/country/India",
    "/api/v1/country/connections/India"
  ];

  for (const path of paths) {
    try {
      console.log(`\nDispatching request: GET ${path}`);
      const response = await app.handle(
        new Request(`http://localhost${path}`, { method: "GET" })
      );
      
      console.log(`Response Status: ${response.status}`);
      const text = await response.text();
      console.log("Body snippet:", text.slice(0, 1000));
    } catch (err: any) {
      console.error(`Exception for ${path}:`, err.stack || err.message || err);
    }
  }
}

test();
