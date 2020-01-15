/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License
 */

const assert = require('assert');
const botTestBase = require('./helpers/botTestBase');
const testNock = require('./helpers/testBase');
const localeTemplateEngineManager = require('botbuilder-solutions');

describe("Localization", function() {
	describe("de-de locale", function () {
            it("send conversationUpdate and check the card is received with the de-de locale", function (done) {
                let allIntroCardTitleVariations =  localeTemplateEngineManager.templateEnginesPerLocale.get("de-de").expandTemplate("NewUserIntroCardTitle");
                botTestBase.getTestAdapterDefault().then((testAdapter) => {
                const flow = testAdapter
                .send({
                    type: "conversationUpdate",
                    membersAdded: [
                        {
                            id: "1",
                            name: "user"
                        }
                    ],
                    locale: "de-de"
                })
                .assertReply(function (activity, description) {
                    assert.strictEqual(activity.attachments[0].contentType, 'application/vnd.microsoft.card.adaptive');
					assert.deepStrictEqual(activity.attachments[0].content, );
                });

                return testNock.resolveWithMocks('localization_response_de-de', done, flow);
            });
        });
    });
	describe("es-es locale", function () {
        it("send conversationUpdate and check the card is received with the es-es locale", function (done) {
            let allIntroCardTitleVariations =  localeTemplateEngineManager.templateEnginesPerLocale.get("es-es").expandTemplate("NewUserIntroCardTitle");
                botTestBase.getTestAdapterDefault().then((testAdapter) => {
                const flow = testAdapter
                .send({
                    type: "conversationUpdate",
                    membersAdded: [
                        {
                            id: "1",
                            name: "user"
                        }
                    ],
                    locale: "es-es"
                })
                .assertReply(function (activity, description) {
                    assert.strictEqual(activity.attachments[0].contentType, 'application/vnd.microsoft.card.adaptive');
					assert.deepStrictEqual(activity.attachments[0].content,);
                });

                return testNock.resolveWithMocks('localization_response_es-es', done, flow);
            });
        });
    });
	describe("fr-fr locale", function () {
            it("send conversationUpdate and check the card is received with the fr-fr locale", function (done) {
                let allIntroCardTitleVariations =  localeTemplateEngineManager.templateEnginesPerLocale.get("fr-fr").expandTemplate("NewUserIntroCardTitle");
                botTestBase.getTestAdapterDefault().then((testAdapter) => {
                const flow = testAdapter
                .send({
                    type: "conversationUpdate",
                    membersAdded: [
                        {
                            id: "1",
                            name: "user"
                        }
                    ],
                    locale: "fr-fr"
                })
                .assertReply(function (activity, description) {
                    assert.strictEqual(activity.attachments[0].contentType, 'application/vnd.microsoft.card.adaptive');
					assert.deepStrictEqual(activity.attachments[0].content,);
                });

                return testNock.resolveWithMocks('localization_response_fr-fr', done, flow);
            });
        });
    });
	describe("it-it locale", function () {
            it("send conversationUpdate and check the card is received with the it-it locale", function (done) {
                let allIntroCardTitleVariations =  localeTemplateEngineManager.templateEnginesPerLocale.get("it-it").expandTemplate("NewUserIntroCardTitle");
                botTestBase.getTestAdapterDefault().then((testAdapter) => {
                const flow = testAdapter
                .send({
                    type: "conversationUpdate",
                    membersAdded: [
                        {
                            id: "1",
                            name: "user"
                        }
                    ],
                    locale: "it-it"
                })
                .assertReply(function (activity, description) {
                    assert.strictEqual(activity.attachments[0].contentType, 'application/vnd.microsoft.card.adaptive');
					assert.deepStrictEqual(activity.attachments[0].content,);
                });

                return testNock.resolveWithMocks('localization_response_it-it', done, flow);
            });
        });
    });
	describe("en-us locale", function () {
            it("send conversationUpdate and check the card is received with the en-us locale", function (done) {
                let allIntroCardTitleVariations =  localeTemplateEngineManager.templateEnginesPerLocale.get("en-us").expandTemplate("NewUserIntroCardTitle");
                botTestBase.getTestAdapterDefault().then((testAdapter) => {
                const flow = testAdapter
                .send({
                    type: "conversationUpdate",
                    membersAdded: [
                        {
                            id: "1",
                            name: "user"
                        }
                    ],
                    locale: "en-us"
                })
                .assertReply(function (activity, description) {
                    assert.strictEqual(activity.attachments[0].contentType, 'application/vnd.microsoft.card.adaptive');
					assert.deepStrictEqual(activity.attachments[0].content,);
                });

                return testNock.resolveWithMocks('localization_response_en-us', done, flow);
            });
        });
    });
	describe("zh-cn locale", function () {
            it("send conversationUpdate and check the card is received with the zh-cn locale", function (done) {
                let allIntroCardTitleVariations =  localeTemplateEngineManager.templateEnginesPerLocale.get("zh-cn").expandTemplate("NewUserIntroCardTitle");
                botTestBase.getTestAdapterDefault().then((testAdapter) => {
                const flow = testAdapter
                .send({
                    type: "conversationUpdate",
                    membersAdded: [
                        {
                            id: "1",
                            name: "user"
                        }
                    ],
                    locale: "zh-cn"
                })
                .assertReply(function (activity, description) {
                    assert.strictEqual(activity.attachments[0].contentType, 'application/vnd.microsoft.card.adaptive');
					assert.deepStrictEqual(activity.attachments[0].content,);
                });

                return testNock.resolveWithMocks('localization_response_zh-cn', done, flow);
            });
        });
    });
    describe("Defaulting localization", function () {
        it("Fallback to a locale of the root language locale", function (done) {
            botTestBase.getTestAdapterDefault().then((testAdapter) => {
            const flow = testAdapter
                .send({
                    type: "conversationUpdate",
                    membersAdded: [
                        {
                            id: "1",
                            name: "user"
                        }
                    ],
                    locale: "en-gb"
                })
                .assertReply(function (activity, description) {
                    assert.strictEqual(activity.attachments[0].contentType, 'application/vnd.microsoft.card.adaptive');
                    assert.deepStrictEqual(activity.attachments[0].content,);
                });

                return testNock.resolveWithMocks('localization_response_en-gb', done, flow);
            });
        });
    });
});