/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

const { strictEqual } = require("assert");
const { join } = require("path");
const i18next = require("i18next").default;
const { SomeComplexType } = require(join(__dirname, "helpers", "someComplexType"));
//const { ListExtensions } = require(join("..", "lib", "extensions", "listEx"));
const { LocaleTemplateEngineManager } = require(join("..", "lib", "responses", "localeTemplateEngineManager"));

const localeTemplateEngineManager;

describe("language generation", function() {
    before(async function() {
        const localeLgFiles = [];
        localeLgFiles.push({
            key: "en-us",
            value: [join(".", "Response", "TestResponses.lg")]
        });
        localeLgFiles.push({
            key: "es-es",
            value: [join(".", "Response", "TestResponses.es.lg")]
        });

        i18next.use(i18nextNodeFsBackend)
        .init({
            fallbackLng: "en",
            preload: [ "de", "en", "es", "fr", "it", "zh" ],
            backend: {
                loadPath: join(__dirname, "locales", "{{lng}}.json")
            }
        })
        .then(async () => {
            await Locales.addResourcesFromPath(i18next, "common");
        });

        localeTemplateEngineManager = new LocaleTemplateEngineManager(localeLgFiles, "en-us");
    });
    
    describe("get response with language generation english", function() {
        i18next.changeLanguage("en");

        // Generate English response using LG with data
        let data = { name: "Darren" };
        let response = localeTemplateEngineManager.generateActivityForLocale("HaveNameMessage", data);

        // Retrieve possible responses directly from the correct template to validate logic
        var possibleResponses = localeTemplateEngineManager.templateEnginesPerLocale["en-us"].expandTemplate("HaveNameMessage", data);

        strictEqual(possibleResponses.includes(response.text));
    });
});