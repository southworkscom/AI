"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockMainDialog = void 0;
const botbuilder_ai_1 = require("botbuilder-ai");
const botbuilder_dialogs_1 = require("botbuilder-dialogs");
const mainDialog = require("../../../lib/dialogs/mainDialog");
const join = require('path').join;
const readFileSync = require('fs').readFileSync;
const nock = require('nock');

/**
 * Dialog providing activity routing and message/event processing.
 */
let MockMainDialog = /** @class */ (() => {
    class MockMainDialog extends mainDialog.MainDialog {
        constructor(services, templateManager, userProfileState, previousResponseAccessor, onBoardingDialog, switchSkillDialog, skillDialogs, skillsConfig, activeSkillProperty) {
            super(MainDialog.name);
            this.faqDialogId = 'faq';
            this.services = services;
            this._templateManager = templateManager;
            this.skillsConfig = skillsConfig;
            this.userProfileState = userProfileState;
            this.previousResponseAccesor = previousResponseAccessor;
            // Create state property to track the active skillCreate state property to track the active skill
            this.activeSkillProperty = activeSkillProperty;
            const steps = [
                this.onBoardingStep.bind(this),
                this.introStep.bind(this),
                this.routeStep.bind(this),
                this.finalStep.bind(this)
            ];
            this.addDialog(new botbuilder_dialogs_1.WaterfallDialog(MockMainDialog.name, steps));
            this.addDialog(new botbuilder_dialogs_1.TextPrompt(botbuilder_dialogs_1.TextPrompt.name));
            this.initialDialogId = MockMainDialog.name;
            // Register dialogs
            this.onBoardingDialog = onBoardingDialog;
            this.switchSkillDialog = switchSkillDialog;
            this.addDialog(this.onBoardingDialog);
            this.addDialog(this.switchSkillDialog);
            // Register skill dialogs
            skillDialogs.forEach((dialog) => {
                this.addDialog(dialog);
            });
            
            // All calls to Generate Answer regardless of host or knowledgebaseId are captured
            this._mockHttpHandler = nock('/.*/').post('*/knowledgebases/*/generateanswer').replyWithFile(200, JSON.parse(this.getResponse('QnAMaker_NoAnswer.json')), {
                'Content-Type': 'application/json'
            });
            super.tryCreateQnADialog(this.tryCreateQnADialog.bind(this));
        }

        /** Creates a QnAMaker dialog for the correct locale if it's not already present on the dialog stack.
         * Virtual method enables test mock scenarios.
         * @param knowledgebaseId - Knowledgebase Identifier.
         * @param cognitiveModels - CognitiveModelSet configuration information.
         * @returns QnAMakerDialog instance.
         */
        tryCreateQnADialog(knowledgebaseId, cognitiveModels) {
            const qnaEndpoint = cognitiveModels.qnaConfiguration.get(knowledgebaseId);
            if (qnaEndpoint === undefined) {
                throw new Error(`Could not find QnA Maker knowledge base configuration with id: ${knowledgebaseId}.`);
            }
            // QnAMaker dialog already present on the stack?
            if (this.dialogs.find(knowledgebaseId) === undefined) {
                return new botbuilder_ai_1.QnAMakerDialog(qnaEndpoint.knowledgeBaseId, qnaEndpoint.endpointKey, qnaEndpoint.host, this.templateManager.generateActivityForLocale('UnsupportedMessage'), undefined, this.templateManager.generateActivityForLocale('QnaMakerAdaptiveLearningCardTitle').text, this.templateManager.generateActivityForLocale('QnaMakerNoMatchText').text, undefined, undefined, undefined, knowledgebaseId);
            }
            else {
                return undefined;
            }
        }

        getFilePath(fileName) {
            return join(__dirname, '..', 'testData', fileName);
        }

        getResponse(fileName) {
            const path = this.getFilePath(fileName);
            return readFileSync(path, 'UTF8');
        }
    }
    // Conversation state property with the active skill (if any).
    MockMainDialog.activeSkillPropertyName = `${typeof (MockMainDialog).name}.ActiveSkillProperty`;
    return MockMainDialog;
})();
exports.MockMainDialog = MockMainDialog;