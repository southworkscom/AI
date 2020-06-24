/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

const { QnAMakerDialog } = require("botbuilder-ai");
const { MainDialog } = require("../../../lib/dialogs/mainDialog");
const join = require('path').join;
const readFileSync = require('fs').readFileSync;
const nock = require('nock');

export class MockMainDialog extends MainDialog {        
    constructor(
        services,
        templateManager,
        userProfileState,
        previousResponseAccessor,
        onBoardingDialog,
        switchSkillDialog,
        skillDialogs,
        skillsConfig,
        activeSkillProperty) {
        super(services,
            templateManager,
            userProfileState,
            previousResponseAccessor,
            onBoardingDialog,
            switchSkillDialog,
            skillDialogs,
            skillsConfig,
            activeSkillProperty);

        // All calls to Generate Answer regardless of host or knowledgebaseId are captured
        this.mockHttpHandler = nock('/.*/')
            .post('knowledgebases/*/generateanswer')
            .replyWithFile(200, JSON.parse(
                this.getResponse('QnAMaker_NoAnswer.json')), {
                    'Content-Type': 'application/json'
                }
            );

        this.templateManager = templateManager;        
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
            return new QnAMakerDialog(
                qnaEndpoint.knowledgeBaseId,
                qnaEndpoint.endpointKey,
                qnaEndpoint.host,
                this.templateManager.generateActivityForLocale('UnsupportedMessage'),
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                knowledgebaseId,
                this.mockHttpHandler);
        }
        else {
            return undefined;
        }
    }

    getResponse(fileName) {
        const path = this.getFilePath(fileName);
        return readFileSync(path, 'UTF8');
    }

    getFilePath(fileName) {
        return join(__dirname, '..', 'testData', fileName);
    }
}

exports.MockMainDialog = MockMainDialog;