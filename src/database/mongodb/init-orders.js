// ShopSmart Order Processing Database Initialization
// MongoDB initialization script for order processing service

// Switch to the orders database
use shopsmart_orders;

// Create orders collection with validation schema
db.createCollection("orders", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["orderId", "userId", "items", "totalAmount", "status", "createdAt"],
         properties: {
            orderId: {
               bsonType: "string",
               description: "Unique order identifier - required"
            },
            userId: {
               bsonType: "string", 
               description: "User who placed the order - required"
            },
            items: {
               bsonType: "array",
               description: "Array of order items - required",
               items: {
                  bsonType: "object",
                  required: ["productId", "name", "price", "quantity"],
                  properties: {
                     productId: {
                        bsonType: "string",
                        description: "Product identifier"
                     },
                     name: {
                        bsonType: "string",
                        description: "Product name at time of order"
                     },
                     price: {
                        bsonType: "decimal",
                        description: "Product price at time of order"
                     },
                     quantity: {
                        bsonType: "int",
                        minimum: 1,
                        description: "Quantity ordered"
                     }
                  }
               }
            },
            totalAmount: {
               bsonType: "decimal",
               minimum: 0,
               description: "Total order amount - required"
            },
            shippingAddress: {
               bsonType: "object",
               properties: {
                  street: { bsonType: "string" },
                  city: { bsonType: "string" },
                  state: { bsonType: "string" },
                  zipCode: { bsonType: "string" },
                  country: { bsonType: "string" }
               }
            },
            status: {
               bsonType: "string",
               enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
               description: "Order status - required"
            },
            createdAt: {
               bsonType: "date",
               description: "Order creation timestamp - required"
            },
            updatedAt: {
               bsonType: "date",
               description: "Last update timestamp"
            }
         }
      }
   }
});

// Create indexes for performance
db.orders.createIndex({ "orderId": 1 }, { unique: true });
db.orders.createIndex({ "userId": 1 });
db.orders.createIndex({ "status": 1 });
db.orders.createIndex({ "createdAt": -1 });
db.orders.createIndex({ "userId": 1, "createdAt": -1 });

// Create compound index for user order history queries
db.orders.createIndex({ "userId": 1, "status": 1, "createdAt": -1 });

// Insert sample orders for testing
db.orders.insertMany([
   {
      orderId: "order_sample_001",
      userId: "user_demo_001", 
      items: [
         {
            productId: "prod_001",
            name: "iPhone 15 Pro",
            price: NumberDecimal("999.00"),
            quantity: 1
         },
         {
            productId: "prod_002", 
            name: "AirPods Pro 2nd Gen",
            price: NumberDecimal("249.00"),
            quantity: 1
         }
      ],
      totalAmount: NumberDecimal("1248.00"),
      shippingAddress: {
         street: "123 Demo Street",
         city: "San Francisco",
         state: "CA", 
         zipCode: "94105",
         country: "USA"
      },
      status: "delivered",
      createdAt: new Date("2024-01-15T10:30:00Z"),
      updatedAt: new Date("2024-01-18T14:22:00Z")
   },
   {
      orderId: "order_sample_002",
      userId: "user_demo_001",
      items: [
         {
            productId: "prod_003",
            name: "MacBook Air M3", 
            price: NumberDecimal("1299.00"),
            quantity: 1
         }
      ],
      totalAmount: NumberDecimal("1299.00"),
      shippingAddress: {
         street: "123 Demo Street",
         city: "San Francisco", 
         state: "CA",
         zipCode: "94105",
         country: "USA"
      },
      status: "processing",
      createdAt: new Date("2024-01-20T09:15:00Z"),
      updatedAt: new Date("2024-01-20T09:15:00Z")
   }
]);

// Create a view for order analytics
db.createView("order_analytics", "orders", [
   {
      $group: {
         _id: {
            status: "$status",
            month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
         },
         count: { $sum: 1 },
         totalRevenue: { $sum: "$totalAmount" },
         avgOrderValue: { $avg: "$totalAmount" }
      }
   },
   {
      $sort: { "_id.month": -1, "_id.status": 1 }
   }
]);

print("✅ MongoDB orders database initialized successfully");
print("📊 Collections created: orders");
print("🔍 Indexes created for performance optimization");
print("📝 Sample orders inserted for testing");
print("📈 Analytics view created for reporting");