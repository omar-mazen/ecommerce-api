const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);

// Middleware for custom query handling, filtering, sorting, pagination, grouping, and embedding
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

  // Embed handling for category and/or subcategory
  if (req.path.includes("/catalogs") && req.query.embed) {
    const embeds = req.query.embed.split(",");
    let data = router.db.get("catalogs").value();

    data = data.map((catalog) => {
      embeds.forEach((relation) => {
        if (relation === "category") {
          catalog.category =
            router.db
              .get("categories")
              .find({ id: catalog.category_id })
              .value() || null;
        }
        if (relation === "subcategory") {
          catalog.subcategory =
            router.db
              .get("subcategories")
              .find({ id: catalog.subcategory_id })
              .value() || null;
        }
      });
      return catalog;
    });

    return res.json(data);
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
