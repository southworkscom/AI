import { TelemetryClient } from "applicationinsights";

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License
   
   export class TelemetryBotDependencyExtension
    {
        public static readonly DependencyType: string = "Bot";
        /** 
        *  Send information about an dependency in the bot application.
        * </summary>
        * @typeparam TResult The type of the return value of the method that this delegate encapsulates.</typeparam>
        * @param telemetryClient The <seealso cref="TelemetryClient"/>.</param>
        * @param actionEncapsulates a method that has no parameters and returns a value of the type specified by the TResult parameter.</param>
        * @param dependencyNameName of the command initiated with this dependency call. Low cardinality value.
        * Examples are stored procedure name and URL path template.</param>
        * @param dependencyData Command initiated by this dependency call. For example, Middleware.</param>
        * <returns>The return value of the method that this delegate encapsulates.</returns>
        * <remarks>The action delegate will be timed and a Application Insights dependency record will be created.</remarks>
        */
       public static trackBotDependency<TResult>(telemetryClient: TelemetryClient, action: () => TResult, dependencyName: string, dependencyData: string): TResult {
          // return action();

           if (dependencyName == null)
           {
               throw new Error (nameof(dependencyName));
           }
           var timer =  
           var startTime = 0; 
           var endTime = 0;
           var success = true;
           timer.Start();
           try
           {
               return action();
           }
           catch (Exception)
           {
               success = false;
               throw;
           }
           finally
           {
               timer.Stop();
               // Log the dependency into Application Insights
               telemetryClient.TrackDependency (DependencyType, dependencyName, dependencyData, startTime, timer.Elapsed, success);
           }
       }
       }
    }
