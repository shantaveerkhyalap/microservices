const request = require("supertest");
const app = require("../server");

describe("Order Service Health Check", () => {
    it("should return 200 and service healthy status", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty("status", "healthy");
        expect(res.body).toHaveProperty("service", "Order Service");
    });
});
