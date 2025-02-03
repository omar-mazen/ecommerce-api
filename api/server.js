const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);

// Middleware for custom query handling, filtering, sorting, pagination, and grouping
server.use((req, res, next) => {
  // Normalize query parameters by removing underscores
  Object.keys(req.query).forEach((key) => {
    const newKey = key.startsWith("_") ? key.slice(1) : key;
    if (newKey !== key) {
      req.query[newKey] = req.query[key];
      delete req.query[key];
    }
  });

  // Price range filter handling
  if (req.query.price_gte || req.query.price_lte) {
    const priceGte = parseFloat(req.query.price_gte) || -Infinity;
    const priceLte = parseFloat(req.query.price_lte) || Infinity;
    req.query.price = (value) => value >= priceGte && value <= priceLte;
  }

  // Filter by color
  if (req.query.color) {
    const colors = req.query.color.split(",");
    req.query.color = (value) => colors.includes(value);
  }

  // Filter by size
  if (req.query.size) {
    const sizes = req.query.size.split(",");
    req.query.size = (value) => sizes.includes(value);
  }

  // Convert numeric query parameters
  ["catalog_id", "category_id", "subcategory_id"].forEach((param) => {
    if (req.query[param]) {
      req.query[param] = parseInt(req.query[param]);
    }
  });

  // Handle pagination
  if (req.query.page) {
    req.query._page = req.query.page;
  }
  if (req.query.per_page) {
    req.query._limit = req.query.per_page;
  }

  // Handle sorting
  if (req.query.sort) {
    req.query._sort = req.query.sort;
  }
  if (req.query.order) {
    req.query._order = req.query.order || "asc";
  }

  // Handle grouping by catalog_id, subcategory_id, or category_id
  if (req.query.group_by && ["catalog_id", "subcategory_id", "category_id"].includes(req.query.group_by)) {
    const data = router.db.get(req.path.replace("/api/", "")).value();

    const groupedData = data.reduce((acc, item) => {
      const key = item[req.query.group_by];
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return res.json(groupedData);
  }

  next();
});

// Route all API requests through /api
server.use("/api", router);
server.listen(3000, () => {
  console.log("JSON Server is running");
});

module.exports = server;
