const request = require("supertest");
const app = require("../server");

describe("API Gateway Health Check", () => {
    it("should return 200 and gateway healthy status", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty("gateway", "healthy");
    });

    it("should return 404 for unknown routes", async () => {
        const res = await request(app).get("/unknown-route");
        expect(res.statusCode).toEqual(404);
    });
});
