import express, { json } from "express";
import { getProductDetails, getProducts } from "./api/products.js";
import Redis  from "ioredis";
import { getCachedData, rateLimiter } from "./middleware/redis.js";
import dotenv from 'dotenv';

const app = express();
dotenv.config();

console.log(typeof(process.env.REDIS_HOST), typeof(process.env.REDIS_PORT), typeof(process.env.REDIS_PASSWORD));

export const redis = new Redis({
    host: "redis-server",
    port: 18124,
    password: "password"
})

redis.on("connect", () => {
    console.log("Redis connected");
});

    app.get('/', rateLimiter({
        windowSizeInSeconds: 60,
        maxRequests: 10,
        customKeyGenerator: (req) => `rate-limit:${req.ip}:root`
    }), async (req, res) => {
        res.send('Hello World');
    });

    app.get("/api", async (req, res) => {
        const clientIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        const key = `${clientIP}:request_count`;
        const requestCount = await redis.incr(key); 

        if(requestCount == 1) {
            redis.expire(key, 60);
        }

        const timeRemaining = await redis.ttl(key);

        if(requestCount > 10) {
            return res.status(429).send(`Too many requests, retry after ${timeRemaining} seconds.`);
        }

        res.send("Hello World from api");
    });

    app.get("/products", getCachedData("products"), async (req, res) => {

        const products = await getProducts();
        await redis.setex("products", 20, JSON.stringify(products.products));

        res.json(products);
    });

    app.get("/product/:id", getCachedData((req) => `product:${req.params.id}`), async (req, res) => {

        const productDetails = await getProductDetails(id);
        await redis.set(`product:${id}`, JSON.stringify(productDetails));

        res.json({productDetails});
    });

    app.get("/order/:id", async (req, res) => {
        const productId = req.params.id;

        // Any mutation to DB
        // Like creating new order in DB
        // Reducing the product stock in DB

        await redis.del(`product:${productId}`)

        return res.json({
            message: `Order places successfully, product id:${productId} is ordered.`
        })
    })

    app.listen(3000, () => console.log("Server has started on port 3000"));