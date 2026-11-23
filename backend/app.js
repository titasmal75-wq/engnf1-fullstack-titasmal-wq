
require("dotenv").config();

const express = require("express");
const mongooseDB = require("./config/mongodbConnection");


const app = express();


app.use(express.json());

mongooseDB();
app.get("/", (req, res) => {
    res.send("Express + MongoDB Connected!");
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}/`);
});