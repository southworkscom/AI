﻿// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Bot.Builder.LanguageGeneration;
using Microsoft.Bot.Connector.DirectLine;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using VirtualAssistantSample.FunctionalTests.Models;

namespace VirtualAssistantSample.FunctionalTests
{
    [TestClass]
    [TestCategory("FunctionalTests")]
    public class DirectLineClientTests
    {
        private const string TestName = "Jane Doe";
        private static DirectLineClient _client;

        protected Templates AllResponsesTemplates
        {
            get
            {
                var currentCulture = CultureInfo.CurrentUICulture.Name.ToLower();
                var path = string.Equals(currentCulture, "en-us", StringComparison.OrdinalIgnoreCase) ?
                    Path.Combine(".", "Responses", $"AllResponses.lg") :
                    Path.Combine(".", "Responses", $"AllResponses.{currentCulture}.lg");
                return Templates.ParseFile(path);
            }
        }

        [ClassInitialize]
        public static void Class_Initialize(TestContext testContext)
        {
            // Get the values for the environment variables.
            var _directLineSecret = Environment.GetEnvironmentVariable("DIRECTLINE");
            if (string.IsNullOrWhiteSpace(_directLineSecret))
            {
                throw new ArgumentNullException(nameof(_directLineSecret));
            }

            // Create a new Direct Line client.
            _client = new DirectLineClient(_directLineSecret);
        }

        [TestMethod]
        public async Task Test_Greeting()
        {
            string fromUser = Guid.NewGuid().ToString();

            await Assert_New_User_Greeting(fromUser);
            await Assert_Returning_User_Greeting(fromUser);
        }

        /// <summary>
        /// Assert that a new user is greeted with the onboarding prompt.
        /// </summary>
        /// <param name="fromUser">User identifier used for the conversation and activities.</param>
        /// <returns>Task.</returns>
        public async Task Assert_New_User_Greeting(string fromUser)
        {
            var profileState = new UserProfileState { Name = TestName };

            var allNamePromptVariations = AllResponsesTemplates.ExpandTemplate("NamePrompt");
            var allHaveMessageVariations = AllResponsesTemplates.ExpandTemplate("HaveNameMessage", profileState);

            var conversation = await _client.Conversations.StartConversationAsync();

            var responses = await SendActivityAsync(conversation, CreateStartConversationEvent(fromUser));

            Assert.AreEqual(1, responses[0].Attachments.Count);
            CollectionAssert.Contains(allNamePromptVariations as ICollection, responses[1].Text);

            responses = await SendActivityAsync(conversation, CreateMessageActivity(fromUser, TestName));

            CollectionAssert.Contains(allHaveMessageVariations as ICollection, responses[4].Text);
        }

        /// <summary>
        /// Assert that a returning user is only greeted with a single card activity and the welcome back prompt.
        /// </summary>
        /// <param name="fromUser">User identifier used for the conversation and activities.</param>
        /// <returns>Task.</returns>
        public async Task Assert_Returning_User_Greeting(string fromUser)
        {
            var conversation = await _client.Conversations.StartConversationAsync();

            var responses = await SendActivityAsync(conversation, CreateStartConversationEvent(fromUser));

            // Both should be message Activities.
            Assert.AreEqual(ActivityTypes.Message, responses[0].GetActivityType());
            Assert.AreEqual(ActivityTypes.Message, responses[1].GetActivityType());

            // First Activity should have an adaptive card response.
            Assert.AreEqual(1, responses[0].Attachments.Count);
            Assert.AreEqual("application/vnd.microsoft.card.adaptive", responses[0].Attachments[0].ContentType);
        }

        /// <summary>
        /// Return a Start Conversation event with a customised UserId and Name enabling independent tests to not be affected by earlier functional test conversations.
        /// </summary>
        /// <param name="fromUser">User identifier used for the conversation and activities.</param>
        private Activity CreateStartConversationEvent(string fromUser)
        {
            // An event activity to trigger the welcome message (method for using custom Web Chat).
            return new Activity
            {
                From = new ChannelAccount(fromUser, TestName),
                Name = "startConversation",
                Type = ActivityTypes.Event
            };
        }

        /// <summary>
        /// Return a Message Activity with a customised UserId and Name enabling independent tests to not be affected by earlier functional test conversations.
        /// </summary>
        /// <param name="fromUser">User identifier used for the conversation and activities.</param>
        private Activity CreateMessageActivity(string fromUser, string activityText)
        {
            return new Activity
            {
                From = new ChannelAccount(fromUser, TestName),
                Text = activityText,
                Type = ActivityTypes.Message
            };
        }

        /// <summary>
        /// Sends an activity and waits for the response.
        /// </summary>
        /// <returns>Returns the bots answer.</returns>
        private async Task<List<Activity>> SendActivityAsync(Conversation conversation, Activity activity)
        {
            // Send the message activity to the bot.
            await _client.Conversations.PostActivityAsync(conversation.ConversationId, activity);

            // Read the bot's message.
            return await ReadBotMessagesAsync(_client, conversation.ConversationId);
        }

        /// <summary>
        /// Polls the bot continuously until it gets a response.
        /// Reads the messages from the bot.
        /// </summary>
        /// <param name="client">The Direct Line client.</param>
        /// <param name="conversationId">The conversation ID.</param>
        /// <returns>Returns the bot's answer.</returns>
        private async Task<List<Activity>> ReadBotMessagesAsync(DirectLineClient client, string conversationId)
        {
            List<Activity> botResponses = null;

            // Retrieve the activity sent from the bot.
            var activitySet = await client.Conversations.GetActivitiesAsync(conversationId);

            // Analyze each activity in the activity set.
            if (activitySet.Activities.Count > 0)
            {
                botResponses = activitySet.Activities.ToList();
            }

            return botResponses;
        }
    }
}