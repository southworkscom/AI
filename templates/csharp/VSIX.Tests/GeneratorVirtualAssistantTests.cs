using System.Collections.Generic;
using System.Xml;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace VSIX.Tests
{
    [TestClass]
    public class GeneratorVirtualAssistantTests
    {
        private readonly string _vaProjectTemplatePath = @"..\..\..\..\VA\VA\VAProjectTemplate.vstemplate";
        private readonly List<string> commonDirectories = new List<string>()
            {
                "Adapters", "Authentication", "Bots", "Connected Services", "Application Insights", "Controllers",
                "Deployment", "Resources", "Scripts", "LU", "QnA", "de-de", "en-us", "es-es",
                "fr-fr", "it-it", "zh-cn", "Dialogs", "Models", "Pipeline", "Responses", "Services", "TokenExchange",
                "Properties", "de-de", "en-us", "es-es", "fr-fr", "it-it", "zh-cn", "wwwroot"
            };

        private readonly List<string> commonFiles = new List<string>()
        {
            "VA.csproj", "ConnectedService.json", "launchSettings.json", "default.htm", "DefaultAdapter.cs", "AllowedCallersClaimsValidator.cs",
            "DefaultActivityHandler.cs", "BotController.cs", "SkillController.cs", "General.lu", "General.lu", "General.lu",
            "General.lu", "General.lu", "Chitchat.qna", "Faq.qna", "Chitchat.qna", "Faq.qna", "Chitchat.qna", "Faq.qna", "Chitchat.qna", "Faq.qna",
            "Chitchat.qna", "Faq.qna", "Chitchat.qna", "Faq.qna", "parameters.template.json", "template.json", "deploy.ps1",
            "deploy_cognitive_models.ps1", "luis_functions.ps1", "publish.ps1", "qna_functions.ps1", "update_cognitive_models.ps1",
            "MainDialog.cs", "OnboardingDialog.cs", "StateProperties.cs", "UserProfileState.cs", "$safeprojectname$.yml", "AllResponses.lg",
            "AllResponses.de-de.lg", "AllResponses.es-es.lg", "AllResponses.fr-fr.lg", "AllResponses.it-it.lg", "AllResponses.zh-cn.lg",
            "MainResponses.lg", "MainResponses.de-de.lg", "MainResponses.es-es.lg", "MainResponses.fr-fr.lg", "MainResponses.it-it.lg",
            "MainResponses.zh-cn.lg", "OnboardingResponses.lg", "OnboardingResponses.de-de.lg", "OnboardingResponses.es-es.lg",
            "OnboardingResponses.fr-fr.lg", "OnboardingResponses.it-it.lg", "OnboardingResponses.zh-cn.lg", "BotServices.cs",
            "BotSettings.cs", "DispatchLuis.cs", "GeneralLuis.cs", "ITokenExchangeConfig.cs", "TokenExchangeConfig.cs",
            "TokenExchangeSkillHandler.cs", ".filenesting.json", "appsettings.json", "cognitivemodels.json", "Program.cs",
            "readme.md", "Startup.cs"
        };

        [TestMethod]
        public void Test_Count_Folder()
        {
            XmlDocument templateFile = new XmlDocument();
            templateFile.Load(_vaProjectTemplatePath);
            XmlNodeList foldersList = templateFile.GetElementsByTagName("Folder");
            Assert.AreEqual(commonDirectories.Count, foldersList.Count);
        }

        [TestMethod]
        public void Test_Folders_Names()
        {
            XmlDocument templateFile = new XmlDocument();
            templateFile.Load(_vaProjectTemplatePath);
            XmlNodeList foldersList = templateFile.GetElementsByTagName("Folder");
            foreach (XmlNode folder in foldersList)
            {
                CollectionAssert.Contains(commonDirectories, folder.Attributes["TargetFolderName"].Value);
            }
        }

        [TestMethod]
        public void Test_Count_Files()
        {
            XmlDocument templateFile = new XmlDocument();
            templateFile.Load(_vaProjectTemplatePath);
            XmlNodeList filesList = templateFile.GetElementsByTagName("ProjectItem");
            Assert.AreEqual(commonFiles.Count, filesList.Count);
        }

        [TestMethod]
        public void Test_Files_Names()
        {
            XmlDocument templateFile = new XmlDocument();
            templateFile.Load(_vaProjectTemplatePath);
            XmlNodeList filesList = templateFile.GetElementsByTagName("ProjectItem");
            foreach (XmlNode file in filesList)
            {
                CollectionAssert.Contains(commonFiles, file.Attributes["TargetFileName"].Value);
            }
        }
    }
}
