process.env.TS_NODE_PROJECT = "tsconfig.test.json";
process.env.TS_NODE_TRANSPILE_ONLY = "true";

require("ts-node/register");
require("tsconfig-paths/register");
