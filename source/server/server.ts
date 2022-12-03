const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../", ".env") })
const PORT = process.env.PORT || 5000;
const cors = require('cors');
const bodyParser = require('body-parser')
const express = require('express')
var { graphqlHTTP } = require('express-graphql');
var {recordRoutes, schema, resolvers} = require('./routes/routes')
var dbo = require('./db/conn');

const app = express();

// perform a database connection when the server starts
dbo.connectToServer(function (err) {
    if (err) {
      console.error(err);
      process.exit();
    }

    // Using ussing additional middleware
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(express.json());

    // Using routes for REST API (:/storefront/ , :/coupon/ , :/orders/)
    app.use(recordRoutes);
    // Using graphHTTP for graphQL (:/graphql)
    app.use('/graphql', graphqlHTTP({
      schema: schema,
      rootValue: resolvers,
      graphiql: true,
    }));

    // start the Express server
    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
});





