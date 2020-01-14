/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License
 */

const assert = require('assert');
const testUserProfileState = require('./helpers/botTestBase');
const botTestBase = require('./helpers/botTestBase');
const { MemoryStorage } = require('botbuilder-core')
const testNock = require("./helpers/testBase");
let testStorage = new MemoryStorage();

describe("Interruption", function() {
    describe("Nothing to cancel", function() {
        it("Send 'Cancel' without dialog stack", function(done) {
            botTestBase.getTestAdapterDefault().then((testAdapter) => {
                const flow = testAdapter
                    .send("Help")
                    .assertReply((activity, description) => {
                        assert.strictEqual(1, activity.attachments.length)
                    })

                return testNock.resolveWithMocks("interruption_nothing_to_cancel", done, flow);
            });
        });
    });

    describe("Help interruption", function() {
        beforeEach(function(done) {
            testStorage = new MemoryStorage();
            done();
        });

        it("Send 'Help' interruption in dialog", function(done) {
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

                return testNock.resolveWithMocks("interruption_help_response", done, flow);
            });
        });
    });

    describe ("Send 'Cancel' interruption in dialog", function(done) {
        const allResponseVariations = localeTemplateEngineManager.templateEnginesPerLocale.get("en-us").expandTemplate("CancelledMessage", testUserProfileState);
        botTestBase.getTestAdapterDefault().then((testAdapter) => {
            const flow = testAdapter
                .send("Cancel")
                .assertReplyOneOf(allResponseVariations)

            return testNock.resolveWithMocks("interruption_cancel_flow", done, flow);
        });
    });

    describe("Cancel interruption flow", function() {
        it("Confirm 'SCancel' during the onboarding dialog", function(done) {
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
                    .assertReply((activity, description) => {
                        assert.strictEqual(1, activity.attachments.length)
                    })
                    .assertReplyOneOf(allCancelledVariations)
                return testNock.resolveWithMocks("interruption_confirm_cancel_response", done, flow);
            });
        });

        it("Repeat interruption", function(done) {
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
                return testNock.resolveWithMocks("interruption_repeat", done, flow);
            });
        });
    });
});