const express = require("express");
const morgan = require("morgan");

const app = express();
app.use(morgan("dev"));

app.get("/", (req, res) => {
    for (let i = 0; i < 10000000000; i++) {
        // simulate work, reduce number to avoid blocking too long
    }
    res.send("hello world");
});

app.listen(4002, () => {
    console.log(`server is running on http://localhost:4002`);
});
