const express = require("express");
const { runCompiler } = require("../pipeline/runCompiler");

const router = express.Router();

router.post("/run", (req, res) => {
  try {
    const { code = "" } = req.body || {};
    const result = runCompiler(code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
