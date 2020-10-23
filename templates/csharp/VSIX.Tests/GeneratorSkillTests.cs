using System.Collections.Generic;
using System.IO;
using System.Xml;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace VSIX.Tests
{
    [TestClass]
    public class GeneratorSkillTests
    {
        private readonly List<string> commonDirectories = new List<string>()
            {
                "Connected Services", "Application Insights", "Properties", "wwwroot", "manifest", "Adapters",
                "Authentication", "Bots", "Controllers", "Deployment", "Resources", "de-de", "en-us", "es-es",
                "fr-fr", "it-it", "zh-cn", "LU", "Scripts", "Dialogs", "Extensions", "Models", "Pipeline",
                "Responses", "Services"
            };

        private readonly List<string> commonFiles = new List<string>()
        {
            "Skill.csproj", "ConnectedService.json", "launchSettings.json", "default.htm", "DefaultAdapter.cs", "AllowedCallersClaimsValidator.cs",
            "DefaultActivityHandler.cs", "BotController.cs", "General.lu", "General.lu", "General.lu", "manifest-1.0.json", "manifest-1.1.json",
            "General.lu", "General.lu", "General.lu", "$safeprojectname$.lu", "$safeprojectname$.lu", "$safeprojectname$.lu",
            "$safeprojectname$.lu", "$safeprojectname$.lu", "$safeprojectname$.lu", "parameters.template.json", "template.json", "deploy.ps1",
            "deploy_cognitive_models.ps1", "luis_functions.ps1", "publish.ps1", "qna_functions.ps1", "update_cognitive_models.ps1",
            "MainDialog.cs", "SampleAction.cs", "SampleDialog.cs", "SkillDialogBase.cs", "$safeprojectname$.yml", "ITurnContextEx.cs",
            "SkillState.cs", "StateProperties.cs", "AllResponses.lg", "AllResponses.de-de.lg", "AllResponses.es-es.lg",
            "AllResponses.fr-fr.lg", "AllResponses.it-it.lg", "AllResponses.zh-cn.lg", "MainResponses.lg", "MainResponses.de-de.lg",
            "MainResponses.es-es.lg", "MainResponses.fr-fr.lg", "MainResponses.it-it.lg", "MainResponses.zh-cn.lg",
            "SampleResponses.lg", "SampleResponses.de-de.lg", "SampleResponses.es-es.lg", "SampleResponses.fr-fr.lg", "SampleResponses.it-it.lg", "SampleResponses.zh-cn.lg",
            "BotSettings.cs", "GeneralLuis.cs", ".filenesting.json", "appsettings.json", "cognitivemodels.json", "Program.cs", "BotServices.cs",
            "readme.md", "Startup.cs", "$safeprojectname$Luis.cs"
        };

        private readonly string rootDirectory = "..\\..\\..\\..\\Skill\\Skill\\";

        private readonly string _vaProjectTemplatePath = @"..\..\..\..\Skill\Skill\SkillProjectTemplate.vstemplate";
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
