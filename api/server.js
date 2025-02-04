const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);

// Middleware for custom query handling, filtering, sorting, and grouping
server.use((req, res, next) => {
  Object.keys(req.query).forEach((key) => {
    const newKey = key.startsWith("_") ? key.slice(1) : key;
    if (newKey !== key) {
      req.query[newKey] = req.query[key];
      delete req.query[key];
    }
  });

  if (req.query.price_gte || req.query.price_lte) {
    const priceGte = parseFloat(req.query.price_gte) || -Infinity;
    const priceLte = parseFloat(req.query.price_lte) || Infinity;
    req.query.price = (value) => value >= priceGte && value <= priceLte;
  }

  if (req.query.color) {
    const colors = req.query.color.split(",");
    req.query.color = (value) => colors.includes(value);
  }

  if (req.query.size) {
    const sizes = req.query.size.split(",");
    req.query.size = (value) => sizes.includes(value);
  }

  ["catalog_id", "category_id", "subcategory_id"].forEach((param) => {
    if (req.query[param]) {
      req.query[param] = parseInt(req.query[param]);
    }
  });

  if (req.query.page) {
    req.query._page = req.query.page;
  }
  if (req.query.per_page) {
    req.query._limit = req.query.per_page;
  }

  if (req.query.sort) {
    req.query._sort = req.query.sort;
  }
  if (req.query.order) {
    req.query._order = req.query.order || "asc";
  }

  // Embed handling
  if (req.query.embed) {
    const embedEntities = req.query.embed.split(",");
    embedEntities.forEach((entity) => {
      if (entity && req.path.includes("/catalogs")) {
        req.query._expand = entity;
      }
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

  // Filtering catalogs by category_id or subcategory_id
  if (req.path.includes("/catalogs")) {
    if (req.query.category_id || req.query.subcategory_id) {
      const data = router.db.get("catalogs").value();

      let filteredData = data;

      if (req.query.category_id) {
        const categoryId = parseInt(req.query.category_id);
        filteredData = filteredData.filter(
          (catalog) => catalog.category_id === categoryId
        );
      }

      if (req.query.subcategory_id) {
        const subcategoryId = parseInt(req.query.subcategory_id);
        filteredData = filteredData.filter(
          (catalog) => catalog.subcategory_id === subcategoryId
        );
      }

      return res.json(filteredData);
    }
  }

  next();
});

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

server.use("/api", router);

server.listen(3000, () => {
  console.log("JSON Server is running");
});

module.exports = server;
