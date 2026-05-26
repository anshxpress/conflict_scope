async function test() {
  console.log("=== DIAGNOSTIC API TEST ===");
  
  const endpoints = [
    "http://localhost:3001/api/v1/events",
    "http://localhost:3001/api/v1/country/India",
    "http://localhost:3001/api/v1/country/connections/India"
  ];

  for (const url of endpoints) {
    try {
      console.log(`\nFetching: ${url}`);
      const res = await fetch(url);
      console.log(`Status: ${res.status} ${res.statusText}`);
      const data = await res.json();
      console.log("Response:", JSON.stringify(data, null, 2).slice(0, 500) + (JSON.stringify(data).length > 500 ? "\n... (truncated)" : ""));
    } catch (err: any) {
      console.error(`Error fetching ${url}:`, err.message);
    }
  }
}

test();
