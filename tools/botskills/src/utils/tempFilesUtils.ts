import fs = require("fs");
import { existsSync } from 'fs';

/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

export async function deleteTempFiles(tempFiles: string[]): Promise<void> {
    for(const file of tempFiles){
        if(existsSync(file)){
            fs.unlinkSync(file);
        }        
    }
}

