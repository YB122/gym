const path = require("node:path");

require("dotenv").config({
  path: [path.resolve(__dirname, ".env"), path.resolve(__dirname, "..", ".env")],
  quiet: true,
});

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/gym?replicaSet=rs0";

if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
  throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");
}

module.exports = {
  mongodb: {
    url: uri,
    options: {},
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".cjs",
  useFileHash: false,
  moduleSystem: "commonjs",
};
