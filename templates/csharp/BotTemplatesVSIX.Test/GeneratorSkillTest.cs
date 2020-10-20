using System.Collections.Generic;
using System.Xml;
using Xunit;
using Xunit.Abstractions;

namespace BotTemplatesVSIX.Test
{
    [VsTestSettings(UIThread = true)]
    public class GeneratorSkillTest
    {
        private readonly ITestOutputHelper output;
        private readonly string _vaProjectTemplatePath = @"..\..\..\..\Skill\Skill\SkillProjectTemplate.vstemplate";

        public GeneratorSkillTest(ITestOutputHelper output)
        {
            this.output = output;
        }

        [VsFact]
        public void Test_Generator_Skill_Template()
        {
            XmlDocument templateFile = new XmlDocument();
            templateFile.Load(_vaProjectTemplatePath);
            XmlNodeList foldersList = templateFile.GetElementsByTagName("Folder");
            output.WriteLine("The generator Bot Skill template");
            output.WriteLine("Should create the following folders: ");
            foreach (XmlNode folder in foldersList)
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
            }
        }
    }
}
