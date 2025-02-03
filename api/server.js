const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);

// Custom query handling for filtering, pagination, sorting, and ranges
server.use((req, res, next) => {
  // Remove underscores from query parameters
  Object.keys(req.query).forEach((key) => {
    const newKey = key.startsWith("_") ? key.slice(1) : key;
    if (newKey !== key) {
      req.query[newKey] = req.query[key];
      delete req.query[key];
    }
  });

  // Price range filter handling
  if (req.query.price_gte || req.query.price_lte) {
    let priceQuery = {};
    if (req.query.price_gte) {
      priceQuery.$gte = parseFloat(req.query.price_gte);
    }
    if (req.query.price_lte) {
      priceQuery.$lte = parseFloat(req.query.price_lte);
    }

    router.db.get("products").forEach((product) => {
      if (
        (priceQuery.$gte && product.price >= priceQuery.$gte) ||
        (priceQuery.$lte && product.price <= priceQuery.$lte)
      ) {
        return product;
      }
    });

    delete req.query.price_gte;
    delete req.query.price_lte;
  }

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
