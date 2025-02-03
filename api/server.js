const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);

// Custom query handling
server.use((req, res, next) => {
  // Handle query parameter sanitization
  Object.keys(req.query).forEach((key) => {
    const newKey = key.startsWith("_") ? key.slice(1) : key;
    if (newKey !== key) {
      req.query[newKey] = req.query[key];
      delete req.query[key];
    }
  });

  // Price filter handling
  if (req.query.price_gte || req.query.price_lte) {
    const priceGte = parseFloat(req.query.price_gte) || -Infinity;
    const priceLte = parseFloat(req.query.price_lte) || Infinity;
    req.query.price = { $gte: priceGte, $lte: priceLte };
  }

  // Filter by category, subcategory, and catalog IDs
  ["catalog_id", "category_id", "subcategory_id"].forEach((key) => {
    if (req.query[key]) {
      req.query[key] = parseInt(req.query[key]);
    }
  });

  // Handle color filtering
  if (req.query.color) {
    const colors = req.query.color.split(",");
    req.query["variants.color"] = { $in: colors };
  }

  // Handle size filtering
  if (req.query.size) {
    const sizes = req.query.size.split(",");
    req.query["variants.size"] = { $in: sizes };
  }

  // Pagination (per_page, page)
  if (req.query.page) req.query._page = req.query.page;
  if (req.query.per_page) req.query._limit = req.query.per_page;

  // Sorting
  if (req.query.sort) req.query._sort = req.query.sort;
  if (req.query.order) req.query._order = req.query.order || "asc";

  // Embed relationships for catalogs
  if (req.path.includes("/catalogs") && req.query.category_id) {
    const categoryId = parseInt(req.query.category_id);
    const catalogs = router.db
      .get("catalogs")
      .filter((catalog) => catalog.category_id === categoryId)
      .value();

    return res.json(catalogs);
  }

  next();
});

// Use the router for all API routes
server.use("/api", router);

server.listen(3000, () => {
  console.log("JSON Server is running");
});

module.exports = server;
