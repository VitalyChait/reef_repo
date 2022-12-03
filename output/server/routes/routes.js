"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.resolvers = exports.schema = exports.recordRoutes = void 0;
var express = require("express");
var bson_1 = require("bson");
var buildSchema = require('graphql').buildSchema;
// scema is our graphql schema instance
// resolvers is our graphql resolver
// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control all of the requests that are not in path: /graphql.
var recordRoutes = express.Router();
exports.recordRoutes = recordRoutes;
// This will help us connect to the database
var dbo = require('../db/conn');
// These are our enivorment settigns, the db.collections name (sub db tables)
var STOREFRONT_COLLECTION = process.env.SROTEFRONT_COLL || 'storefrontCollection';
var COUPONS_COLLECTION = process.env.COUPONS_COLL || 'couponsCollection';
var ORDERS_COLLECTION = process.env.ORDERS_COLL || 'ordersCollection';
// Object definitions, used for creating new objects
// Inside there should be also the fields Dtype validation
// Returns null for failures
var StorefrontObject = function (request) {
    // Constructor
    var name, address, image, coupons, menu, coverage;
    if (request.name && request.address) {
        name = request.name;
        address = request.address;
    }
    else {
        return null;
    }
    if (request.image) {
        image = request.image;
    }
    else {
        image = "0";
    }
    if (request.coupons) {
        coupons = request.coupons;
    }
    else {
        coupons = [];
    }
    if (request.menu) {
        menu = request.menu;
    }
    else {
        menu = [];
    }
    if (request.coverage) {
        coverage = request.coverage;
    }
    else {
        coverage = [];
    }
    return {
        name: name,
        address: address,
        image: image,
        coupons: coupons,
        menu: menu,
        coverage: coverage
    };
};
var OrderObject = function (request) {
    // Constructor
    var name, address, storefront, items, coupons, total;
    if (request.name && request.address && request.storefront) {
        name = request.name;
        address = request.address;
        storefront = request.storefront;
    }
    else {
        return null;
    }
    if (request.items) {
        items = request.items;
    }
    else {
        items = [];
    }
    if (request.coupons) {
        coupons = request.coupons;
    }
    else {
        coupons = [];
    }
    if (request.total) {
        total = request.total;
    }
    else {
        total = 0;
    }
    return {
        name: name,
        address: address,
        storefront: storefront,
        items: items,
        coupons: coupons,
        total: total
    };
};
var CouponObject = function (request) {
    // Constructor
    var code, value, percentage_base;
    if (request.code) {
        code = request.code;
    }
    else {
        return null;
    }
    if (request.value) {
        value = request.value;
    }
    else {
        value = 0;
    }
    if (request.percentage_base) {
        percentage_base = request.percentage_base;
    }
    else {
        percentage_base = false;
    }
    return {
        code: code,
        value: value,
        percentage_base: percentage_base
    };
};
// helper query variable for projection
var id_projection = { $project: { _id: 1 } };
var unwind_id = { $unwind: "$_id" };
var unwind_items = { $unwind: "$items" };
var unwind_store = { $unwind: "$storefront" };
var unwind_menu = { $unwind: "$menu" };
// Below are our helper for the SQL actions (manly aggregates)
var line_item_projection = {
    $project: {
        _id: 0,
        menu: 1
    }
};
var coupon_look_up_code_to_fields = {
    $lookup: {
        from: COUPONS_COLLECTION,
        localField: "coupons",
        foreignField: "code",
        as: "coupons"
    }
};
var storefront_look_up_name_to_fields = {
    $lookup: {
        from: STOREFRONT_COLLECTION,
        localField: "storefront",
        foreignField: "name",
        as: "storefront"
    }
};
var project_storefront_to_basic_fields_v1 = {
    "$project": {
        "storefront.coverage": 0,
        "storefront.menu": 0,
        "storefront.coupons": 0
    }
};
var project_storefront_to_basic_fields_v2 = {
    "$project": {
        "coverage": 0,
        "menu": 0,
        "coupons": 0
    }
};
// V1 calculates order sum by their saved value
var order_sum_aggerate_v1 = {
    $group: {
        _id: null,
        sum: {
            $sum: "$total"
        }
    }
};
// V2 calculates order sum per item - currently not in use
var order_sum_aggerate_v2 = {
    $group: {
        _id: null,
        sum: {
            $sum: "$items.value"
        }
    }
};
// Helper functions for our db requests 
function order_sum_get_sum(data) {
    try {
        data[0]["sum"];
    }
    catch (err) {
        return null;
    }
    return data[0]["sum"];
}
;
// Helper function to graphQL to return the 
function delete_helper(data) {
    return data.value;
}
// function debugFunction(data){
//   console.log(JSON.stringify(data));
//   return data;
// }
///////////////////
//// GRAPH QL ////
/////////////////
// Scheme - TBD - to be moved to a designated scheme.graphql file 
var schema = buildSchema("\n  type Coupon {\n    code: String\n    value: Float\n    percentage_base: Boolean\n  }\n\n  type Lineitem {\n    name: String\n    value: Float\n  }\n\n  type Storefront_basic {\n    name: String\n    address: String\n    image: String\n  }\n\n  type Storefront {\n    name: String\n    address: String\n    image: String\n    coverage: [String]\n    menu: [Lineitem]\n    coupons: [Coupon]\n  }\n\n  type Order_basic{\n    _id: ID\n    name: String\n    address: String\n  }\n\n  type Order {\n    _id: ID\n    name: String\n    address: String\n    storefront: Storefront_basic\n    items: [Lineitem]\n    coupons: [Coupon]\n    total: Float\n  }\n\n\n  input Lineitem_input {\n    name: String!\n    value: Float!\n  }\n\n  input new_Storefront_input {\n    name: String!\n    address: String!\n    image: String\n    coverage: [String]\n    menu: [Lineitem_input]\n    coupons: [String]\n  }\n\n  input update_Storefront_input {\n    name: String!\n    address: String\n    image: String\n    coverage: [String]\n    menu: [Lineitem_input]\n    coupons: [String]\n  }\n\n  input new_Coupon_input {\n    code: String!\n    value: Float!\n    percentage_base: Boolean!\n  }\n\n  input update_Coupon_input {\n    code: String!\n    value: Float\n    percentage_base: Boolean\n  }\n\n\n  input new_Order_input {\n    name: String!\n    address: String!\n    storefront: String!\n    items: [Lineitem_input!]\n    coupons: [new_Coupon_input]\n    total: Float!\n  }\n\n  input update_Order_input {\n    name: String!\n    address: String\n    storefront: String\n    items: [Lineitem_input]\n    coupons: [new_Coupon_input]\n    total: Float\n  }\n\n\n  type Query {\n    get_all_storefronts: [Storefront]\n    get_all_storefront_in_my_area (area: String!): [Storefront_basic]\n    get_menu (storeName: String!): [Lineitem]\n    calculate_order_totals (customer_name: String, store_name: String): Float\n\n    getStorefront (name: String!): [Storefront]\n    getCoupon (code: String!): [Coupon]\n    getOrder (id: String!): [Order]\n  }\n\n  type Mutation {\n    createStorefront(input: new_Storefront_input): Storefront\n    updateStorefront(input: update_Storefront_input): Storefront\n    deleteStorefront(name: String!): Storefront_basic\n\n    createCoupon(input: new_Coupon_input): Coupon\n    updateCoupon(input: update_Coupon_input): Coupon\n    deleteCoupon(code: String!): Coupon\n\n    createOrder(input: new_Order_input): Order\n    updateOrder(input: update_Order_input): Order\n    deleteOrder(id: String!): Order_basic\n  }\n");
exports.schema = schema;
// Provide resolver functions for your schema fields
var resolvers = {
    // Will return all storefront, including detailed information (coupons, lineitems, etc..)
    get_all_storefronts: function () {
        return dbo.getDb()
            .collection(STOREFRONT_COLLECTION)
            .aggregate([coupon_look_up_code_to_fields])
            .toArray();
    },
    // Will return all storefront in a specific area, limited information version
    get_all_storefront_in_my_area: function (_a) {
        var area = _a.area;
        var matching = {
            $match: {
                coverage: { $all: [area] }
            }
        };
        return dbo.getDb()
            .collection(STOREFRONT_COLLECTION)
            .aggregate([matching, coupon_look_up_code_to_fields, project_storefront_to_basic_fields_v2])
            .toArray();
    },
    // Will return all menu items for a specific store name
    get_menu: function (_a) {
        var storeName = _a.storeName;
        var matching = {
            $match: {
                name: storeName
            }
        };
        return dbo.getDb()
            .collection(STOREFRONT_COLLECTION)
            .aggregate([matching, line_item_projection, unwind_menu])
            .toArray();
    },
    // Will sum of all orders, by customer name and/or by store name. See comments below. 
    calculate_order_totals: function (_a) {
        var customer_name = _a.customer_name, store_name = _a.store_name;
        var listingQuery = {};
        if (customer_name) {
            listingQuery["name"] = customer_name;
        }
        if (store_name) {
            listingQuery["storefront"] = store_name;
        }
        var matching = {
            $match: listingQuery
        };
        return dbo.getDb()
            .collection(ORDERS_COLLECTION)
            .aggregate([matching, order_sum_aggerate_v1])
            .toArray().then(order_sum_get_sum);
        // .aggregate([matching, unwind_items, order_sum_aggerate_v2]) - TBD (??) create logic with applied coupons and item price??
        // if coupon is not percentage_base deduct with -value
        // if coupon is percentage_base multiply by (1-value) 
        // posible to sort and/or create logic where the minimum discount is applied to the order total 
    },
    // Query: Reads 
    // Get storefront by name (assuming it is unique)
    getStorefront: function (_a) {
        var name = _a.name;
        var matching = {
            $match: {
                name: name
            }
        };
        return dbo.getDb()
            .collection(STOREFRONT_COLLECTION)
            .aggregate([matching, coupon_look_up_code_to_fields])
            .toArray();
    },
    // Get coupon by code (assuming it is unique)
    getCoupon: function (_a) {
        var code = _a.code;
        var matching = {
            $match: {
                code: code
            }
        };
        return dbo.getDb()
            .collection(COUPONS_COLLECTION)
            .aggregate([matching])
            .toArray();
    },
    // Get order by id (assuming it is unique)
    getOrder: function (_a) {
        var id = _a.id;
        var matching = {
            $match: {
                _id: new bson_1.ObjectId(id)
            }
        };
        return dbo.getDb()
            .collection(ORDERS_COLLECTION)
            .aggregate([matching, storefront_look_up_name_to_fields, project_storefront_to_basic_fields_v1, unwind_store])
            .toArray();
    },
    // Mutation: (Create, Update, Delete)
    createStorefront: function (_a) {
        var input = _a.input;
        var matchDocument = StorefrontObject(input);
        if (!matchDocument) {
            return null;
        }
        dbo.getDb().
            collection(STOREFRONT_COLLECTION).
            insertOne(matchDocument);
        return matchDocument;
    },
    updateStorefront: function (_a) {
        var input = _a.input;
        // TBD
        return null;
    },
    deleteStorefront: function (_a) {
        var name = _a.name;
        var listingQuery = { name: name };
        return dbo.getDb()
            .collection(STOREFRONT_COLLECTION)
            .findOneAndDelete(listingQuery)
            .then(delete_helper);
    },
    createCoupon: function (_a) {
        var input = _a.input;
        var matchDocument = CouponObject(input);
        if (!matchDocument) {
            return null;
        }
        dbo.getDb().
            collection(COUPONS_COLLECTION).
            insertOne(matchDocument);
        return matchDocument;
    },
    updateCoupon: function (_a) {
        var input = _a.input;
        // TBD
        return null;
    },
    deleteCoupon: function (_a) {
        var code = _a.code;
        var listingQuery = { code: code };
        return dbo.getDb()
            .collection(COUPONS_COLLECTION)
            .findOneAndDelete(listingQuery)
            .then(delete_helper);
    },
    createOrder: function (_a) {
        var input = _a.input;
        var matchDocument = OrderObject(input);
        if (!matchDocument) {
            return null;
        }
        dbo.getDb().
            collection(ORDERS_COLLECTION).
            insertOne(matchDocument);
        return matchDocument;
    },
    updateOrder: function (_a) {
        var input = _a.input;
        // TBD
        return null;
    },
    deleteOrder: function (_a) {
        var id = _a.id;
        var listingQuery = { _id: new bson_1.ObjectId(id) };
        return dbo.getDb()
            .collection(ORDERS_COLLECTION)
            .findOneAndDelete(listingQuery)
            .then(delete_helper);
    }
};
exports.resolvers = resolvers;
/////////////////////
// END OF GRAPHQL //
///////////////////
////////////////
// REST API  //
//////////////
// STORE FRONTS 
// This section will help get all the storefronts records.
recordRoutes.route('/storefront/getall').get(function (_req, res) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            dbo.getDb()
                .collection(STOREFRONT_COLLECTION)
                .find({})
                .toArray(function (err, result) {
                if (err) {
                    res.status(400).send('Error fetching storefront!');
                }
                else {
                    res.json(result);
                }
            });
            return [2 /*return*/];
        });
    });
});
// This section will help you get storefront record.
recordRoutes.route('/storefront/get/myarea').get(function (req, res) {
    if (!req.query.coverage) {
        res.status(400).send('Missing ?coverage query parameter!');
    }
    else {
        var matching = {
            $match: {
                coverage: { $all: [req.query.coverage] }
            }
        };
        dbo.getDb()
            .collection(STOREFRONT_COLLECTION)
            .aggregate([matching, coupon_look_up_code_to_fields])
            .toArray(function (err, result) {
            if (err) {
                res.status(400).send('Error fetching storefront!');
            }
            else {
                res.json(result);
            }
        });
    }
});
// This section will help you get storefront record.
recordRoutes.route('/storefront/get').get(function (req, res) {
    var listingQuery = {};
    if (req.query.name) {
        listingQuery["name"] = req.query.name;
    }
    if (req.query.address) {
        listingQuery["address"] = req.query.address;
    }
    if (req.query.image) {
        listingQuery["image"] = req.query.image;
    }
    if (req.query.coverage) {
        listingQuery["coverage"] = req.query.coverage;
    }
    if (req.query.menu) {
        listingQuery["menu"] = req.query.menu;
    }
    if (req.query.coupons) {
        listingQuery["coupons"] = req.query.coupons;
    }
    if (Object.keys(listingQuery).length === 0) {
        res.status(400).send('Query parameters were empty!');
    }
    dbo.getDb()
        .collection(STOREFRONT_COLLECTION)
        .find(listingQuery)
        .toArray(function (err, result) {
        if (err) {
            res.status(400).send('Error fetching storefront!');
        }
        else {
            res.json(result);
        }
    });
});
// This section will help you get a signle storefront record based on id
recordRoutes.route('/storefront/get/:id').get(function (req, res) {
    var listingQuery = {};
    if (req.params.id && req.params.id != "%20" && req.params.id != " ") {
        var id = new bson_1.ObjectId(req.params.id);
        listingQuery["_id"] = id;
    }
    else {
        res.status(400).send('Query id parameter was empty!');
    }
    dbo.getDb()
        .collection(STOREFRONT_COLLECTION)
        .find(listingQuery)
        .toArray(function (err, result) {
        if (err) {
            res.status(400).send('Error fetching storefront!');
        }
        else {
            res.json(result);
        }
    });
});
// This section will help you get storefront record.
recordRoutes.route('/storefront/get/:id?/:name?/:address?/:image?').get(function (req, res) {
    var listingQuery = {};
    if (req.params.id && req.params.id != "%20" && req.params.id != " ") {
        var id = new bson_1.ObjectId(req.params.id);
        listingQuery["_id"] = id;
    }
    if (req.params.name && req.params.name != "%20" && req.params.name != " ") {
        listingQuery["name"] = req.params.name;
    }
    if (req.params.address && req.params.address != "%20" && req.params.address != " ") {
        listingQuery["address"] = req.params.address;
    }
    if (req.params.image && req.params.image != "%20" && req.params.image != " ") {
        listingQuery["image"] = req.params.image;
    }
    if (Object.keys(listingQuery).length === 0) {
        res.status(400).send('Query parameters were empty!');
    }
    dbo.getDb()
        .collection(STOREFRONT_COLLECTION)
        .find(listingQuery)
        .toArray(function (err, result) {
        if (err) {
            res.status(400).send('Error fetching storefront!');
        }
        else {
            res.json(result);
        }
    });
});
// This section will help create a new storefront record.
recordRoutes.route('/storefront/new').post(function (req, res) {
    var matchDocument = StorefrontObject(req.body);
    if (!matchDocument) {
        res.status(400).send('Error fetching storefront!');
    }
    dbo.getDb()
        .collection(STOREFRONT_COLLECTION)
        .insertOne(matchDocument, function (err, result) {
        if (err) {
            res.status(400).send('Error inserting matches!');
        }
        else {
            console.log("Added a new storefront with id ".concat(result.insertedId));
            res.status(201).send();
        }
    });
});
// This section will help you update a record by id.
recordRoutes.route('/storefront/update/:id').post(function (req, res) {
    if (req.params.id) {
        res.status(400).send('Error storefront id is missing!');
    }
    var id = new bson_1.ObjectId(req.params.id);
    var listingQuery = { _id: id };
    var updates = {};
    if (req.body.name) {
        updates["name"] = req.body.name;
    }
    if (req.body.address) {
        updates["address"] = req.body.address;
    }
    if (req.body.image) {
        updates["image"] = req.body.image;
    }
    if (req.body.coverage) {
        updates["coverage"] = req.body.coverage;
    }
    if (req.body.menu) {
        updates["menu"] = req.body.menu;
    }
    if (req.body.coupons) {
        updates["coupons"] = req.body.coupons;
    }
    if (Object.keys(updates).length === 0) {
        res.status(400).send('Error updating storefront!');
    }
    dbo.getDb()
        .collection(STOREFRONT_COLLECTION)
        .updateOne(listingQuery, { $set: updates }, { upsert: true }, function (err, _result) {
        if (err) {
            res
                .status(400)
                .send("Error updating storefront with id ".concat(listingQuery._id, "!"));
        }
        else {
            console.log('1 document updated');
            res.status(204);
        }
    });
});
// This section will help you delete a storefront record.
recordRoutes.route('/storefront/delete/:id')["delete"](function (req, res) {
    if (req.params.id) {
        res.status(400).send('Error storefront id is missing!');
    }
    var id = new bson_1.ObjectId(req.params.id);
    var listingQuery = { _id: id };
    dbo.getDb()
        .collection(STOREFRONT_COLLECTION)
        .deleteOne(listingQuery, function (err, _result) {
        if (err) {
            res
                .status(400)
                .send("Error deleting storefront with id ".concat(listingQuery._id, "!"));
        }
        else {
            console.log('1 document deleted');
            res.status(204);
        }
    });
});
// COUPON
// This section will help get all the coupon records.
recordRoutes.route('/coupon/getall').get(function (_req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var dbConnect;
        return __generator(this, function (_a) {
            dbConnect = dbo.getDb();
            dbConnect
                .collection(COUPONS_COLLECTION)
                .find({})
                .toArray(function (err, result) {
                if (err) {
                    res.status(400).send('Error fetching coupon!');
                }
                else {
                    res.json(result);
                }
            });
            return [2 /*return*/];
        });
    });
});
// This section will help you get coupon record.
recordRoutes.route('/coupon/get').get(function (req, res) {
    var dbConnect = dbo.getDb();
    var listingQuery = {};
    if (req.query.code) {
        listingQuery["code"] = req.query.code;
    }
    if (req.query.value) {
        listingQuery["value"] = req.query.value;
    }
    if (req.query.image) {
        listingQuery["percentage_base"] = req.query.percentage_base;
    }
    if (Object.keys(listingQuery).length === 0) {
        res.status(400).send('Error fetching coupon!');
    }
    dbConnect
        .collection(COUPONS_COLLECTION)
        .find(listingQuery)
        .toArray(function (err, result) {
        if (err) {
            res.status(400).send('Error fetching coupon!');
        }
        else {
            res.json(result);
        }
    });
});
// This section will help you get a signle coupon record based on id
recordRoutes.route('/coupon/get/:id').get(function (req, res) {
    var listingQuery = {};
    if (req.params.id && req.params.id != "%20" && req.params.id != " ") {
        var id = new bson_1.ObjectId(req.params.id);
        listingQuery["_id"] = id;
    }
    dbo.getDb()
        .collection(COUPONS_COLLECTION)
        .find(listingQuery)
        .toArray(function (err, result) {
        if (err) {
            res.status(400).send('Error fetching coupon!');
        }
        else {
            res.json(result);
        }
    });
});
// This section will help you get coupon record.
recordRoutes.route('/coupon/get/:id?/:code?/:value?/:percentage_base?').get(function (req, res) {
    var listingQuery = {};
    if (req.params.id && req.params.id != "%20" && req.params.id != " ") {
        var id = new bson_1.ObjectId(req.params.id);
        listingQuery["_id"] = id;
    }
    if (req.params.code && req.params.code != "%20" && req.params.code != " ") {
        listingQuery["code"] = req.params.code;
    }
    if (req.params.value && req.params.value != "%20" && req.params.value != " ") {
        listingQuery["value"] = req.params.value;
    }
    if (req.params.percentage_base && req.params.percentage_base != "%20" && req.params.percentage_base != " ") {
        listingQuery["percentage_base"] = req.params.percentage_base;
    }
    if (Object.keys(listingQuery).length === 0) {
        res.status(400).send('Error fetching coupon!');
    }
    dbo.getDb()
        .collection(COUPONS_COLLECTION)
        .find(listingQuery)
        .toArray(function (err, result) {
        if (err) {
            res.status(400).send('Error fetching coupon!');
        }
        else {
            res.json(result);
        }
    });
});
// This section will help create a new coupon record.
recordRoutes.route('/coupon/new').post(function (req, res) {
    var matchDocument = CouponObject(req.body);
    if (!matchDocument) {
        res.status(400).send('Error fetching coupon!');
    }
    dbo.getDb()
        .collection(COUPONS_COLLECTION)
        .insertOne(matchDocument, function (err, result) {
        if (err) {
            res.status(400).send('Error inserting coupon!');
        }
        else {
            console.log("Added a new coupon with id ".concat(result.insertedId));
            res.status(201).send();
        }
    });
});
// This section will help you update a coupon by id.
recordRoutes.route('/coupon/update/:id').post(function (req, res) {
    if (!req.params.id) {
        res.status(400).send('Error updating coupon!');
    }
    var id = new bson_1.ObjectId(req.params.id);
    console.log(JSON.stringify(req.body));
    var listingQuery = { _id: id };
    var updates = {};
    if (req.body.code) {
        updates["code"] = req.body.code;
    }
    if (req.body.value) {
        updates["value"] = req.body.value;
    }
    if (req.body.percentage_base) {
        updates["percentage_base"] = req.body.percentage_base;
    }
    if (Object.keys(updates).length === 0) {
        res.status(400).send('Error updating coupon!');
    }
    dbo.getDb()
        .collection(COUPONS_COLLECTION)
        .updateOne(listingQuery, { $set: updates }, { upsert: true }, function (err, _result) {
        if (err) {
            res
                .status(400)
                .send("Error updating coupon with id ".concat(listingQuery._id, "!"));
        }
        else {
            console.log('1 document updated');
            res.status(204);
        }
    });
});
// This section will help you delete a coupon record.
recordRoutes.route('/coupon/delete/:id')["delete"](function (req, res) {
    var id = new bson_1.ObjectId(req.params.id);
    var listingQuery = { _id: id };
    dbo.getDb()
        .collection(COUPONS_COLLECTION)
        .deleteOne(listingQuery, function (err, _result) {
        if (err) {
            res
                .status(400)
                .send("Error deleting coupon with id ".concat(listingQuery._id, "!"));
        }
        else {
            console.log('1 document deleted');
            res.status(204);
        }
    });
});
// ORDER
// This section will help get all the orders records.
recordRoutes.route('/orders/getall').get(function (_req, res) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            dbo.getDb()
                .collection(ORDERS_COLLECTION)
                .find({})
                .toArray(function (err, result) {
                if (err) {
                    res.status(400).send('Error fetching orders!');
                }
                else {
                    res.json(result);
                }
            });
            return [2 /*return*/];
        });
    });
});
// This section will help you get order record.
recordRoutes.route('/orders/get').get(function (req, res) {
    var listingQuery = {};
    if (req.query.name) {
        listingQuery["name"] = req.query.name;
    }
    if (req.query.address) {
        listingQuery["address"] = req.query.address;
    }
    if (req.query.storefront) {
        listingQuery["storefront"] = req.query.storefront;
    }
    if (req.query.items) {
        listingQuery["items"] = req.query.items;
    }
    if (req.query.coupons) {
        listingQuery["coupons"] = req.query.coupons;
    }
    if (req.query.total) {
        listingQuery["total"] = req.query.total;
    }
    if (Object.keys(listingQuery).length === 0) {
        res.status(400).send('Error fetching orders!');
    }
    dbo.getDb()
        .collection(ORDERS_COLLECTION)
        .find(listingQuery)
        .toArray(function (err, result) {
        if (err) {
            res.status(400).send('Error fetching orders!');
        }
        else {
            res.json(result);
        }
    });
});
// This section will help you get a signle order record based on id
recordRoutes.route('/orders/get/:id').get(function (req, res) {
    var listingQuery = {};
    if (req.params.id && req.params.id != "%20" && req.params.id != " ") {
        var id = new bson_1.ObjectId(req.params.id);
        listingQuery["_id"] = id;
    }
    if (Object.keys(listingQuery).length === 0) {
        res.status(400).send('Error fetching orders!');
    }
    dbo.getDb()
        .collection(ORDERS_COLLECTION)
        .find(listingQuery)
        .toArray(function (err, result) {
        if (err) {
            res.status(400).send('Error fetching orders!');
        }
        else {
            res.json(result);
        }
    });
});
// This section will help you get order record.
recordRoutes.route('/orders/get/:id?/:name?/:address?/:storefront?/:items?/:coupons?/:total?').get(function (req, res) {
    var listingQuery = {};
    if (req.params.id && req.params.id != "%20" && req.params.id != " ") {
        var id = new bson_1.ObjectId(req.params.id);
        listingQuery["_id"] = id;
    }
    if (req.params.name && req.params.name != "%20" && req.params.name != " ") {
        listingQuery["name"] = req.params.name;
    }
    if (req.params.address && req.params.address != "%20" && req.params.address != " ") {
        listingQuery["address"] = req.params.address;
    }
    if (req.params.storefront && req.params.storefront != "%20" && req.params.storefront != " ") {
        listingQuery["storefront"] = req.params.storefront;
    }
    if (req.params.items && req.params.items != "%20" && req.params.items != " ") {
        listingQuery["items"] = req.params.items;
    }
    if (req.params.coupons && req.params.coupons != "%20" && req.params.coupons != " ") {
        listingQuery["coupons"] = req.params.coupons;
    }
    if (req.params.total && req.params.total != "%20" && req.params.total != " ") {
        listingQuery["total"] = req.params.total;
    }
    if (Object.keys(listingQuery).length === 0) {
        res.status(400).send('Error fetching orders!');
    }
    dbo.getDb()
        .collection(ORDERS_COLLECTION)
        .find(listingQuery)
        .toArray(function (err, result) {
        if (err) {
            res.status(400).send('Error fetching orders!');
        }
        else {
            res.json(result);
        }
    });
});
// This section will help create a new order record.
recordRoutes.route('/orders/new').post(function (req, res) {
    var matchDocument = OrderObject(req.body);
    if (!matchDocument) {
        res.status(400).send('Error fetching coupon!');
    }
    dbo.getDb();
    dbo.getDb()
        .collection(ORDERS_COLLECTION)
        .insertOne(matchDocument, function (err, result) {
        if (err) {
            res.status(400).send('Error inserting orders!');
        }
        else {
            console.log("Added a new order with id ".concat(result.insertedId));
            res.status(201).send();
        }
    });
});
// This section will help you update an order by id.
recordRoutes.route('/orders/update/:id').post(function (req, res) {
    var id = new bson_1.ObjectId(req.params.id);
    var listingQuery = { _id: id };
    var updates = {};
    if (req.query.name) {
        updates["name"] = req.query.name;
    }
    if (req.query.address) {
        updates["address"] = req.query.address;
    }
    if (req.query.storefront) {
        updates["storefront"] = req.query.storefront;
    }
    if (req.query.items) {
        updates["items"] = req.query.items;
    }
    if (req.query.coupons) {
        updates["coupons"] = req.query.coupons;
    }
    if (req.query.total) {
        updates["total"] = req.query.total;
    }
    if (Object.keys(updates).length === 0) {
        res.status(400).send('Error updating orders!');
    }
    dbo.getDb()
        .collection(ORDERS_COLLECTION)
        .updateOne(listingQuery, { $set: updates }, { upsert: true }, function (err, _result) {
        if (err) {
            res
                .status(400)
                .send("Error updating order with id ".concat(listingQuery._id, "!"));
        }
        else {
            console.log('1 document updated');
            res.status(204);
        }
    });
});
// This section will help you delete an order record.
recordRoutes.route('/orders/delete/:id')["delete"](function (req, res) {
    var id = new bson_1.ObjectId(req.params.id);
    var listingQuery = { _id: id };
    dbo.getDb()
        .collection(ORDERS_COLLECTION)
        .deleteOne(listingQuery, function (err, _result) {
        if (err) {
            res.status(400).send("Error deleting order with id ".concat(listingQuery._id, "!"));
        }
        else {
            console.log('1 document deleted');
            res.status(204);
        }
    });
});
