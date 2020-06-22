/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License
 */
const i18next = require('i18next');
const assert = require('assert');
const { getAllResponsesTemplates, getTestAdapterDefault } = require('./helpers/botTestBase');
const testNock = require('./helpers/testBase');

describe("Localization", function() {
    describe("es-es locale", function () {
        it("send conversationUpdate and check the card is received with the es-es locale", function (done) {
                await i18next.changeLanguage('es-es');
                const allIntroCardTitleVariations = getAllResponsesTemplates().expandTemplate("NewUserIntroCardTitle");

                getTestAdapterDefault().then((testAdapter) => {
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
                    // Assert there is a card in the message
                    assert.strictEqual(1, activity.attachments.length);

                    // Assert the intro card has been localized
                    const content = activity.attachments[0].content;

                    assert.ok(content.body.some(i => {
                        return i.type === 'Container' &&
                            i.items.some(t => {
                                return t.type === 'TextBlock' &&
                                    allIntroCardTitleVariations.includes(t.text)
                            });
                    }));
                });

                return testNock.resolveWithMocks('localization_response_es-es', done, flow);
            });
        });
    });

	describe("de-de locale", function () {
            it("send conversationUpdate and check the card is received with the de-de locale", function (done) {
                await i18next.changeLanguage("de-de");
                const allIntroCardTitleVariations = getAllResponsesTemplates().expandTemplate("NewUserIntroCardTitle");

                getTestAdapterDefault().then((testAdapter) => {
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
                    // Assert there is a card in the message
                    assert.strictEqual(1, activity.attachments.length);

                    // Assert the intro card has been localized
                    const content = activity.attachments[0].content;

                    assert.ok(content.body.some(i => {
                        return i.type === 'Container' &&
                            i.items.some(t => {
                                return t.type === 'TextBlock' &&
                                    allIntroCardTitleVariations.includes(t.text)
                            });
                    }));
                });

                return testNock.resolveWithMocks('localization_response_de-de', done, flow);
            });
        });
    });

	describe("fr-fr locale", function () {
            it("send conversationUpdate and check the card is received with the fr-fr locale", function (done) {
                await i18next.changeLanguage('fr-fr');
                const allIntroCardTitleVariations = getAllResponsesTemplates().expandTemplate("NewUserIntroCardTitle");

                getTestAdapterDefault().then((testAdapter) => {
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
                    // Assert there is a card in the message
                    assert.strictEqual(1, activity.attachments.length);

                    // Assert the intro card has been localized
                    const content = activity.attachments[0].content;

                    assert.ok(content.body.some(i => {
                        return i.type === 'Container' &&
                            i.items.some(t => {
                                return t.type === 'TextBlock' &&
                                    allIntroCardTitleVariations.includes(t.text)
                            });
                    }));
                });

                return testNock.resolveWithMocks('localization_response_fr-fr', done, flow);
            });
        });
    });

	describe("it-it locale", function () {
            it("send conversationUpdate and check the card is received with the it-it locale", function (done) {
                await i18next.changeLanguage('it-it');
                const allIntroCardTitleVariations = getAllResponsesTemplates().expandTemplate("NewUserIntroCardTitle");

                getTestAdapterDefault().then((testAdapter) => {
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
                    // Assert there is a card in the message
                    assert.strictEqual(1, activity.attachments.length);

                    // Assert the intro card has been localized
                    const content = activity.attachments[0].content;

                    assert.ok(content.body.some(i => {
                        return i.type === 'Container' &&
                            i.items.some(t => {
                                return t.type === 'TextBlock' &&
                                    allIntroCardTitleVariations.includes(t.text)
                            });
                    }));
                });

                return testNock.resolveWithMocks('localization_response_it-it', done, flow);
            });
        });
    });

	describe("en-us locale", function () {
            it("send conversationUpdate and check the card is received with the en-us locale", function (done) {
                await i18next.changeLanguage('en-us');
                const allIntroCardTitleVariations = getAllResponsesTemplates().expandTemplate("NewUserIntroCardTitle");

                getTestAdapterDefault().then((testAdapter) => {
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
                    // Assert there is a card in the message
                    assert.strictEqual(1, activity.attachments.length);

                    // Assert the intro card has been localized
                    const content = activity.attachments[0].content;

                    assert.ok(content.body.some(i => {
                        return i.type === 'Container' &&
                            i.items.some(t => {
                                return t.type === 'TextBlock' &&
                                    allIntroCardTitleVariations.includes(t.text)
                            });
                    }));
                });

                return testNock.resolveWithMocks('localization_response_en-us', done, flow);
            });
        });
    });

	describe("zh-cn locale", function () {
            it("send conversationUpdate and check the card is received with the zh-cn locale", function (done) {
                await i18next.changeLanguage("zh-cn");
                const allIntroCardTitleVariations = getAllResponsesTemplates().expandTemplate("NewUserIntroCardTitle");

                getTestAdapterDefault().then((testAdapter) => {
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
                    // Assert there is a card in the message
                    assert.strictEqual(1, activity.attachments.length);

                    // Assert the intro card has been localized
                    const content = activity.attachments[0].content;

                    assert.ok(content.body.some(i => {
                        return i.type === 'Container' &&
                            i.items.some(t => {
                                return t.type === 'TextBlock' &&
                                    allIntroCardTitleVariations.includes(t.text)
                            });
                    }));
                });

                return testNock.resolveWithMocks('localization_response_zh-cn', done, flow);
            });
        });
    });

    // PENDING: the fallback functionality is not implemented in LocaleTemplateManager currently
    xdescribe("defaulting localization", function () {
        it("fallback to a locale of the root language locale", function (done) {
            getTestAdapterDefault().then((testAdapter) => {
            await i18next.changeLanguage('en-uk');
            const flow = testAdapter
                .send({
                    type: "conversationUpdate",
                    membersAdded: [
                        {
                            id: "1",
                            name: "user"
                        }
                    ],
                    locale: "en-uk"
                })
                .assertReply(function (activity, description) {
                    assert.strictEqual(1, activity.attachments.length);
                });

                 return testNock.resolveWithMocks('localization_response_en-uk', done, flow);
            });
        });
    });
});
