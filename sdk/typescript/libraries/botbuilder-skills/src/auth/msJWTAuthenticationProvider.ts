/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

// Extends verify definitions to be compatible with callback handler to resolve signingKey
declare module 'jsonwebtoken' {
    export type signingKeyResolver = (headers: jwks.Headers, cb: (err: Error, signingKey: string) => void) => void;

    export function verify(
        token: string,
        secretOrPublicKey: signingKeyResolver,
        callback?: VerifyCallback
    ): void;
}

import { HttpOperationResponse, ServiceClient } from '@azure/ms-rest-js';
import { ClaimsIdentity } from 'botframework-connector';
import { signingKeyResolver, verify } from 'jsonwebtoken';
import * as jwks from 'jwks-rsa';
import { IAuthenticationProvider } from './authenticationProvider';

export class MsJWTAuthenticationProvider implements IAuthenticationProvider {
    // private static openIdConfig: OpenIdConnectConfiguration;
    private readonly openIdMetadataUrl: string = 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration';
    private readonly microsoftAppId: string;

    public constructor (microsoftAppId: string, openIdMetadataUrl: string = 'undefined') {

        if (microsoftAppId === undefined || microsoftAppId.trim().length === 0) {
            throw new Error('MicrosoftAppId is undefined');
        }
        this.microsoftAppId = microsoftAppId;

        if (openIdMetadataUrl !== undefined && openIdMetadataUrl.trim().length > 0) {
            this.openIdMetadataUrl = openIdMetadataUrl;
        }
    }

    /* PENDING
        var configurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            _openIdMetadataUrl,
            new OpenIdConnectConfigurationRetriever()
            );
        openIdConfig = configurationManager.GetConfigurationAsync(CancellationToken.None).GetAwaiter().GetResult();
    */
    public authenticate(authHeader: string): ClaimsIdentity {
        /* PENDING
            try
            {
                var validationParameters =
                    new TokenValidationParameters
                    {
                        ValidateIssuer = false, // do not validate issuer
                        ValidAudiences = new[] { _microsoftAppId },
                        IssuerSigningKeys = openIdConfig.SigningKeys,
                    };

                var handler = new JwtSecurityTokenHandler();
                var user = handler.ValidateToken(authHeader.Replace("Bearer ", string.Empty), validationParameters, out var validatedToken);

                return user.Identities.OfType<ClaimsIdentity>().FirstOrDefault();
            }
            catch
            {
                return null;
            }
        */

       return new ClaimsIdentity([], false);
    }
}
