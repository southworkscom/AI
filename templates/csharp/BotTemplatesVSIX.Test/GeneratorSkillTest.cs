using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Collections.Generic;
using System.Xml;

namespace BotTemplatesVSIX.Test
{
    [Xunit.VsTestSettings(UIThread = true)]
    public class GeneratorSkillTest
    {
        private readonly string _vaProjectTemplatePath = @"..\..\..\..\Skill\Skill\SkillProjectTemplate.vstemplate";
        private readonly List<string> commonDirectories = new List<string>()
            {
                "Connected Services", "Deployment", "Application Insights", "Properties", "wwwroot", "Adapters",
                "Authentication", "Bots", "Controllers", "Deployment", "Resources", "LU", "manifest",
                "de-de", "en-us", "es-es", "fr-fr", "it-it", "zh-cn",
                "Scripts", "Dialogs", "Models", "Pipeline", "Responses", "Services", "TokenExchange"
            };

        [Xunit.VsFact]
        public void Test_Generator_Skill_Template()
        {
            XmlDocument templateFile = new XmlDocument();
            templateFile.Load(_vaProjectTemplatePath);
            XmlNodeList foldersList = templateFile.GetElementsByTagName("Folder");
            Assert.AreEqual(commonDirectories.Count, foldersList.Count);
            foreach (XmlNode folder in foldersList)
            {
                CollectionAssert.Contains(commonDirectories, folder.Attributes["TargetFolderName"].Value);
            }
            //CollectionAssert.AreEquivalent(commonDirectories, foldersList.);
            /*foreach (XmlNode folder in foldersList)
            {
                output.WriteLine("\t {0}", folder.Attributes["TargetFolderName"].Value);
            }

            XmlNodeList filesList = templateFile.GetElementsByTagName("ProjectItem");
            List<string> replacePlaceholderFiles = new List<string>();
            List<string> notReplacePlaceholderFiles = new List<string>();
            output.WriteLine("The following files: ");
            foreach (XmlNode folder in filesList)
            {
                bool replaceParameters = bool.Parse(folder.Attributes["ReplaceParameters"].Value);
                if (replaceParameters)
                {
                    replacePlaceholderFiles.Add(folder.Attributes["TargetFileName"].Value);
                }
                else
                {
                    notReplacePlaceholderFiles.Add(folder.Attributes["TargetFileName"].Value);
                }
            }

            output.WriteLine("\t Will replace the placeholder: ");
            foreach (string file in replacePlaceholderFiles)
            {
                output.WriteLine("\t \t {0}", file);
            }

            output.WriteLine("\t Will not replace the placeholder: ");
            foreach (string file in notReplacePlaceholderFiles)
            {
                output.WriteLine("\t \t {0}", file);
            }*/
        }
    }
}
