// Mock all heavy dependencies BEFORE requiring server
jest.mock("../shared/rabbitmq", () => ({
    connectRabbitMQ: jest.fn().mockResolvedValue(),
    setupExchange: jest.fn().mockResolvedValue(),
    closeRabbitMQ: jest.fn().mockResolvedValue(),
}));

jest.mock("../shared/db", () => ({
    connectDB: jest.fn().mockResolvedValue(),
}));

jest.mock("../shared/auth", () => ({
    verifyToken: jest.fn(),
    generateToken: jest.fn(),
}));

const request = require("supertest");
const app = require("../server");

describe("API Gateway Health Check", () => {
    it("GET /health → 200 with healthy status", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("gateway", "healthy");
    });

    it("GET /unknown-route → 404", async () => {
        const res = await request(app).get("/unknown-route-xyz");
        expect(res.statusCode).toBe(404);
    });
});
