const express = require("express");
const path = require("path");
const runRoute = require("./routes/runRoute");

const app = express();
const frontendPath = path.join(__dirname, "../../frontend");

app.use(express.json());
app.use(express.static(frontendPath));
app.use("/", runRoute);

app.get("/", (_req, res) => {
	res.sendFile(path.join(frontendPath, "index.html"));
});

module.exports = app;
