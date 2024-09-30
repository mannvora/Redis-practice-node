import { redis } from "../app.js";

export const getCachedData = (key) => async (req, res, next) => {
    let data = await redis.get(key);

    if(data) {
        return res.json({
            products: JSON.parse(data)
        })
    }

    next();
}

getCachedData();

export const rateLimiter = ({ windowSizeInSeconds = 60, maxRequests = 10, customKeyGenerator } = {}) => {
    return async (req, res, next) => {
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const key = customKeyGenerator ? customKeyGenerator(req) : `rate-limit:${clientIP}`;
        const now = Date.now();
        const windowStart = now - (windowSizeInSeconds * 1000);

        try {
            const multi = redis.multi();
            multi.zremrangebyscore(key, 0, windowStart);
            multi.zadd(key, now, now.toString());
            multi.zrange(key, 0, -1);
            multi.expire(key, windowSizeInSeconds);
        
            const results = await multi.exec();
            const requests = results[2][1];

            if (requests.length > maxRequests) {
                const retryAfter = Math.ceil((windowStart + (windowSizeInSeconds * 1000) - now) / 1000);
                res.set('Retry-After', retryAfter);
                return res.status(429).json({
                    error: 'Too Many Requests',
                    retryAfter: `${retryAfter} seconds`
                });
            }

        next();
        } catch (error) {
            console.error('Rate limiting error:', error);
            next();
        }
    };
};