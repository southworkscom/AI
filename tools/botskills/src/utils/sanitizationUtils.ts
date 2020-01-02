/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

const regexTrailingBackslash: RegExp = /.*?(\\)+$/;

/**
 * @param path Path to sanitize.
 * @returns Returns a path which is sanitized
 */
export function sanitizePath(path: string): string {
    if (regexTrailingBackslash.test(path)) {
        return path.substring(0, path.length - 1);
    }

    return path;
}

/**
 * @param path Path to add quotes around in case it has spaces.
 * @returns Returns a path with quotes
 */
export function wrapPathWithQuotes(path: string): string {
    return `"${path}"`;
}

/**
 * @param endpoint URL of the remove manifest endpoint.
 * @param inlineUtterances Value of the --inlineUtterances parameter.
 * @returns Returns an endpoint based on the --inlineUtterances parameter.
 */
export function validateRemoteEndpoint(endpoint: string, inlineUtterances: boolean): string {
    const paramName: string = 'inlineUtterancesSources';
    const url: string = endpoint.split('?')[0] + '?';
    const urlParams: URLSearchParams = new URL(endpoint).searchParams;
    const hasParam: boolean = urlParams.has(paramName);

    if (inlineUtterances && hasParam) {
        urlParams.set(paramName, 'true');
    } else if (inlineUtterances && !hasParam) {
        urlParams.append(paramName, 'true');
    } else if (hasParam) {
        urlParams.delete(paramName);
    }

    return url + urlParams.toString();
}