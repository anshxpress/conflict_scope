async function testNewsFeed() {
  console.log("=== GEOGRAPHIC & CATEGORICAL NEWS FEED API TEST ===");

  const urls = [
    // 1. Fetch general feed (default minScore = 60)
    "http://localhost:3001/api/v1/news/feed?limit=5",
    // 2. Fetch feed for city=Delhi (prioritizing local/state)
    "http://localhost:3001/api/v1/news/feed?city=Delhi&state=Delhi&limit=5",
    // 3. Fetch feed filtered by "Government" and "Weather" categories
    "http://localhost:3001/api/v1/news/feed?categories=Government,Weather&limit=5",
    // 4. Fetch feed with low score threshold (minScore = 30)
    "http://localhost:3001/api/v1/news/feed?minScore=30&limit=5"
  ];

  for (const url of urls) {
    try {
      console.log(`\n----------------------------------------\nGET: ${url}`);
      const res = await fetch(url);
      console.log(`Status: ${res.status} ${res.statusText}`);
      if (!res.ok) {
        console.error(`Error response: ${await res.text()}`);
        continue;
      }
      const data: any = await res.json();
      console.log(`Articles returned: ${data.data?.length || 0}`);
      
      if (data.data && data.data.length > 0) {
        data.data.forEach((article: any, index: number) => {
          console.log(`  ${index + 1}. [Score: ${article.importanceScore}] [Categories: ${article.categories?.join(", ")}] "${article.title}"`);
          console.log(`     Location: City=${article.city}, State=${article.state}, Country=${article.country}`);
          console.log(`     Source: ${article.source} | URL: ${article.url.slice(0, 80)}...`);
        });
      } else {
        console.log("  No articles found in this query.");
      }
    } catch (err: any) {
      console.error(`Fetch failed for ${url}:`, err.message);
    }
  }
}

testNewsFeed();
