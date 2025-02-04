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

  // Convert numeric query parameters
  ["catalog_id", "category_id", "subcategory_id"].forEach((param) => {
    if (req.query[param]) {
      req.query[param] = parseInt(req.query[param]);
    }
  });

  // Apply filters before grouping or response
  const data = router.db.get(req.path.replace("/api/", "")).value();
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

  // Grouping support
  if (req.query.group_by) {
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
    return res.json(Object.values(groupedData));
  }

  // Sorting
  if (req.query.sort) {
    filteredData.sort((a, b) =>
      req.query.order === "desc"
        ? b[req.query.sort] - a[req.query.sort]
        : a[req.query.sort] - b[req.query.sort]
    );
  }

  // Pagination
  if (req.query.page && req.query.per_page) {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.per_page);
    const start = (page - 1) * limit;
    filteredData = filteredData.slice(start, start + limit);
  }

  res.json(filteredData);
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
