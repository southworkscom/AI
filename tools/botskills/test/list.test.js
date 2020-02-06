/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

const { strictEqual } = require("assert");
const { writeFileSync } = require("fs");
const { join, resolve } = require("path");
const testLogger = require("./helpers/testLogger");
const { normalizeContent } = require("./helpers/normalizeUtils");
const botskills = require("../lib/index");

    const noAuthConnectionAppSettingsWithConnectedSkill = normalizeContent(JSON.stringify(
        {
            "microsoftAppId": "",
            "microsoftAppPassword": "",
            "appInsights": {
                "appId": "",
                "instrumentationKey": ""
            },
            "blobStorage": {
                "connectionString": "",
                "container": ""
            },
            "cosmosDb": {
                "authkey": "",
                "collectionId": "",
                "cosmosDBEndpoint": "",
                "databaseId": ""
            },
            "contentModerator": {
                "key": ""
            },
            "BotFrameworkSkills": [
                {
                    "Id": "connectableSkill",
                    "AppId": "00000000-0000-0000-0000-000000000000",
                    "SkillEndpoint": "https://bftestskill.azurewebsites.net/api/skill/messages",
                    "Name": "Test Skill"
                },
                {
                    "Id": "testSkill",
                    "AppId": "00000000-0000-0000-0000-000000000000",
                    "SkillEndpoint": "https://bftestskill.azurewebsites.net/api/skill/messages",
                    "Name": "Test Skill"
                }
            ],
            "SkillHostEndpoint": "https://.azurewebsites.net/api/skills"
        },
        null, 4));

function undoChangesInTemporalFiles() {
    writeFileSync(resolve(__dirname, join("mocks", "appsettings", "noAuthConnectionAppSettingsWithConnectedSkill.json")), noAuthConnectionAppSettingsWithConnectedSkill);
}

describe("The list command", function () {

    beforeEach(function () {
        undoChangesInTemporalFiles();
        this.logger = new testLogger.TestLogger();
        this.lister = new botskills.ListSkill(this.logger);
    });

    after(function() {
        undoChangesInTemporalFiles();
    });

	describe("should show an error", function () {		
        it("when there is no skills File", async function () {
            const config = {
                appSettingsFile: "",
                logger: this.logger
            };

            await this.lister.listSkill(config);
            const errorList = this.logger.getError();

            strictEqual(errorList[errorList.length - 1], `The 'appSettingsFile' argument is absent or leads to a non-existing file.
Please make sure to provide a valid path to your Assistant Skills configuration file using the '--appSettingsFile' argument.`);
        });

        it("when the appSettingsFile points to a bad formatted Assistant Skills configuration file", async function () {
            const config = {
                appSettingsFile: resolve(__dirname, "mocks", "virtualAssistant", "badAppSettings.jso"),
                logger: this.logger
            };

            await this.lister.listSkill(config);
            const errorList = this.logger.getError();

            strictEqual(errorList[errorList.length - 1], `There was an error while listing the Skills connected to your assistant:
 SyntaxError: Unexpected token N in JSON at position 0`);
		});
    });

    describe("should show a message", function () {
        it("when there is no skills connected to the assistant", async function () {
            const config = {
                appSettingsFile: resolve(__dirname, "mocks", "appsettings", "noAuthConnectionAppSettings.json"),
                logger: this.logger
            };

            await this.lister.listSkill(config);
            const messageList = this.logger.getMessage();

			strictEqual(messageList[messageList.length - 1], `There are no Skills connected to the assistant.`);
        });

        it("when there is no skills array defined in the Assistant Skills configuration file", async function () {
            const config = {
                appSettingsFile: resolve(__dirname, "mocks", "virtualAssistant", "undefinedSkills.json"),
                logger: this.logger
            };

            await this.lister.listSkill(config);
            const messageList = this.logger.getMessage();

			strictEqual(messageList[messageList.length - 1], `There are no Skills connected to the assistant.`);
        });

        it("when there is a skill in the Assistant Skills configuration file", async function () {
            const config = {
                appSettingsFile: resolve(__dirname, "mocks", "appsettings", "noAuthConnectionAppSettingsWithConnectedSkill.json"),
                logger: this.logger
            };

            await this.lister.listSkill(config);
            const messageList = this.logger.getMessage();
            
            strictEqual(messageList[messageList.length - 1], `The skills already connected to the assistant are the following:
\t- connectableSkill
\t- testSkill`);
		});
	});
});
