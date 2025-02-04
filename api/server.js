const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);

// Middleware for handling query normalization and custom operations
server.use((req, res, next) => {
  // Remove trailing slashes from the request path
  if (req.path.endsWith("/")) {
    req.url = req.url.slice(0, -1);
  }

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

  // Handle _embed query
  if (req.query.embed) {
    const embedParams = req.query.embed.split(",");

    embedParams.forEach((param) => {
      req.query._expand = param.trim();
    });
  }

  // Handle group by
  if (
    req.query.group_by &&
    ["catalog_id", "subcategory_id", "category_id"].includes(req.query.group_by)
  ) {
    const data = router.db.get(req.path.replace("/api/", "")).value();

    const groupedData = data.reduce((acc, item) => {
      const key = item[req.query.group_by];
      if (key !== undefined) {
        if (!acc[key]) {
          const groupName = getGroupNameById(req.query.group_by, key);
          acc[key] = {
            id: key,
            name: groupName || `Unknown ${req.query.group_by}`,
            items: [],
          };
        }
        acc[key].items.push(item);
      }
      return acc;
    }, {});

    return res.json(Object.values(groupedData));
  }

  next();
});

// Helper function to get group names based on ID
function getGroupNameById(groupType, id) {
  const collectionMap = {
    catalog_id: "catalogs",
    category_id: "categories",
    subcategory_id: "subcategories",
  };
  const collection = collectionMap[groupType];
  if (!collection) return null;
  const record = router.db.get(collection).find({ id }).value();
  return record ? record.name : `Unknown ${collection}`;
}

// Route all API requests through /api
server.use("/api", router);

server.listen(3000, () => {
  console.log("JSON Server is running");
});

module.exports = server;
