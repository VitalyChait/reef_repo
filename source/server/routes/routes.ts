import express = require('express');
import { ObjectId } from 'bson';
var { buildSchema } = require('graphql');


// scema is our graphql schema instance
// resolvers is our graphql resolver
// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control all of the requests that are not in path: /graphql.
const recordRoutes = express.Router();

// This will help us connect to the database
const dbo = require('../db/conn');

// These are our enivorment settigns, the db.collections name (sub db tables)
const STOREFRONT_COLLECTION = process.env.SROTEFRONT_COLL || 'storefrontCollection';
const COUPONS_COLLECTION = process.env.COUPONS_COLL || 'couponsCollection';
const ORDERS_COLLECTION = process.env.ORDERS_COLL || 'ordersCollection';

// Object definitions, used for creating new objects
// Inside there should be also the fields Dtype validation
// Returns null for failures
var StorefrontObject = function(request){
  // Constructor
  var name: string, address: string, image: string, coupons: string[], menu: object[], coverage: string[]
  if ( request.name && request.address ){
    name = request.name;
    address = request.address;
  }
  else{
    return null;
  }
  if ( request.image ){
    image = request.image;
  }
  else{
    image = "0";
  }
  if ( request.coupons ){
    coupons = request.coupons;
  }
  else {
    coupons = [];
  }
  if ( request.menu ){
    menu = request.menu;
  }
  else {
    menu = [];
  }
  if ( request.coverage ){
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

var OrderObject = function(request){
  // Constructor

  var name: string, address: string, storefront: object, items: object[], coupons: string[], total: number;
  if ( request.name && request.address && request.storefront){
    name = request.name;
    address = request.address;
    storefront = request.storefront;
  }
  else{
    return null;
  }
  if ( request.items ){
    items = request.items;
  }
  else {
    items = [];
  }
  if ( request.coupons ){
    coupons = request.coupons;
  }
  else {
    coupons = [];
  }
  if ( request.total ){
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


var CouponObject = function(request){
  // Constructor
  var code: String, value: number, percentage_base: Boolean;
  if ( request.code){
    code = request.code;
  }
  else{
    return null;
  }
  if ( request.value ){
    value = request.value;
  }
  else {
    value = 0;
  }
  if ( request.percentage_base ){
    percentage_base = request.percentage_base;
  }
  else {
    percentage_base = false;
  }
  
  return {
    code: code,
    value: value,
    percentage_base: percentage_base,
  };
};




// helper query variable for projection
const id_projection = { $project: { _id: 1 } }; 
const unwind_id ={ $unwind: "$_id" };
const unwind_items ={ $unwind: "$items" };
const unwind_store ={ $unwind: "$storefront" };
const unwind_menu ={ $unwind: "$menu" };
// Below are our helper for the SQL actions (manly aggregates)
const line_item_projection = {
  $project: {
    _id: 0,
    menu: 1
  }
}; 
const coupon_look_up_code_to_fields = {
  $lookup: {
    from: COUPONS_COLLECTION,
    localField: "coupons",
    foreignField: "code",
    as: "coupons"
  }
};
const storefront_look_up_name_to_fields = {
  $lookup: {
    from: STOREFRONT_COLLECTION,
    localField: "storefront",
    foreignField: "name",
    as: "storefront"
  }
};
const project_storefront_to_basic_fields_v1 = {
    "$project": {
      "storefront.coverage": 0,
      "storefront.menu": 0,
      "storefront.coupons": 0
    }
};
const project_storefront_to_basic_fields_v2 = {
  "$project": {
    "coverage": 0,
    "menu": 0,
    "coupons": 0
  }
};

// V1 calculates order sum by their saved value
const order_sum_aggerate_v1 =
{
    $group: {
      _id: null,
      sum: {
        $sum: "$total"
      }
    }
};
// V2 calculates order sum per item - currently not in use
const order_sum_aggerate_v2 =
{
    $group: {
      _id: null,
      sum: {
        $sum: "$items.value"
      }
    }
};
// Helper functions for our db requests 
function order_sum_get_sum(data){
  try {
    data[0]["sum"]
  }
  catch(err) {
    return null;
  }
  return data[0]["sum"];
};

// Helper function to graphQL to return the 
function delete_helper(data){
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
var schema = buildSchema(`
  type Coupon {
    code: String
    value: Float
    percentage_base: Boolean
  }

  type Lineitem {
    name: String
    value: Float
  }

  type Storefront_basic {
    name: String
    address: String
    image: String
  }

  type Storefront {
    name: String
    address: String
    image: String
    coverage: [String]
    menu: [Lineitem]
    coupons: [Coupon]
  }

  type Order_basic{
    _id: ID
    name: String
    address: String
  }

  type Order {
    _id: ID
    name: String
    address: String
    storefront: Storefront_basic
    items: [Lineitem]
    coupons: [Coupon]
    total: Float
  }


  input Lineitem_input {
    name: String!
    value: Float!
  }

  input new_Storefront_input {
    name: String!
    address: String!
    image: String
    coverage: [String]
    menu: [Lineitem_input]
    coupons: [String]
  }

  input update_Storefront_input {
    name: String!
    address: String
    image: String
    coverage: [String]
    menu: [Lineitem_input]
    coupons: [String]
  }

  input new_Coupon_input {
    code: String!
    value: Float!
    percentage_base: Boolean!
  }

  input update_Coupon_input {
    code: String!
    value: Float
    percentage_base: Boolean
  }


  input new_Order_input {
    name: String!
    address: String!
    storefront: String!
    items: [Lineitem_input!]
    coupons: [new_Coupon_input]
    total: Float!
  }

  input update_Order_input {
    name: String!
    address: String
    storefront: String
    items: [Lineitem_input]
    coupons: [new_Coupon_input]
    total: Float
  }


  type Query {
    get_all_storefronts: [Storefront]
    get_all_storefront_in_my_area (area: String!): [Storefront_basic]
    get_menu (storeName: String!): [Lineitem]
    calculate_order_totals (customer_name: String, store_name: String): Float

    getStorefront (name: String!): [Storefront]
    getCoupon (code: String!): [Coupon]
    getOrder (id: String!): [Order]
  }

  type Mutation {
    createStorefront(input: new_Storefront_input): Storefront
    updateStorefront(input: update_Storefront_input): Storefront
    deleteStorefront(name: String!): Storefront_basic

    createCoupon(input: new_Coupon_input): Coupon
    updateCoupon(input: update_Coupon_input): Coupon
    deleteCoupon(code: String!): Coupon

    createOrder(input: new_Order_input): Order
    updateOrder(input: update_Order_input): Order
    deleteOrder(id: String!): Order_basic
  }
`);

// Provide resolver functions for your schema fields
const resolvers = {
    // Will return all storefront, including detailed information (coupons, lineitems, etc..)
    get_all_storefronts: () => { 
      return dbo.getDb()
      .collection(STOREFRONT_COLLECTION)
      .aggregate([coupon_look_up_code_to_fields])
      .toArray();
    },
    // Will return all storefront in a specific area, limited information version
    get_all_storefront_in_my_area: ({area}) => { 
      const matching = {
        $match : {
          coverage: { $all: [area] }
        }
      }
      return dbo.getDb()
      .collection(STOREFRONT_COLLECTION)
      .aggregate([matching, coupon_look_up_code_to_fields, project_storefront_to_basic_fields_v2])
      .toArray(); 
    },
    // Will return all menu items for a specific store name
    get_menu: ({storeName}) => {
      const matching = {
        $match : {
          name: storeName
        }
      };
      return dbo.getDb()
      .collection(STOREFRONT_COLLECTION)
      .aggregate([matching, line_item_projection, unwind_menu])
      .toArray()
    },
    // Will sum of all orders, by customer name and/or by store name. See comments below. 
    calculate_order_totals: ({customer_name, store_name}) => { 
      var listingQuery = {};
      if (customer_name){ 
        listingQuery["name"] = customer_name;
      }
      if (store_name){ 
        listingQuery["storefront"] = store_name; 
      }
      const matching = {
        $match : listingQuery
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
    getStorefront: ({name}) => {
      const matching = {
        $match : {
          name: name
        }
      };
      return dbo.getDb()
      .collection(STOREFRONT_COLLECTION)
      .aggregate([matching, coupon_look_up_code_to_fields])
      .toArray();
    },
    // Get coupon by code (assuming it is unique)
    getCoupon: ({code}) => {
      const matching = {
        $match : {
          code: code
        }
      };
      return dbo.getDb()
            .collection(COUPONS_COLLECTION)
            .aggregate([matching])
            .toArray();
    },
    // Get order by id (assuming it is unique)
    getOrder: ({id}) => {
      const matching = {
        $match : {
          _id: new ObjectId(id)
        }
      };
      return dbo.getDb()
            .collection(ORDERS_COLLECTION)
            .aggregate([matching, storefront_look_up_name_to_fields, project_storefront_to_basic_fields_v1, unwind_store])
            .toArray();
    },

  // Mutation: (Create, Update, Delete)
    createStorefront: ({input}) => {
      const matchDocument = StorefrontObject(input);
      if (!matchDocument){
        return null;
      }
      dbo.getDb().
      collection(STOREFRONT_COLLECTION).
      insertOne(matchDocument);
      return matchDocument;
    },

    updateStorefront: ({input}) => { 
      // TBD
      return null;
    },


    deleteStorefront: ({name}) => {
      const listingQuery = { name: name};
      return dbo.getDb()
      .collection(STOREFRONT_COLLECTION)
      .findOneAndDelete(listingQuery)
      .then(delete_helper);
    },


    createCoupon: ({input}) => {
      const matchDocument = CouponObject(input);
      if (!matchDocument){
        return null;
      }
      dbo.getDb().
      collection(COUPONS_COLLECTION).
      insertOne(matchDocument);
      return matchDocument;
    },
    updateCoupon: ({input}) => {
      // TBD
      return null;
    },

    deleteCoupon: ({code}) => {
      const listingQuery = { code: code};
      return dbo.getDb()
      .collection(COUPONS_COLLECTION)
      .findOneAndDelete(listingQuery)
      .then(delete_helper);
   },


    createOrder: ({input}) => {
      const matchDocument = OrderObject(input);
      if (!matchDocument){
        return null;
      }
      dbo.getDb().
      collection(ORDERS_COLLECTION).
      insertOne(matchDocument);
      return matchDocument;
    },
    updateOrder: ({input}) => {
      // TBD
      return null;
    },

    deleteOrder: ({id}) => {
      const listingQuery = { _id: new ObjectId(id) };
      return dbo.getDb()
      .collection(ORDERS_COLLECTION)
      .findOneAndDelete(listingQuery)
      .then(delete_helper);
    }
};


/////////////////////
// END OF GRAPHQL //
///////////////////


////////////////
// REST API  //
//////////////

// STORE FRONTS 
// This section will help get all the storefronts records.
recordRoutes.route('/storefront/getall').get(async function (_req, res) {
  dbo.getDb()
    .collection(STOREFRONT_COLLECTION)
    .find({})
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching storefront!');
      } else {
        res.json(result);
      }
    });
});


// This section will help you get storefront record.
recordRoutes.route('/storefront/get/myarea').get((req, res) => {
  if (!req.query.coverage){
    res.status(400).send('Missing ?coverage query parameter!');
  }
  else {
  const matching = {
    $match : {
      coverage: { $all: [req.query.coverage] }
    }
  }
  dbo.getDb()
  .collection(STOREFRONT_COLLECTION)
  .aggregate([matching, coupon_look_up_code_to_fields])
  .toArray(function (err, result) {
    if (err) {
      res.status(400).send('Error fetching storefront!');
    } else {
      res.json(result);
    }
  });
  }
});


// This section will help you get storefront record.
recordRoutes.route('/storefront/get').get((req, res) => {
  var listingQuery = {};
  if (req.query.name){
    listingQuery["name"] = req.query.name;
  }
  if (req.query.address){
    listingQuery["address"] = req.query.address;
  }
  if (req.query.image){
    listingQuery["image"] = req.query.image;
  }
  if (req.query.coverage){
    listingQuery["coverage"] = req.query.coverage;
  }
  if (req.query.menu){
    listingQuery["menu"] = req.query.menu;
  }
  if (req.query.coupons){
    listingQuery["coupons"] = req.query.coupons;
  }

  if ( Object.keys(listingQuery).length === 0){
    res.status(400).send('Query parameters were empty!');
  }
  dbo.getDb()
    .collection(STOREFRONT_COLLECTION)
    .find(listingQuery)
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching storefront!');
      } else {
        res.json(result);
      }
    });
});


// This section will help you get a signle storefront record based on id
recordRoutes.route('/storefront/get/:id').get((req, res) => {
  var listingQuery = {};
  if (req.params.id && req.params.id != "%20" && req.params.id != " " ){
    const id = new ObjectId(req.params.id);
    listingQuery["_id"] = id;
  }
  else{
    res.status(400).send('Query id parameter was empty!');
  }
  dbo.getDb()
    .collection(STOREFRONT_COLLECTION)
    .find(listingQuery)
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching storefront!');
      } else {
        res.json(result);
      }
    });
});


// This section will help you get storefront record.
recordRoutes.route('/storefront/get/:id?/:name?/:address?/:image?').get((req, res) => {
  var listingQuery = {};
  if (req.params.id && req.params.id != "%20" && req.params.id != " " ){
    const id = new ObjectId(req.params.id);
    listingQuery["_id"] = id;
  }
  if (req.params.name && req.params.name != "%20" && req.params.name != " " ){
    listingQuery["name"] = req.params.name;
  }
  if (req.params.address && req.params.address != "%20" && req.params.address != " " ){
    listingQuery["address"] = req.params.address;
  }
  if (req.params.image && req.params.image != "%20" && req.params.image != " " ){
    listingQuery["image"] = req.params.image;
  }
  if ( Object.keys(listingQuery).length === 0){
    res.status(400).send('Query parameters were empty!');
  }
  dbo.getDb()
   .collection(STOREFRONT_COLLECTION)
    .find(listingQuery)
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching storefront!');
      } else {
        res.json(result);
      }
    });
});


// This section will help create a new storefront record.
recordRoutes.route('/storefront/new').post(function (req, res) {
  const matchDocument = StorefrontObject(req.body);
  if (!matchDocument){
    res.status(400).send('Error fetching storefront!');
  }
  dbo.getDb()
    .collection(STOREFRONT_COLLECTION)
    .insertOne(matchDocument, function (err, result) {
      if (err) {
        res.status(400).send('Error inserting matches!');
      } else {
        console.log(`Added a new storefront with id ${result.insertedId}`);
        res.status(201).send();
      }
    });
});


// This section will help you update a record by id.
recordRoutes.route('/storefront/update/:id').post(function (req, res) {
    if (req.params.id){
      res.status(400).send('Error storefront id is missing!');
    }
    const id = new ObjectId(req.params.id);
    const listingQuery = { _id: id };
    var updates = {};

    if (req.body.name){
      updates["name"] = req.body.name
    }
    if (req.body.address){
      updates["address"] = req.body.address
    }
    if (req.body.image){
      updates["image"] = req.body.image
    }
    if (req.body.coverage){
      updates["coverage"] = req.body.coverage
    }
    if (req.body.menu){
      updates["menu"] = req.body.menu
    }
    if (req.body.coupons){
      updates["coupons"] = req.body.coupons
    }

    if ( Object.keys(updates).length === 0){
      res.status(400).send('Error updating storefront!');
    }
    dbo.getDb()
      .collection(STOREFRONT_COLLECTION)
      .updateOne(listingQuery, { $set: updates }, { upsert: true }, function (err, _result) {
        if (err) {
          res
            .status(400)
            .send(`Error updating storefront with id ${listingQuery._id}!`);
        } else {
          console.log('1 document updated');
          res.status(204);
        }
      });
  });


// This section will help you delete a storefront record.
recordRoutes.route('/storefront/delete/:id').delete((req, res) => {
  if (req.params.id){
    res.status(400).send('Error storefront id is missing!');
  }
    const id = new ObjectId(req.params.id);
    const listingQuery = { _id: id };
  
    dbo.getDb()
     .collection(STOREFRONT_COLLECTION)
      .deleteOne(listingQuery, function (err, _result) {
        if (err) {
          res
            .status(400)
            .send(`Error deleting storefront with id ${listingQuery._id}!`);
        } else {
          console.log('1 document deleted');
          res.status(204);
        }
      });
  });


// COUPON
// This section will help get all the coupon records.
recordRoutes.route('/coupon/getall').get(async function (_req, res) {
  const dbConnect = dbo.getDb();
  dbConnect
   .collection(COUPONS_COLLECTION)
    .find({})
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching coupon!');
      } else {
        res.json(result);
      }
    });
});


// This section will help you get coupon record.
recordRoutes.route('/coupon/get').get((req, res) => {
  const dbConnect = dbo.getDb();
  var listingQuery = {};
  if (req.query.code){
    listingQuery["code"] = req.query.code;
  }
  if (req.query.value){
    listingQuery["value"] = req.query.value;
  }
  if (req.query.image){
    listingQuery["percentage_base"] = req.query.percentage_base;
  }
  if ( Object.keys(listingQuery).length === 0){
    res.status(400).send('Error fetching coupon!');
  }
  dbConnect
    .collection(COUPONS_COLLECTION)
    .find(listingQuery)
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching coupon!');
      } else {
        res.json(result);
      }
    });
});


// This section will help you get a signle coupon record based on id
recordRoutes.route('/coupon/get/:id').get((req, res) => {
  var listingQuery = {};
  if (req.params.id && req.params.id != "%20" && req.params.id != " " ){
    const id = new ObjectId(req.params.id);
    listingQuery["_id"] = id;
  }
  dbo.getDb()
    .collection(COUPONS_COLLECTION)
    .find(listingQuery)
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching coupon!');
      } else {
        res.json(result);
      }
    });
});


// This section will help you get coupon record.
recordRoutes.route('/coupon/get/:id?/:code?/:value?/:percentage_base?').get((req, res) => {
  var listingQuery = {};
  if (req.params.id && req.params.id != "%20" && req.params.id != " " ){
    const id = new ObjectId(req.params.id);
    listingQuery["_id"] = id;
  }
  if (req.params.code && req.params.code != "%20" && req.params.code != " " ){
    listingQuery["code"] = req.params.code;
  }
  if (req.params.value && req.params.value != "%20" && req.params.value != " " ){
    listingQuery["value"] = req.params.value;
  }
  if (req.params.percentage_base && req.params.percentage_base != "%20" && req.params.percentage_base != " " ){
    listingQuery["percentage_base"] = req.params.percentage_base;
  }
  if ( Object.keys(listingQuery).length === 0){
    res.status(400).send('Error fetching coupon!');
  }
  dbo.getDb()
    .collection(COUPONS_COLLECTION)
    .find(listingQuery)
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching coupon!');
      } else {
        res.json(result);
      }
    });
});


// This section will help create a new coupon record.
recordRoutes.route('/coupon/new').post(function (req, res) {
  const matchDocument = CouponObject(req.body);
  if (!matchDocument){
    res.status(400).send('Error fetching coupon!');
  }
  dbo.getDb()
    .collection(COUPONS_COLLECTION)
    .insertOne(matchDocument, function (err, result) {
      if (err) {
        res.status(400).send('Error inserting coupon!');
      } else {
        console.log(`Added a new coupon with id ${result.insertedId}`);
        res.status(201).send();
      }
    });
});


// This section will help you update a coupon by id.
recordRoutes.route('/coupon/update/:id').post(function (req, res) {
    if (!req.params.id){
      res.status(400).send('Error updating coupon!');
    }
    const id = new ObjectId(req.params.id);
    console.log(JSON.stringify(req.body));

    const listingQuery = { _id: id };
    var updates = {};
    if (req.body.code){
      updates["code"] = req.body.code;
    }
    if (req.body.value){
      updates["value"] = req.body.value;
    }
    if (req.body.percentage_base){
      updates["percentage_base"] = req.body.percentage_base;
    }
    if ( Object.keys(updates).length === 0){
      res.status(400).send('Error updating coupon!');
    }
    dbo.getDb()
      .collection(COUPONS_COLLECTION)
      .updateOne(listingQuery, { $set: updates }, { upsert: true }, function (err, _result) {
        if (err) {
          res
            .status(400)
            .send(`Error updating coupon with id ${listingQuery._id}!`);
        } else {
          console.log('1 document updated');
          res.status(204);
        }
      });
  });


// This section will help you delete a coupon record.
recordRoutes.route('/coupon/delete/:id').delete((req, res) => {
    const id = new ObjectId(req.params.id);
    const listingQuery = { _id: id };
  
    dbo.getDb()
      .collection(COUPONS_COLLECTION)
      .deleteOne(listingQuery, function (err, _result) {
        if (err) {
          res
            .status(400)
            .send(`Error deleting coupon with id ${listingQuery._id}!`);
        } else {
          console.log('1 document deleted');
          res.status(204);
        }
      });
  });


// ORDER
// This section will help get all the orders records.
recordRoutes.route('/orders/getall').get(async function (_req, res) {
  dbo.getDb()
    .collection(ORDERS_COLLECTION)
    .find({})
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching orders!');
      } else {
        res.json(result);
      }
    });
});


// This section will help you get order record.
recordRoutes.route('/orders/get').get((req, res) => {
  var listingQuery = {};
  if (req.query.name){
    listingQuery["name"] = req.query.name;
  }
  if (req.query.address){
    listingQuery["address"] = req.query.address;
  }
  if (req.query.storefront){
    listingQuery["storefront"] = req.query.storefront;
  }
  if (req.query.items){
    listingQuery["items"] = req.query.items;
  }
  if (req.query.coupons){
    listingQuery["coupons"] = req.query.coupons;
  }
  if (req.query.total){
    listingQuery["total"] = req.query.total;
  }
  if ( Object.keys(listingQuery).length === 0){
    res.status(400).send('Error fetching orders!');
  }
  dbo.getDb()
    .collection(ORDERS_COLLECTION)
    .find(listingQuery)
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching orders!');
      } else {
        res.json(result);
      }
    });
});

// This section will help you get a signle order record based on id
recordRoutes.route('/orders/get/:id').get((req, res) => {
  var listingQuery = {};
  if (req.params.id && req.params.id != "%20" && req.params.id != " " ){
    const id = new ObjectId(req.params.id);
    listingQuery["_id"] = id;
  }
  if ( Object.keys(listingQuery).length === 0){
    res.status(400).send('Error fetching orders!');
  }
  dbo.getDb()
    .collection(ORDERS_COLLECTION)
    .find(listingQuery)
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching orders!');
      } else {
        res.json(result);
      }
    });
});


// This section will help you get order record.
recordRoutes.route('/orders/get/:id?/:name?/:address?/:storefront?/:items?/:coupons?/:total?').get((req, res) => {
  var listingQuery = {};
  if (req.params.id && req.params.id != "%20" && req.params.id != " " ){
    const id = new ObjectId(req.params.id);
    listingQuery["_id"] = id;
  }
  if (req.params.name && req.params.name != "%20" && req.params.name != " " ){
    listingQuery["name"] = req.params.name;
  }
  if (req.params.address && req.params.address != "%20" && req.params.address != " " ){
    listingQuery["address"] = req.params.address;
  }
  if (req.params.storefront && req.params.storefront != "%20" && req.params.storefront != " " ){
    listingQuery["storefront"] = req.params.storefront;
  }
  if (req.params.items && req.params.items != "%20" && req.params.items != " " ){
    listingQuery["items"] = req.params.items;
  }
  if (req.params.coupons && req.params.coupons != "%20" && req.params.coupons != " " ){
    listingQuery["coupons"] = req.params.coupons;
  }
  if (req.params.total && req.params.total != "%20" && req.params.total != " " ){
    listingQuery["total"] = req.params.total;
  }
  if ( Object.keys(listingQuery).length === 0){
    res.status(400).send('Error fetching orders!');
  }
  dbo.getDb()
    .collection(ORDERS_COLLECTION)
    .find(listingQuery)
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching orders!');
      } else {
        res.json(result);
      }
    });
});


// This section will help create a new order record.
recordRoutes.route('/orders/new').post(function (req, res) {
  const matchDocument = OrderObject(req.body);
  if (!matchDocument){
    res.status(400).send('Error fetching coupon!');
  }
  dbo.getDb()

  dbo.getDb()
    .collection(ORDERS_COLLECTION)
    .insertOne(matchDocument, function (err, result) {
      if (err) {
        res.status(400).send('Error inserting orders!');
      } else {
        console.log(`Added a new order with id ${result.insertedId}`);
        res.status(201).send();
      }
    });
});


// This section will help you update an order by id.
recordRoutes.route('/orders/update/:id').post(function (req, res) {
    const id = new ObjectId(req.params.id);
    const listingQuery = { _id: id };
    var updates = {};

    if (req.query.name){
      updates["name"] = req.query.name;
    }
    if (req.query.address){
      updates["address"] = req.query.address;
    }
    if (req.query.storefront){
      updates["storefront"] = req.query.storefront;
    }
    if (req.query.items){
      updates["items"] = req.query.items;
    }
    if (req.query.coupons){
      updates["coupons"] = req.query.coupons;
    }
    if (req.query.total){
      updates["total"] = req.query.total;
    }
    if ( Object.keys(updates).length === 0){
      res.status(400).send('Error updating orders!');
    }

    dbo.getDb()
      .collection(ORDERS_COLLECTION)
      .updateOne(listingQuery, { $set: updates }, { upsert: true }, function (err, _result) {
        if (err) {
          res
            .status(400)
            .send(`Error updating order with id ${listingQuery._id}!`);
        } else {
          console.log('1 document updated');
          res.status(204);
        }
      });
  });


// This section will help you delete an order record.
recordRoutes.route('/orders/delete/:id').delete((req, res) => {
    const id = new ObjectId(req.params.id);
    const listingQuery = { _id: id };
    dbo.getDb()
      .collection(ORDERS_COLLECTION)
      .deleteOne(listingQuery, function (err, _result) {
        if (err) {
          res.status(400).send(`Error deleting order with id ${listingQuery._id}!`);
        } else {
          console.log('1 document deleted');
          res.status(204);
        }
      });
  });


export {recordRoutes, schema, resolvers};