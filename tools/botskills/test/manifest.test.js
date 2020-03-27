const { strictEqual } = require("assert");
const { getNormalizedFile } = require("./helpers/normalizeUtils");
const { ManifestUtils } = require("../lib/utils");
const { join, resolve } = require("path");
const sandbox = require("sinon").createSandbox();
const testLogger = require("./helpers/testLogger");


const manifestUtil = new ManifestUtils();
const genericManifest = getNormalizedFile(resolve(__dirname, join("mocks", "manifests", "genericManifest.json")));
const manifestV1 = getNormalizedFile(resolve(__dirname, join("mocks", "manifests", "v1", "manifest.json")));
const manifestV2 = getNormalizedFile(resolve(__dirname, join("mocks", "manifests", "v2", "manifest.json")));

describe("The Manifest Util", function () {
    beforeEach(function() {
        this.logger = new testLogger.TestLogger();
    });

    describe("should be able to read", function () {
        it("a local manifest with absolute path", async function () {
            const configuration = {
                localManifest: resolve(__dirname, join("mocks", "manifests", "v2", "manifest.json")),
                remoteManifest: "",
                logger: this.logger
            };

            const rawResource = await manifestUtil.getRawManifestFromResource(configuration);

            strictEqual(manifestV2, rawResource);
        });

        it("a local manifest with relative path", async function () {
            const configuration = {
                localManifest: join("test", "mocks", "manifests", "v2", "manifest.json"),
                remoteManifest: "",
                logger: this.logger
            };

            const rawResource = await manifestUtil.getRawManifestFromResource(configuration);

            strictEqual(manifestV2, rawResource);
        });

        it("a remote manifest", async function () {
            sandbox.replace(manifestUtil, "getRemoteManifest", (command, args) => {
                return Promise.resolve(manifestV2);
            });
            
            const configuration = {
                localManifest: "",
                remoteManifest: resolve(__dirname, join("mocks", "manifests", "v2", "manifest.json")),
                logger: this.logger
            };

            const rawResource = await manifestUtil.getRawManifestFromResource(configuration);

            strictEqual(manifestV2, rawResource);
        });
    });

    describe("should be able to parse", function () {
        it("a manifest v1", async function () {
            const parsedManifest = await manifestUtil.getManifest(manifestV1, this.logger);
            let manifest = JSON.parse(genericManifest);
            manifest.schema = "";
            manifest.version = "";
            manifest.entries = undefined;
            manifest.luisDictionary = new Map(JSON.parse(manifest.luisDictionary));
  
            strictEqual(JSON.stringify(manifest), JSON.stringify(parsedManifest));
        });

        it("a manifest v2", async function () {
            const parsedManifest = await manifestUtil.getManifest(manifestV2, this.logger);
            let manifest = JSON.parse(genericManifest);
            manifest.luisDictionary = new Map(JSON.parse(manifest.luisDictionary));
  
            strictEqual(JSON.stringify(manifest), JSON.stringify(parsedManifest));
        });
    });
});