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
        it("test localization spanish", function (done) {
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
            it("test localization german", function (done) {
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
            it("test localization french", function (done) {
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
            it("test localization italian", function (done) {
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

	describe("zh-cn locale", function () {
            it("test localization chinese", function (done) {
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
    describe("defaulting localization", function () {
        it("test defaulting localization", function (done) {
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
