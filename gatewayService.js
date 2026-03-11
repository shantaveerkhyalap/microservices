const express = require("express");
const app = express();
const proxy = require("express-http-proxy");

app.use("/stress-test", proxy('http://localhost:3002'));
app.use("/", proxy('http://localhost:3001'));

app.listen(4001, () => {
    console.log(`gateway running on http://localhost:4001`);
});