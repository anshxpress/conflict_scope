import { Elysia, t } from "elysia";
import { db, schema } from "../../../db";
import { eq, and, desc, sql, inArray, gte, notInArray } from "drizzle-orm";
import { getSummary, getImpactReport, answerArticleChat } from "../../services/nlp/llm";
import { cosineSimilarity } from "../../services/nlp/embeddings";
import { redis } from "../../lib/redis";

export const newsRoutes = new Elysia({ prefix: "/news" })
  /**
   * GET /news/feed — serves the prioritized, importance-filtered news feed
   *
   * Params:
   *   city        — user's selected city (for local priority)
   *   state       — user's selected state (for state priority)
   *   country     — "India" | "International" | specific country
   *   categories  — comma-separated category list (e.g. "Fuel,Tax,Government")
   *   preferredCategories — user's preferred categories list for boosting
   *   minScore    — minimum importanceScore threshold (default: 60)
   *   limit       — max results (default: 50, max: 100)
   *   offset      — pagination offset (default: 0)
   */
  .get(
    "/feed",
    async ({ query }) => {
      const city = query.city || "";
      const state = query.state || "";
      const country = query.country || "";
      const categoriesParam = query.categories || "";
      const preferredCategoriesParam = query.preferredCategories || "";
      const minScore = Math.max(0, Math.min(100, parseInt(query.minScore ?? "60", 10)));
      const limit = Math.min(parseInt(query.limit ?? "50", 10), 100);
      const offset = parseInt(query.offset ?? "0", 10);

      // ── L1: Redis cache check ────────────────────────────────────────────
      const cacheKey = `news:feed:${city}:${state}:${country}:${categoriesParam}:${minScore}:${limit}:${offset}:${preferredCategoriesParam}`;
      const cached = await redis.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // Parse comma-separated categories
      const categoryList = categoriesParam
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const preferredCategoryList = preferredCategoriesParam
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const conditions: any[] = [
        // Only show articles meeting the importance threshold
        gte(schema.articles.importanceScore, minScore),
        eq(schema.articles.showInFeed, 1),
      ];

      // Country/scope filter
      if (country) {
        if (country === "International") {
          conditions.push(sql`${schema.articles.country} != 'India'`);
        } else {
          conditions.push(eq(schema.articles.country, country));
        }
      }

      // City/state scope: when city or state provided, filter to local + national
      if (city || state) {
        conditions.push(
          sql`(
            ${schema.articles.city} = ${city}
            OR ${schema.articles.state} = ${state}
            OR ${schema.articles.country} = 'India'
          )`
        );
      }

      // Multi-category filter using Postgres array overlap operator (&&)
      if (categoryList.length > 0) {
        const pgArray = `{${categoryList.map((c) => `"${c}"`).join(",")}}`;
        conditions.push(
          sql`${schema.articles.categories} IS NOT NULL
              AND ${schema.articles.categories} && ${pgArray}::text[]`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Priority ordering:
      //   1 = city match (most local)
      //   2 = state match
      //   3 = India national
      //   4 = international
      // Within each tier: sort by importance score DESC, then recency
      const priorityScore = sql<number>`
        CASE
          WHEN ${schema.articles.city} = ${city} THEN 1
          WHEN ${schema.articles.state} = ${state} THEN 2
          WHEN ${schema.articles.country} = 'India' THEN 3
          ELSE 4
        END
      `;

      let feedArticles: any[] = [];

      if (categoryList.length === 0) {
        // Home Feed Balancing mode: query 250 top articles, and group/filter in memory
        const rawArticles = await db
          .select()
          .from(schema.articles)
          .where(whereClause)
          .orderBy(
            priorityScore,
            desc(schema.articles.importanceScore),
            desc(schema.articles.publishedAt)
          )
          .limit(250);

        // Sort in-memory with boosting for preferredCategories (+15 to sorting score)
        const scoredArticles = rawArticles.map((art) => {
          let sortTier = 4;
          if (art.city && city && art.city.toLowerCase() === city.toLowerCase()) sortTier = 1;
          else if (art.state && state && art.state.toLowerCase() === state.toLowerCase()) sortTier = 2;
          else if (art.country && art.country.toLowerCase() === "india") sortTier = 3;

          const assignedCats = art.categories || [];
          const isPreferred = preferredCategoryList.some((pc) => assignedCats.includes(pc));
          const finalScore = art.importanceScore + (isPreferred ? 15 : 0);

          return {
            art,
            sortTier,
            finalScore,
          };
        });

        // Re-sort scored articles
        scoredArticles.sort((a, b) => {
          if (a.sortTier !== b.sortTier) {
            return a.sortTier - b.sortTier;
          }
          if (b.finalScore !== a.finalScore) {
            return b.finalScore - a.finalScore;
          }
          const timeA = a.art.publishedAt ? new Date(a.art.publishedAt).getTime() : 0;
          const timeB = b.art.publishedAt ? new Date(b.art.publishedAt).getTime() : 0;
          return timeB - timeA;
        });

        // Cap each category to 25% of the requested limit (e.g. max 10 if limit is 40)
        const selectedArticles: any[] = [];
        const categoryCounts: Record<string, number> = {};
        const maxPerCategory = Math.ceil((offset + limit) * 0.25);

        for (const item of scoredArticles) {
          const cat = item.art.category || "General";
          const currentCount = categoryCounts[cat] || 0;
          if (currentCount < maxPerCategory) {
            selectedArticles.push(item.art);
            categoryCounts[cat] = currentCount + 1;
          }
        }

        feedArticles = selectedArticles.slice(offset, offset + limit);
      } else {
        // Strict category tab mode (no balancing, direct query)
        const rawArticles = await db
          .select()
          .from(schema.articles)
          .where(whereClause)
          .orderBy(
            priorityScore,
            desc(schema.articles.importanceScore),
            desc(schema.articles.publishedAt)
          )
          .limit(limit)
          .offset(offset);

        // Apply +15 priority ranking boost to preferred categories if they match
        const scoredArticles = rawArticles.map((art) => {
          let sortTier = 4;
          if (art.city && city && art.city.toLowerCase() === city.toLowerCase()) sortTier = 1;
          else if (art.state && state && art.state.toLowerCase() === state.toLowerCase()) sortTier = 2;
          else if (art.country && art.country.toLowerCase() === "india") sortTier = 3;

          const assignedCats = art.categories || [];
          const isPreferred = preferredCategoryList.some((pc) => assignedCats.includes(pc));
          const finalScore = art.importanceScore + (isPreferred ? 15 : 0);

          return {
            art,
            sortTier,
            finalScore,
          };
        });

        // Sort based on new boosted priority score
        scoredArticles.sort((a, b) => {
          if (a.sortTier !== b.sortTier) {
            return a.sortTier - b.sortTier;
          }
          if (b.finalScore !== a.finalScore) {
            return b.finalScore - a.finalScore;
          }
          const timeA = a.art.publishedAt ? new Date(a.art.publishedAt).getTime() : 0;
          const timeB = b.art.publishedAt ? new Date(b.art.publishedAt).getTime() : 0;
          return timeB - timeA;
        });

        feedArticles = scoredArticles.map((s) => s.art);
      }

      const responsePayload = {
        data: feedArticles,
        limit,
        offset,
        minScore,
        total: feedArticles.length,
      };

      await redis.set(cacheKey, responsePayload, 10 * 60);
      return responsePayload;
    },
    {
      query: t.Object({
        city:       t.Optional(t.String()),
        state:      t.Optional(t.String()),
        country:    t.Optional(t.String()),
        categories: t.Optional(t.String()),
        preferredCategories: t.Optional(t.String()),
        minScore:   t.Optional(t.String()),
        limit:      t.Optional(t.String()),
        offset:     t.Optional(t.String()),
      }),
    }
  )

  /**
   * GET /news/recommendations — yields semantic content recommendations based on user read history
   */
  .get(
    "/recommendations",
    async ({ query }) => {
      const readIdsStr = query.readIds || "";
      const cacheKey = `news:recommendations:${readIdsStr || "default"}`;
      const cached = await redis.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      let responsePayload: any;

      if (!readIdsStr) {
        // Return latest 10 articles as fallback
        const latest = await db
          .select()
          .from(schema.articles)
          .orderBy(desc(schema.articles.publishedAt))
          .limit(10);
        responsePayload = { data: latest };
      } else {
        const readIds = readIdsStr.split(",").filter((id) => id.length > 0);
        if (readIds.length === 0) {
          const latest = await db
            .select()
            .from(schema.articles)
            .orderBy(desc(schema.articles.publishedAt))
            .limit(10);
          responsePayload = { data: latest };
        } else {
          // 1. Fetch embeddings for already read articles
          const readEmbeddings = await db
            .select({
              embedding: schema.articleEmbeddings.embedding,
            })
            .from(schema.articleEmbeddings)
            .where(inArray(schema.articleEmbeddings.articleId, readIds));

          if (readEmbeddings.length === 0) {
            const latest = await db
              .select()
              .from(schema.articles)
              .where(notInArray(schema.articles.id, readIds))
              .orderBy(desc(schema.articles.publishedAt))
              .limit(10);
            responsePayload = { data: latest };
          } else {
            // 2. Average the vectors to construct a target user profile centroid
            const embeddingLength = readEmbeddings[0].embedding.length;
            const centroid = new Array(embeddingLength).fill(0);
            for (const row of readEmbeddings) {
              for (let i = 0; i < embeddingLength; i++) {
                centroid[i] += row.embedding[i];
              }
            }
            for (let i = 0; i < embeddingLength; i++) {
              centroid[i] /= readEmbeddings.length;
            }

            // 3. Load other recent articles and their vectors (lookback 14 days)
            const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const candidates = await db
              .select({
                id: schema.articles.id,
                title: schema.articles.title,
                description: schema.articles.description,
                body: schema.articles.body,
                url: schema.articles.url,
                source: schema.articles.source,
                publishedAt: schema.articles.publishedAt,
                categories: schema.articles.categories,
                city: schema.articles.city,
                state: schema.articles.state,
                country: schema.articles.country,
                embedding: schema.articleEmbeddings.embedding,
              })
              .from(schema.articleEmbeddings)
              .innerJoin(schema.articles, eq(schema.articleEmbeddings.articleId, schema.articles.id))
              .where(
                and(
                  notInArray(schema.articles.id, readIds),
                  gte(schema.articles.publishedAt, cutoff)
                )
              )
              .orderBy(desc(schema.articles.publishedAt))
              .limit(100);

            // 4. Calculate similarities and pick top 10 matches
            const scored = candidates.map((cand) => {
              const sim = cosineSimilarity(centroid, cand.embedding);
              return {
                article: {
                  id: cand.id,
                  title: cand.title,
                  description: cand.description,
                  body: cand.body,
                  url: cand.url,
                  source: cand.source,
                  publishedAt: cand.publishedAt,
                  categories: cand.categories,
                  city: cand.city,
                  state: cand.state,
                  country: cand.country,
                },
                similarity: sim,
              };
            });

            scored.sort((a, b) => b.similarity - a.similarity);
            const top10 = scored.slice(0, 10).map((s) => s.article);
            responsePayload = { data: top10 };
          }
        }
      }

      await redis.set(cacheKey, responsePayload, 10 * 60);
      return responsePayload;
    },
    {
      query: t.Object({
        readIds: t.Optional(t.String()),
      }),
    }
  )

  /**
   * POST /news/:id/summary — provides or triggers bullet summaries
   */
  .post("/:id/summary", async ({ params, set }) => {
    const [article] = await db
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.id, params.id))
      .limit(1);

    if (!article) {
      set.status = 404;
      return { error: "Article not found" };
    }

    const summary = await getSummary(article.title, article.body || article.content || "");
    return { summary };
  })

  /**
   * POST /news/:id/impact — provides or triggers ordinary citizens impact report
   */
  .post("/:id/impact", async ({ params, set }) => {
    const [article] = await db
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.id, params.id))
      .limit(1);

    if (!article) {
      set.status = 404;
      return { error: "Article not found" };
    }

    const impact = await getImpactReport(article.title, article.body || article.content || "");
    return { impact };
  })

  /**
   * POST /news/:id/chat — article contextual conversation
   */
  .post(
    "/:id/chat",
    async ({ params, body, set }) => {
      const [article] = await db
        .select()
        .from(schema.articles)
        .where(eq(schema.articles.id, params.id))
        .limit(1);

      if (!article) {
        set.status = 404;
        return { error: "Article not found" };
      }

      const response = await answerArticleChat(
        article.title,
        article.body || article.content || "",
        body.history,
        body.message
      );

      return { response };
    },
    {
      body: t.Object({
        message: t.String(),
        history: t.Array(
          t.Object({
            role: t.Union([t.Literal("user"), t.Literal("model")]),
            content: t.String(),
          })
        ),
      }),
    }
  );
