const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);

// Custom query handling for filtering, pagination, sorting, and ranges
server.use((req, res, next) => {
  // Filters
  if (req.query.category_id) {
    req.query.category_id = parseInt(req.query.category_id);
  }

  // Pagination
  if (req.query._page) {
    req.query._page = req.query._page;
  }
  if (req.query._limit) {
    req.query._limit = req.query._limit;
  }

  // Sorting
  if (req.query._sort) {
    req.query._sort = req.query._sort;
  }
  if (req.query._order) {
    req.query._order = req.query._order || "asc";
  }

  // Range conditions
  if (req.query._start) {
    req.query._start = parseInt(req.query._start);
  }
  if (req.query._end) {
    req.query._end = parseInt(req.query._end);
  }

  // Other operators like 'lt', 'gt', etc.
  Object.keys(req.query).forEach((key) => {
    if (key.includes("_lt")) {
      req.query[key.replace("_lt", "")] = { $lt: req.query[key] };
    }
    if (key.includes("_lte")) {
      req.query[key.replace("_lte", "")] = { $lte: req.query[key] };
    }
    if (key.includes("_gt")) {
      req.query[key.replace("_gt", "")] = { $gt: req.query[key] };
    }
    if (key.includes("_gte")) {
      req.query[key.replace("_gte", "")] = { $gte: req.query[key] };
    }
    if (key.includes("_ne")) {
      req.query[key.replace("_ne", "")] = { $ne: req.query[key] };
    }
  });

  next();
});

server.use("/api", router);
server.listen(3000, () => {
  console.log("JSON Server is running");
});

module.exports = server;

// // See https://github.com/typicode/json-server#module
// const jsonServer = require("json-server");

// const server = jsonServer.create();

// // Uncomment to allow write operations
// // const fs = require('fs')
// // const path = require('path')
// // const filePath = path.join('db.json')
// // const data = fs.readFileSync(filePath, "utf-8");
// // const db = JSON.parse(data);
// // const router = jsonServer.router(db)

// // Comment out to allow write operations
// const router = jsonServer.router("db.json");

// const middlewares = jsonServer.defaults({ readOnly: true });

// server.use(middlewares);
// // Add this before server.use(router)
// server.use(
//   jsonServer.rewriter({
//     "/api/*": "/$1",
//     "/blog/:resource/:id/show": "/:resource/:id",
//   })
// );
// server.use(router);
// server.listen(3000, () => {
//   console.log("JSON Server is running");
// });

// // Export the Server API
// module.exports = server;
