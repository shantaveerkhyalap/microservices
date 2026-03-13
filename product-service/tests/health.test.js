// Mock all heavy dependencies BEFORE requiring server
jest.mock("../shared/rabbitmq", () => ({
    connectRabbitMQ: jest.fn().mockResolvedValue(),
    setupExchange: jest.fn().mockResolvedValue(),
    setupQueue: jest.fn().mockResolvedValue(),
    subscribeToQueue: jest.fn().mockResolvedValue(),
    publishToExchange: jest.fn().mockResolvedValue(),
    closeRabbitMQ: jest.fn().mockResolvedValue(),
}));

jest.mock("../shared/db", () => ({
    connectDB: jest.fn().mockResolvedValue(),
}));

const request = require("supertest");
const app = require("../server");

describe("Product Service Health Check", () => {
    it("GET /health → 200 with healthy status", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("status", "healthy");
        expect(res.body).toHaveProperty("service", "Product Service");
    });
});
