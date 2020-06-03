/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

const { ok } = require("assert");
const { join } = require("path");
const i18next = require("i18next").default;
const { LocaleTemplateManager } = require(join("..", "..", "lib", "responses", "localeTemplateManager"));
const { Templates } = require("botbuilder-lg");

let localeTemplateManager;
let localeLgFiles;

describe("language generation", function() {
    after(async function() {
        i18next.changeLanguage('en-us');
    });

    before(async function() {
        localeLgFiles = new Map();
        localeLgFiles.set("en", join(__dirname, "..", "responses", "testResponses.lg"));
        localeLgFiles.set("es", join(__dirname, "..", "responses", "testResponses.es.lg"));
        
        localeTemplateManager = new LocaleTemplateManager(localeLgFiles, "en");
    });
    
    describe("get response with language generation english", function() {
        it("should return the correct response included in the possible responses of the locale", function() {
            const defaultCulture = i18next.language;

            i18next.changeLanguage("en-us");

            // Generate English response using LG with data
            const data = { Name: "Darren" };
            const response = localeTemplateManager.generateActivityForLocale("HaveNameMessage", data);

            // Retrieve possible responses directly from the correct template to validate logic
            const possibleResponses = Templates.parseFile(localeLgFiles.get("en")).expandTemplate("HaveNameMessage", data);

            ok(possibleResponses.includes(response.text));

            i18next.language = defaultCulture;
        });
    });

    describe("get response with language generation spanish", function() {
        it("should return the correct response included in the possible responses of the locale", function() {
            const defaultCulture = i18next.language;

            i18next.changeLanguage("es-es");

            // Generate Spanish response using LG with data
            const data = { name: "Darren" };
            const response = localeTemplateManager.generateActivityForLocale("HaveNameMessage", data);

            // Retrieve possible responses directly from the correct template to validate logic
            const possibleResponses = Templates.parseFile(localeLgFiles.get("es")).expandTemplate("HaveNameMessage", data);

            ok(possibleResponses.includes(response.text));

            i18next.language = defaultCulture;
        });
    });

    describe("get response with language generation fallback", function() {
        it("should return a list that contains the response text of the fallback language", function() {
            const defaultCulture = i18next.language;

            // German locale not supported, locale template engine should fallback to english as per default in Test Setup.
            i18next.changeLanguage("de-de");

            // Generate English response using LG with data
            const data = { name: "Darren" };
            const response = localeTemplateManager.generateActivityForLocale("HaveNameMessage", data);

            // Retrieve possible responses directly from the correct template to validate logic
            // Logic should fallback to english due to unsupported locale
            const possibleResponses = Templates.parseFile(localeLgFiles.get("en")).expandTemplate("HaveNameMessage", data);

            ok(possibleResponses.includes(response.text));

            i18next.language = defaultCulture;
        });
    });
});
