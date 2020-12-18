# Functional Tests for C# Virtual Assistant
Follow these [steps](https://microsoft.github.io/botframework-solutions/solution-accelerators/tutorials/enable-continuous-integration/csharp/4-configure-build-steps/) to configure the functional tests using the `Nightly-Dotnet-VirtualAssistantToSkill.yml`.

Currently, adding this YAML in your Azure DevOps organization enables you to **validate** the following scenarios using the last preview version of the packages from the daily builds:
- Use of [dispatch](https://botbuilder.myget.org/feed/botbuilder-tools-daily/package/npm/botdispatch) and [botskills](https://botbuilder.myget.org/feed/aitemplates/package/npm/botskills)
- Use of [@microsoft/botframework-cli](https://botbuilder.myget.org/feed/botframework-cli/package/npm/@microsoft/botframework-cli)
- Use of [SDK](https://botbuilder.myget.org/gallery/botbuilder-v4-dotnet-daily) incorporated in the C# Virtual Assistant
- Deployment of the C# Virtual Assistant and C# Skill
- Communication with the C# Virtual Assistant and C# Skill
- Connect Virtual Assistant with a Skill, both in C#

## Prerequisite
- Sign up for Azure DevOps
- Log in your [Azure DevOps’](https://dev.azure.com/) organization
- Have a YAML file in a repository to generate the build pipeline

## Variables

| Type | Variable | Description |
|------|----------|-------------|
| Azure Variable | BotBuilderPackageVersion | Version of the BotBuilder package |
|      | BuildConfiguration | Build configuration such as Debug or Release |
|      | BuildPlatform | Build platform such as Win32, x86, x64 or any cpu |
|      | system.debug | System variable that can be set by the user. Set this to true to run the release in [debug](https://docs.microsoft.com/en-us/azure/devops/pipelines/release/variables?view=azure-devops&tabs=batch#debug-mode) mode to assist in fault-finding |
| Bot Variable | AzureSubscription | The name of your Azure Subscription |
|      | BotLanguage | The supported language of your bot |
|      | endpoints.0.endpointUrl | Skill Manifest endpoint url |
|      | endpoints.0.msAppId | Skill Manifest Microsoft App Id |
|      | Location | Location of the bot |
|      | LuisAuthoringRegion | Location of the LUIS apps |
|      | SkillBotAppId | Microsoft App Id of the Skill bot |
|      | SkillBotAppPassword | Microsoft App Password of the Skill bot |
|      | SkillBotName | Name of the Skill bot |
|      | VirtualAssistantBotAppId | Microsoft App Id of the Virtual Assistant bot |
|      | VirtualAssistantBotAppPassword | Microsoft App Password of the Virtual Assistant bot |
|      | VirtualAssistantBotName | Name of the Virtual Assistant bot |

Last but not least, as the `Azure Subscription` is related to the container where the resources are created, it should be replaced with your Agent pool.

> **Note**: system.debug, BuildPlatform and BuildConfiguration variables should be configured checking the "Let users override this value when running this pipeline" option.

## Steps contained in the YAML
**Virtual Assistant Job:**
1. Prepare: Delete preexisting resources
1. Prepare: Use Node 10.16.3
1. Prepare: Use NuGet 4.9.1
1. Prepare: Install preview dispatch
1. Prepare: Install preview botframework-cli
1. Prepare: Install yeoman, generator-bot-virtualassistant
1. Prepare: Install preview botskills
1. Prepare: Get CLI and SDK versions
1. Prepare: Update SDK to latest preview version
1. Prepare: Build project
1. Test: Execute unit tests
1. Deploy: Run deploy script
1. Deploy: VA - Get variables from appsettings
1. Test: VA - Connect SkillSample
1. Build: VA - Build project
1. Test: VA - Publish with connected Skill
1. Test: Create Direct Line registration
1. Test: VA - Get channel secrets
1. Test: Execute functional tests
1. Prepare: Delete preexisting resources
1. Debug: Show log contents
1. Debug: dir workspace


**Skill Job:**
1. Prepare: Delete preexisting resources
1. Prepare: Use Node 10.16.3
1. Prepare: Use NuGet 4.9.1
1. Prepare: Install preview dispatch
1. Prepare: Install preview botframework-cli
1. Prepare: Install yeoman, generator-bot-virtualassistant
1. Prepare: Install preview botskills
1. Prepare: Get CLI and SDK versions
1. Prepare: Update SDK to latest preview version
1. Prepare: Replace Skill manifest properties
1. Prepare: Build project
1. Test: Execute unit tests
1. Deploy: Run deploy script
1. Deploy: Skill - Get variables from appsettings
1. Test: Create Direct Line registration
1. Test: Skill - Get channel secrets
1. Test: Execute functional tests
1. Prepare: Delete preexisting resources
1. Debug: Show log contents

> **NOTE:** The Virtual Assistant job depends of the Skill job.

## Further Reading
- [What is Azure Pipelines](https://docs.microsoft.com/en-us/azure/devops/pipelines/get-started/what-is-azure-pipelines?view=azure-devops)
- [Define variables - Azure Pipelines](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/variables?view=azure-devops&tabs=yaml%2Cbatch)