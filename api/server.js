const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);

server.use((req, res, next) => {
  // Normalize query parameters
  Object.keys(req.query).forEach((key) => {
    const newKey = key.startsWith("_") ? key.slice(1) : key;
    if (newKey !== key) {
      req.query[newKey] = req.query[key];
      delete req.query[key];
    }
  });

  // Handle price range filtering
  if (req.query.price_gte || req.query.price_lte) {
    const priceGte = parseFloat(req.query.price_gte) || -Infinity;
    const priceLte = parseFloat(req.query.price_lte) || Infinity;
    req.query.price = (value) => value >= priceGte && value <= priceLte;
  }

  // Convert numeric query parameters
  ["catalog_id", "category_id", "subcategory_id"].forEach((param) => {
    if (req.query[param]) {
      req.query[param] = parseInt(req.query[param]);
    }
  });

  // Handle filtering by color and size
  if (req.query.color) {
    const colors = req.query.color.split(",");
    req.query.color = (value) => colors.includes(value);
  }

  if (req.query.size) {
    const sizes = req.query.size.split(",");
    req.query.size = (value) => sizes.includes(value);
  }

  // Sorting
  if (req.query.sort) {
    req.query._sort = req.query.sort;
  }
  if (req.query.order) {
    req.query._order = req.query.order || "asc";
  }

  // Pagination
  if (req.query.page) {
    req.query._page = req.query.page;
  }
  if (req.query.per_page) {
    req.query._limit = req.query.per_page;
  }

  // Grouping with filtering and sorting
  if (req.query.group_by) {
    const data = router.db.get(req.path.replace("/api/", "")).value();

    // Apply filters before grouping
    let filteredData = data;

    if (req.query.category_id) {
      filteredData = filteredData.filter(
        (item) => item.category_id === req.query.category_id
      );
    }

    if (req.query.subcategory_id) {
      filteredData = filteredData.filter(
        (item) => item.subcategory_id === req.query.subcategory_id
      );
    }

    if (req.query.price) {
      filteredData = filteredData.filter((item) =>
        req.query.price(item.price)
      );
    }

    const groupedData = filteredData.reduce((acc, item) => {
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

    const sortedGroupedData = Object.values(groupedData).sort((a, b) =>
      req.query._order === "desc"
        ? b.id - a.id
        : a.id - b.id
    );

    return res.json(sortedGroupedData);
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

server.use("/api", router);

server.listen(3000, () => {
  console.log("JSON Server is running");
});

module.exports = server;
