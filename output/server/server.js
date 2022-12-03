var path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../", ".env") });
var PORT = process.env.PORT || 5000;
var cors = require('cors');
var bodyParser = require('body-parser');
var express = require('express');
var graphqlHTTP = require('express-graphql').graphqlHTTP;
var _a = require('./routes/routes'), recordRoutes = _a.recordRoutes, schema = _a.schema, resolvers = _a.resolvers;
var dbo = require('./db/conn');
var app = express();
// perform a database connection when the server starts
dbo.connectToServer(function (err) {
    if (err) {
        console.error(err);
        process.exit();
    }
    // Using ussing additional middleware
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.json());
    // Using routes for REST API (:/storefront/ , :/coupon/ , :/orders/)
    app.use(recordRoutes);
    // Using graphHTTP for graphQL (:/graphql)
    app.use('/graphql', graphqlHTTP({
        schema: schema,
        rootValue: resolvers,
        graphiql: true
    }));
    // start the Express server
    app.listen(PORT, function () {
        console.log("Server is running on port: ".concat(PORT));
    });
});
