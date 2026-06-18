import {
  RSS_FEEDS,
  fetchSingleFeed,
  fetchGdeltArticles,
  fetchGNewsArticles,
  fetchNewsApiArticles,
  fetchNewsDataArticles,
  fetchYouTubeArticles
} from "../src/services/rss/feed-fetcher";

async function runDiagnostics() {
  console.log("\n============================================================");
  console.log("             ConflictScope News Fetchers Diagnostics        ");
  console.log("============================================================\n");

  const lookbackMinutes = 60 * 24 * 7; // Lookback 7 days to ensure we get articles even for slower feeds
  const cutoff = new Date(Date.now() - lookbackMinutes * 60 * 1000);

  const rssResults: Array<{ name: string; url: string; status: "OK" | "FAIL"; count: number; error?: string }> = [];

  console.log("1. TESTING RSS FEEDS INDIVIDUALLY...");
  for (const feed of RSS_FEEDS) {
    try {
      process.stdout.write(`   Testing feed [${feed.name}]... `);
      const articles = await fetchSingleFeed(feed.name, feed.url, cutoff);
      console.log(`\x1b[32mSUCCESS (${articles.length} articles)\x1b[0m`);
      rssResults.push({
        name: feed.name,
        url: feed.url,
        status: "OK",
        count: articles.length,
      });
    } catch (err: any) {
      console.log(`\x1b[31mFAILED\x1b[0m (${err.message})`);
      rssResults.push({
        name: feed.name,
        url: feed.url,
        status: "FAIL",
        count: 0,
        error: err.message,
      });
    }
  }

  console.log("\n2. TESTING GDELT INGESTION...");
  let gdeltStatus: "OK" | "FAIL" = "OK";
  let gdeltCount = 0;
  let gdeltError = "";
  try {
    const articles = await fetchGdeltArticles(lookbackMinutes);
    console.log(`   GDELT Feed: \x1b[32mSUCCESS (${articles.length} articles)\x1b[0m`);
    gdeltCount = articles.length;
  } catch (err: any) {
    console.log(`   GDELT Feed: \x1b[31mFAILED\x1b[0m (${err.message})`);
    gdeltStatus = "FAIL";
    gdeltError = err.message;
  }

  console.log("\n3. TESTING YOUTUBE RSS FEEDS...");
  let youtubeStatus: "OK" | "FAIL" = "OK";
  let youtubeCount = 0;
  let youtubeError = "";
  try {
    const articles = await fetchYouTubeArticles(lookbackMinutes);
    console.log(`   YouTube Feed: \x1b[32mSUCCESS (${articles.length} articles)\x1b[0m`);
    youtubeCount = articles.length;
  } catch (err: any) {
    console.log(`   YouTube Feed: \x1b[31mFAILED\x1b[0m (${err.message})`);
    youtubeStatus = "FAIL";
    youtubeError = err.message;
  }

  console.log("\n4. TESTING THIRD-PARTY APIS (GNews, NewsAPI, NewsData)...");

  // GNews
  let gnewsStatus: "OK" | "FAIL" | "NO_KEY" = "OK";
  let gnewsCount = 0;
  let gnewsError = "";
  if (!process.env.GNEWS_KEY) {
    gnewsStatus = "NO_KEY";
    console.log("   GNews API: \x1b[33mSKIPPED (No GNEWS_KEY)\x1b[0m");
  } else {
    try {
      const articles = await fetchGNewsArticles(lookbackMinutes);
      console.log(`   GNews API: \x1b[32mSUCCESS (${articles.length} articles)\x1b[0m`);
      gnewsCount = articles.length;
    } catch (err: any) {
      console.log(`   GNews API: \x1b[31mFAILED\x1b[0m (${err.message})`);
      gnewsStatus = "FAIL";
      gnewsError = err.message;
    }
  }

  // NewsAPI
  let newsApiStatus: "OK" | "FAIL" | "NO_KEY" = "OK";
  let newsApiCount = 0;
  let newsApiError = "";
  if (!process.env.NEWSAPI_KEY) {
    newsApiStatus = "NO_KEY";
    console.log("   NewsAPI: \x1b[33mSKIPPED (No NEWSAPI_KEY)\x1b[0m");
  } else {
    try {
      const articles = await fetchNewsApiArticles(lookbackMinutes);
      console.log(`   NewsAPI: \x1b[32mSUCCESS (${articles.length} articles)\x1b[0m`);
      newsApiCount = articles.length;
    } catch (err: any) {
      console.log(`   NewsAPI: \x1b[31mFAILED\x1b[0m (${err.message})`);
      newsApiStatus = "FAIL";
      newsApiError = err.message;
    }
  }

  // NewsData
  let newsDataStatus: "OK" | "FAIL" | "NO_KEY" = "OK";
  let newsDataCount = 0;
  let newsDataError = "";
  if (!process.env.NEWSDATA_KEY) {
    newsDataStatus = "NO_KEY";
    console.log("   NewsData API: \x1b[33mSKIPPED (No NEWSDATA_KEY)\x1b[0m");
  } else {
    try {
      const articles = await fetchNewsDataArticles(lookbackMinutes);
      console.log(`   NewsData API: \x1b[32mSUCCESS (${articles.length} articles)\x1b[0m`);
      newsDataCount = articles.length;
    } catch (err: any) {
      console.log(`   NewsData API: \x1b[31mFAILED\x1b[0m (${err.message})`);
      newsDataStatus = "FAIL";
      newsDataError = err.message;
    }
  }

  console.log("\n============================================================");
  console.log("                      DIAGNOSTIC SUMMARY                    ");
  console.log("============================================================\n");

  const passedRss = rssResults.filter(r => r.status === "OK");
  const failedRss = rssResults.filter(r => r.status === "FAIL");

  console.log(`RSS Feeds:     ${passedRss.length} Passed / ${failedRss.length} Failed (Total: ${rssResults.length})`);
  console.log(`GDELT API:     ${gdeltStatus} (${gdeltCount} articles)`);
  console.log(`YouTube Feed:  ${youtubeStatus} (${youtubeCount} articles)`);
  console.log(`GNews API:     ${gnewsStatus} (${gnewsCount} articles)`);
  console.log(`NewsAPI:       ${newsApiStatus} (${newsApiCount} articles)`);
  console.log(`NewsData API:  ${newsDataStatus} (${newsDataCount} articles)`);

  if (failedRss.length > 0) {
    console.log("\nFAILED RSS FEEDS DETAIL:");
    failedRss.forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.name}] URL: ${r.url}`);
      console.log(`     Error: ${r.error}`);
    });
  }

  console.log("\n============================================================\n");
}

runDiagnostics();
