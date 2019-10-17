/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
const assert = require("assert");
const skillTestBase = require("./helpers/skillTestBase");
const testNock = require("./helpers/testBase");
const unhandledReplies = [
  "Can you try to ask me again? I didn't get what you mean.",
  "Can you say that in a different way?",
  "Can you try to ask in a different way?",
  "Could you elaborate?",
  "Please say that again in a different way.",
  "I didn't understand, perhaps try again in a different way.",
  "I didn't get what you mean, can you try in a different way?",
  "Sorry, I didn't understand what you meant.",
  "I didn't quite get that."
];

describe("localization", function() {
  beforeEach(async function() {
    await skillTestBase.initialize();
  });

  describe("de-de locale", function() {
    it("send conversationUpdate and check the intro message is received with the de-de locale", function(done) {
      const testAdapter = skillTestBase.getTestAdapter();
      const flow = testAdapter
        .send({
          type: "conversationUpdate",
          membersAdded: [
            {
              id: "1",
              name: "Bot"
            }
          ],
          channelId: "emulator",
          recipient: {
            id: "1"
          },
          locale: "de-de"
        })
        .assertReply("[Geben Sie Ihre Intro-Nachricht ein.]");

      return testNock.resolveWithMocks("localization_de-de_response", done, flow);
    });
  });

  describe("es-es locale", function() {
    it("send conversationUpdate and check the intro message is received with the es-es locale", function(done) {
      const testAdapter = skillTestBase.getTestAdapter();
      const flow = testAdapter
        .send({
          type: "conversationUpdate",
          membersAdded: [
            {
              id: "1",
              name: "Bot"
            }
          ],
          channelId: "emulator",
          recipient: {
            id: "1"
          },
          locale: "es-es"
        })
        .assertReply("[Introduzca aquí su mensaje introductorio]");

      return testNock.resolveWithMocks("localization_es-es_response", done, flow);
    });
  });

  describe("fr-fr locale", function() {
    it("send conversationUpdate and check the intro message is received with the fr-fr locale", function(done) {
      const testAdapter = skillTestBase.getTestAdapter();
      const flow = testAdapter
        .send({
          type: "conversationUpdate",
          membersAdded: [
            {
              id: "1",
              name: "Bot"
            }
          ],
          channelId: "emulator",
          recipient: {
            id: "1"
          },
          locale: "fr-fr"
        })
        .assertReply(`[Entrez votre message d'intro ici]`);

      return testNock.resolveWithMocks("localization_fr-fr_response", done, flow);
    });
  });

  describe("it-it locale", function() {
    it("send conversationUpdate and check the intro message is received with the it-it locale", function(done) {
      const testAdapter = skillTestBase.getTestAdapter();
      const flow = testAdapter
        .send({
          type: "conversationUpdate",
          membersAdded: [
            {
              id: "1",
              name: "Bot"
            }
          ],
          channelId: "emulator",
          recipient: {
            id: "1"
          },
          locale: "it-it"
        })
        .assertReply("[Inserisci qui il tuo messaggio introduttivo]");

      return testNock.resolveWithMocks("localization_it-it_response", done, flow);
    });
  });

  describe("en-us locale", function() {
    it("send conversationUpdate and check the intro message is received with the en-us locale", function(done) {
      const testAdapter = skillTestBase.getTestAdapter();
      const flow = testAdapter
        .send({
          type: "conversationUpdate",
          membersAdded: [
            {
              id: "1",
              name: "Bot"
            }
          ],
          channelId: "emulator",
          recipient: {
            id: "1"
          },
          locale: "en-us"
        })
        .assertReply("[Enter your intro message here]");

      return testNock.resolveWithMocks("localization_en-us_response", done, flow);
    });
  });

  describe("zh-cn locale", function() {
    it("send conversationUpdate and check the intro message is received with the zh-zh locale", function(done) {
      const testAdapter = skillTestBase.getTestAdapter();
      const flow = testAdapter
        .send({
          type: "conversationUpdate",
          membersAdded: [
            {
              id: "1",
              name: "Bot"
            }
          ],
          channelId: "emulator",
          recipient: {
            id: "1"
          },
          locale: "zh-cn"
        })
        .assertReply("[在此输入您的简介信息]");

      return testNock.resolveWithMocks("localization_zh-cn_response", done, flow);
    });
  });

  describe("Defaulting localization", function () {
    it("Fallback to a locale of the root language locale", function (done) {
      const testAdapter = skillTestBase.getTestAdapter();
      const flow = testAdapter
          .send({
            type: "conversationUpdate",
            membersAdded: [
                {
                    id: "1",
                    name: "Bot"
                }
            ],
            channelId: "emulator",
            recipient: {
                id: "1"
            },
            locale: "en-gb"
          })
          .assertReply("[Enter your intro message here]");

        return testNock.resolveWithMocks('localization_response_en-gb', done, flow);
    });
  });

  describe("No matching Cognitive Model", function () {
    it("Send a confused message notice when there is no matching cognitive models and can't fallback", function(done) {
      const testAdapter = skillTestBase.getTestAdapter();
      const flow = testAdapter
        .send({
          text: 'blah blah',
          locale: "en-gb"
        })
        .assertReply(function(activity) {
          assert.notStrictEqual(-1, unhandledReplies.indexOf(activity.text));
        });

      testNock.resolveWithMocks("mainDialog_no_cognitive_models", done, flow);
    });
  });
});
