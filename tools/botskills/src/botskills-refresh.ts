/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import * as program from 'commander';
import { join, resolve } from 'path';
import { RefreshSkill } from './functionality';
import { ConsoleLogger, ILogger} from './logger';
import { IRefreshConfiguration } from './models';
import { sanitizePath, validatePairOfArgs } from './utils';

const logger: ILogger = new ConsoleLogger();

function showErrorHelp(): void {
    program.outputHelp((str: string): string => {
        logger.error(str);

        return '';
    });
    process.exit(1);
}

program.Command.prototype.unknownOption = (flag: string): void => {
    logger.error(`Unknown arguments: ${ flag }`);
    showErrorHelp();
};

program
    .name('botskills refresh')
    .description('Refresh the connected skills.')
    .option('--cs', 'Determine your assistant project structure to be a CSharp-like structure')
    .option('--ts', 'Determine your assistant project structure to be a TypeScript-like structure')
    .option('--dispatchFolder [path]', '[OPTIONAL] Path to the folder containing your assistant\'s \'.dispatch\' file (defaults to \'./deployment/resources/dispatch\' inside your assistant folder)')
    .option('--outFolder [path]', '[OPTIONAL] Path for any output file that may be generated (defaults to your assistant\'s root folder)')
    .option('--lgOutFolder [path]', '[OPTIONAL] Path for the Luis Generate output (defaults to a \'service\' folder inside your assistant\'s folder)')
    .option('--cognitiveModelsFile [path]', '[OPTIONAL] Path to your Cognitive Models file (defaults to \'cognitivemodels.json\' inside your assistant\'s folder)')
    .option('--verbose', '[OPTIONAL] Output detailed information about the processing of the tool')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action((cmd: program.Command, actions: program.Command): undefined => undefined);

const args: program.Command = program.parse(process.argv);

if (process.argv.length < 3) {
    program.help();
    process.exit(0);
}

const lgLanguage: string = args.cs ? 'cs' : 'ts';
const outFolder: string = args.outFolder ? sanitizePath(args.outFolder) : resolve('./');
const dispatchFolder: string = args.dispatchFolder ? sanitizePath(args.dispatchFolder) : join(outFolder, 'Deployment', 'Resources', 'Dispatch');
const lgOutFolder: string = args.lgOutFolder ? sanitizePath(args.lgOutFolder) : join(outFolder, (args.ts ? join('src', 'Services', 'DispatchLuis.ts') : join('Services', 'DispatchLuis.cs')));
const cognitiveModelsFile: string = args.cognitiveModelsFile || join(outFolder, (args.ts ? join('src', 'cognitivemodels.json') : 'cognitivemodels.json'));

logger.isVerbose = args.verbose;

// Validation of arguments
// cs and ts validation
const csAndTsValidationResult: string = validatePairOfArgs(args.cs, args.ts);
if (csAndTsValidationResult) {
    logger.error(
        csAndTsValidationResult.replace('{0}', 'cs')
            .replace('{1}', 'ts')
    );
    process.exit(1);
}

// Initialize an instance of IRefreshConfiguration to send the needed arguments to the refreshskill function
const configuration: IRefreshConfiguration = {
    dispatchFolder: dispatchFolder,
    lgLanguage: lgLanguage,
    outFolder: outFolder,
    lgOutFolder: lgOutFolder,
    cognitiveModelsFile: cognitiveModelsFile,
    logger: logger
};

new RefreshSkill(configuration as IRefreshConfiguration, logger).refreshSkill();
