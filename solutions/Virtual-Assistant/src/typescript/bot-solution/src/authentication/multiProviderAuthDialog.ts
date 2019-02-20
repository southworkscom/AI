import { ComponentDialog } from 'botbuilder-dialogs';
import { SkillConfigurationBase } from '../skills';

export class MultiProviderAuthDialog extends ComponentDialog {

    constructor(skillConfiguration: SkillConfigurationBase) {
        super(MultiProviderAuthDialog.name);
    }
}
