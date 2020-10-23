using System.Collections.Generic;
using System.IO;
using System.Xml;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace VSIX.Tests
{
    [TestClass]
    public class GeneratorVirtualAssistantTests
    {
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
            "General.lu", "General.lu", "General.lu", "Chitchat.qna", "Faq.qna", "Chitchat.qna", "Faq.qna", "Chitchat.qna", "Faq.qna", "Chitchat.qna", "Faq.qna",
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

        private readonly string rootDirectory = "..\\..\\..\\..\\VA\\VA\\";

        private readonly string _vaProjectTemplatePath = @"..\..\..\..\VA\VA\VAProjectTemplate.vstemplate";
        private HashSet<string> filesPlaceholders;
        private XmlDocument templateFile;
        private XmlNodeList foldersList;
        private XmlNodeList filesList;


        [TestInitialize]
        public virtual void Initialize()
        {
            templateFile = new XmlDocument();
            templateFile.Load(_vaProjectTemplatePath);
            foldersList = templateFile.GetElementsByTagName("Folder");
            filesList = templateFile.GetElementsByTagName("ProjectItem");
        }

        [TestMethod]
        public void Test_Count_Folder()
        {
            Assert.AreEqual(commonDirectories.Count, foldersList.Count);
        }

        [TestMethod]
        public void Test_Folders_Names()
        {
            foreach (XmlNode folder in foldersList)
            {
                CollectionAssert.Contains(commonDirectories, folder.Attributes["TargetFolderName"].Value);
            }
        }

        [TestMethod]
        public void Test_Count_Files()
        {
            // Adding + 1, in order to take in account the .csproj file
            int filesCount = filesList.Count + 1;
            Assert.AreEqual(commonFiles.Count, filesCount);
        }

        [TestMethod]
        public void Test_Files_Names()
        {
            foreach (XmlNode file in filesList)
            {
                CollectionAssert.Contains(commonFiles, file.Attributes["TargetFileName"].Value);
            }
        }

        [TestMethod]
        public void Test_Replace_Placeholder()
        {
            filesPlaceholders = new HashSet<string>();
            foreach (XmlNode folder in foldersList)
            {
                string path = Path.Combine(rootDirectory, folder.Attributes["TargetFolderName"].Value);
                SubFolders(folder.ChildNodes, path);
            }

            foreach (XmlNode file in filesList)
            {
                if (filesPlaceholders.Contains(file.InnerText))
                {
                    bool replaceParameters = bool.Parse(file.Attributes["ReplaceParameters"].Value);
                    Assert.IsTrue(replaceParameters && true);
                }
            }
        }

        public void SubFolders(XmlNodeList foldersList, string path)
        {
            foreach (XmlNode subFolder in foldersList)
            {
                bool hasAttribue = subFolder.Attributes["TargetFolderName"] != null;
                if (hasAttribue)
                {
                    string pathFile = Path.Combine(path, subFolder.Attributes["TargetFolderName"].Value);
                    if (subFolder.FirstChild.Name.Equals("Folder"))
                    {
                        SubFolders(subFolder.ChildNodes, pathFile);
                    }

                    for (int j = 0; j < subFolder.ChildNodes.Count; j++)
                    {
                        bool hasAttribueChild = subFolder.ChildNodes[j].Attributes["TargetFileName"] != null;
                        if (hasAttribueChild)
                        {
                            var curretPathFile = Path.Combine(pathFile, subFolder.ChildNodes[j].InnerText);
                            if (File.Exists(curretPathFile))
                            {
                                VerifyPlaceholder(curretPathFile, subFolder.ChildNodes[j].Attributes["TargetFileName"].Value);
                            }

                            curretPathFile = Path.Combine(curretPathFile, subFolder.Attributes["TargetFolderName"].Value);
                        }
                    }
                }
                else
                {
                    bool hasAttribueTargetFileName = subFolder.Attributes["TargetFileName"] != null;
                    if (hasAttribueTargetFileName)
                    {
                        string targetFileName = subFolder.InnerText;
                        string pathFile = Path.Combine(path, targetFileName);
                        if (File.Exists(pathFile))
                        {
                            VerifyPlaceholder(pathFile, targetFileName);
                        }
                    }
                }
            }
        }

        public void VerifyPlaceholder(string pathFile, string file)
        {
            using (StreamReader sr = new StreamReader(pathFile))
            {
                string contents = sr.ReadToEnd();
                if (contents.Contains("$safeprojectname$"))
                {
                    filesPlaceholders.Add(file);
                }
            }
        }
    }
}
