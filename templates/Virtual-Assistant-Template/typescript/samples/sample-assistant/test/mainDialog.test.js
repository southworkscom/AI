/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License
 */

const assert = require('assert');
const botTestBase = require('./helpers/botTestBase');
const testNock = require('./helpers/testBase');
const {templateEngine, testUserProfileState } = require('./helpers/botTestBase');

describe("Main Dialog", function () {
	describe("Intro Card", function() {
		it("Send conversationUpdate and verify card is received", function(done) {
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
				.assertReply(function (activity, description) {
					assert.strictEqual(1, activity.attachments.length);
				});

				return testNock.resolveWithMocks('mainDialog_introCard_response', done, flow);
			});
		});
	});

	describe("Help", function () {
		it("Send Help and check you get the expected response", function (done) {
			botTestBase.getTestAdapterDefault().then((testAdapter) => {
				const flow = testAdapter
					.send('Help')
					.assertReply(function (activity, description) {
						assert.strictEqual(1, activity.attachments.length);
					});

				testNock.resolveWithMocks('mainDialog_help_response', done, flow);
			});
		});
	});

	describe("Escalating", function () {
        it("Send 'I want to talk to a human' and check you get the expected response", function (done) {
            botTestBase.getTestAdapterDefault().then((testAdapter) => {
				const flow = testAdapter
					.send('I want to talk to a human')	
					.assertReply(function (activity, description) {
						assert.strictEqual(1, activity.attachments.length);
					});

				testNock.resolveWithMocks('mainDialog_escalate_response', done, flow);
			});
        });
    });

	describe("Localization", function () {
		it("Send a message in spanish, set locale property on activity and validate the localized response", function (done) {
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
					assert.strictEqual(1, activity.attachments.length);
				});

				return testNock.resolveWithMocks('mainDialog_localization_response', done, flow);
			});
		});
	});
	
    describe("Confused", function () {
        it("Send an unhandled message", function (done) {
			var allResponseVariations = templateEngine.templateEnginesPerLocale.get['en-us'].expandTemplate("UnsupportedMessage", testUserProfileState);
            botTestBase.getTestAdapterDefault().then((testAdapter) => {
                const flow = testAdapter
                    .send('Unhandled message')
                    .assertReply(allResponseVariations);
                    
                testNock.resolveWithMocks('mainDialog_unhandled_response', done, flow);
            });
        });
    });
});
