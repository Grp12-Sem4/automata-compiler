const express = require("express");
const { runCompiler } = require("../pipeline/runCompiler");

const router = express.Router();

router.post("/run", (req, res) => {
	try {
		const { code = "" } = req.body || {};
		const result = runCompiler(code);
		console.log(result);
		console.log("\n\n");
		for (let i = 0; i < 5; i++) {
			console.log(result.ast.body[i]);
		}
		console.log("\n\n");
		res.json(result);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
});

router.get("/test", (req, res) => {
	res.send("this is home page");
});

module.exports = router;
