// MongoDB initialization script for Order Processing Service
// This script sets up the database, collections, and indexes

// Switch to the orders database
db = db.getSiblingDB('orders');

// Create the orders collection
db.createCollection('orders');

// Create indexes for optimal performance
db.orders.createIndex({ "orderId": 1 }, { unique: true });
db.orders.createIndex({ "userId": 1 });
db.orders.createIndex({ "createdAt": 1 });
db.orders.createIndex({ "status": 1 });
db.orders.createIndex({ "userId": 1, "createdAt": -1 });

// Insert sample data for testing (optional)
db.orders.insertMany([
  {
    "orderId": "sample-order-1",
    "userId": "sample-user-1",
    "items": [
      {
        "productId": "product-1",
        "name": "Sample Product 1",
        "price": 29.99,
        "quantity": 2
      }
    ],
    "totalAmount": 59.98,
    "shippingAddress": {
      "street": "123 Sample St",
      "city": "Sample City",
      "state": "CA",
      "zipCode": "12345",
      "country": "US"
    },
    "status": "pending",
    "createdAt": new Date(),
    "updatedAt": new Date()
  }
]);

print("Orders database initialized successfully!");
print("Collections created: orders");
print("Indexes created: orderId (unique), userId, createdAt, status, userId+createdAt");
print("Sample data inserted: 1 order");