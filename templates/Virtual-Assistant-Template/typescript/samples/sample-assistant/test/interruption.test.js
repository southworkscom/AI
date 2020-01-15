/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License
 */

const assert = require('assert');
const { testUserProfileState } = require('./helpers/botTestBase');
const botTestBase = require('./helpers/botTestBase');
const { MemoryStorage } = require('botbuilder-core')
const testNock = require("./helpers/testBase");
let testStorage = new MemoryStorage();

describe("Interruption", function() {
    describe("Help Interruption", function() {
        beforeEach(function(done) {
            testStorage = new MemoryStorage();
            done();
        });

        it("Test Help Interruption", function(done) {
            botTestBase.getTestAdapterDefault({ storage: testStorage }).then((testAdapter) => {
                const flow = testAdapter
                .send("Help")
                .assertReply((activity, description) => {
                    assert.strictEqual(1, activity.attachments.length)
                })

                return testNock.resolveWithMocks("interruption_help_response", done, flow);
            });
        });

        it("Test Help Interruption In Dialog", function(done) {
            const allNamePromptVariations = localeTemplateEngineManager.templateEnginesPerLocale.get("en-us").expandTemplate("NamePrompt");

            botTestBase.getTestAdapterDefault({ storage: testStorage }).then((testAdapter) => {
                const flow = testAdapter
                .send({
                    type: "conversationUpdate",
                    membersAdded: [
                        {
                            id: "1",
                            name: "user"
                        }
                    ],
                })
                .assertReply((activity, description) => {
                    assert.strictEqual(1, activity.attachments.length)
                })
                .assertReplyOneOf(allNamePromptVariations)
                .send("Help")
                .assertReply((activity, description) => {
                    assert.strictEqual(1, activity.attachments.length)
                })
                .assertReplyOneOf(allNamePromptVariations)

                return testNock.resolveWithMocks("interruption_help_in_dialog_response", done, flow);
            });
        });
    });

    describe ("Cancel Interruption", function(done) {
        it("Test Cancel Interruption", function(done) {
            const allResponseVariations = localeTemplateEngineManager.templateEnginesPerLocale.get("en-us").expandTemplate("CancelledMessage", testUserProfileState);

            botTestBase.getTestAdapterDefault().then((testAdapter) => {
                const flow = testAdapter
                    .send("Cancel")
                    .assertReplyOneOf(allResponseVariations)

                return testNock.resolveWithMocks("interruption_cancel_response", done, flow);
            });
        });

        it("Test Cancel Interruption Confirmed", function(done) {
            const allNamePromptVariations = localeTemplateEngineManager.templateEnginesPerLocale.get("en-us").expandTemplate("NamePrompt");
            const allCancelledVariations = localeTemplateEngineManager.templateEnginesPerLocale.get("en-us").expandTemplate("CancelledMessage", testUserProfileState);

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
                    })
                    .assertReply((activity, description) => {
                        assert.strictEqual(1, activity.attachments.length)
                    })
                    .assertReplyOneOf(allNamePromptVariations)
                    .send("Cancel")
                    .assertReplyOneOf(allCancelledVariations)
                return testNock.resolveWithMocks("interruption_confirm_cancel_response", done, flow);
            });
        });

        it("Test Repeat interruption", function(done) {
            const allNamePromptVariations = localeTemplateEngineManager.templateEnginesPerLocale.get("en-us").expandTemplate("NamePrompt");

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
                    })
                    .assertReply((activity, description) => {
                        assert.strictEqual(1, activity.attachments.length)
                    })
                    .assertReplyOneOf(allNamePromptVariations)
                    .send("Repeat")
                    .assertReply((activity, description) => {
                        assert.strictEqual(1, activity.attachments.length)
                    })
                    .assertReplyOneOf(allNamePromptVariations)
                return testNock.resolveWithMocks("interruption_repeat_response", done, flow);
            });
        });
    });
});
