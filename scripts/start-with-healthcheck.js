#!/usr/bin/env node
// Short: just run scheduler (health-check is inside scheduler.js)
const { spawnSync } = require("child_process");

spawnSync("node", ["scheduler.js"], { stdio: "inherit" });
