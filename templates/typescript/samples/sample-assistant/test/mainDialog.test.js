/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License
 */

const assert = require('assert');
const testNock = require('./helpers/testBase');
const { getTestAdapterDefault, testUserProfileState } = require('./helpers/botTestBase');

describe("Main Dialog", function () {
	describe("intro card", function() {
		it("test intro message", function(done) {
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
                })
				.assertReply(function (activity, description) {
					assert.strictEqual(1, activity.attachments.length);
				});

				return testNock.resolveWithMocks('mainDialog_introCard_response', done, flow);
			});
		});
	});

	describe("help", function () {
		it("test help intent", function (done) {
			getTestAdapterDefault().then((testAdapter) => {
				const flow = testAdapter
					.send('Help')
					.assertReply(function (activity, description) {
						assert.strictEqual(1, activity.attachments.length);
					});

				testNock.resolveWithMocks('mainDialog_help_response', done, flow);
			});
		});
	});

	describe("escalating", function () {
        it("test escale intent", function (done) {
            getTestAdapterDefault().then((testAdapter) => {
				const flow = testAdapter
					.send('I want to talk to a human')	
					.assertReply(function (activity, description) {
						assert.strictEqual(1, activity.attachments.length);
					});

				testNock.resolveWithMocks('mainDialog_escalate_response', done, flow);
			});
        });
    });
	
    describe("confused", function () {
    	/*
    	ChitChat is the default fallback which will not be configured at functional test time so a mock ensures QnAMaker returns no answer
    	enabling the unsupported message to be returned.
    	 */
        it("test unhandled message", function (done) {
			const allResponseVariations = getAllResponsesTemplates().expandTemplate("UnsupportedMessage", testUserProfileState);

			getTestAdapterDefault().then((testAdapter) => {
				const flow = testAdapter
                .send('Unhandled message')
                .assertReplyOneOf(allResponseVariations);
                    
                testNock.resolveWithMocks('mainDialog_unhandled_response', done, flow);
            });
        });
    });
});
