var _a = require('mongodb'), MongoClient = _a.MongoClient, ServerApiVersion = _a.ServerApiVersion;
var connectionString = process.env.ATLAS_URI;
var client = new MongoClient(connectionString, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
var db_name = process.env.DB_NAME || 'reef_db';
var dbConnection;
// Export mongoDB connection
module.exports = {
    connectToServer: function (callback) {
        client.connect(function (err, db) {
            if (err || !db) {
                return callback(err);
            }
            dbConnection = db.db(db_name);
            console.log('Successfully connected to MongoDB.');
            return callback();
        });
    },
    getDb: function () {
        return dbConnection;
    }
};
