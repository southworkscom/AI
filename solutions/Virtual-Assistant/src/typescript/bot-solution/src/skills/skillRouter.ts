import {SkillDefinition} from './skillDefinition'

export class SkillRouter{

    private registeredSkills: SkillDefinition[];

    constructor (registeredSkills: SkillDefinition[]){
        // Retrieve any Skills that have been registered with the Bot
        this.registeredSkills = registeredSkills;
    }
    public IdentifyRegisteredSkill(skillName: string): SkillDefinition | undefined {
        
        // Did we find any skills?
        if (this.registeredSkills !== undefined)
        {
            // Identify a skill by taking the LUIS model name identified by the dispatcher and matching to the skill luis model name
            // Bug raised on dispatcher to move towards LuisModelId instead perhaps?
            const matchedSkill: SkillDefinition = <SkillDefinition> this.registeredSkills.find((s) => {return s.dispatchIntent == skillName });
            
            return matchedSkill;
        }
        else
        {
            return undefined;
        }
    }
}
