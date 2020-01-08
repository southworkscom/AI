/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

const { strictEqual } = require("assert");
const { join } = require("path");
const { SkillLuis } = require(join(__dirname, "helpers", "skillLuis"));
const { LuisRecognizerEx } = require(join("..", "lib", "extensions", "luisRecognizerEx"));
const { SentimentType } = require(join("..", "lib", "models", "sentimentType"));
const sentiment = "sentiment";

describe("luis recognize extensions", function() {
    describe("get sentiment info with sentiment enabled", function() {
        it("should return a sentiment type and its score", function(){
            const myMap = new Map();
            myMap.set(sentiment, "{\"label\": \"positive\", \"score\": 0.91}");
            
            const skillLuis = new SkillLuis(myMap);

            const [type, score] = LuisRecognizerEx.getSentimentInfo(skillLuis,
                (skillLuis) => {
                  return skillLuis.properties;  
                } 
            );
            strictEqual(SentimentType.Positive, type);
            strictEqual(0.91, score);
        });
    });

    describe("get sentiment info with sentiment not enabled", function() {
        it("should return a neutral sentiment and no score", function(){
            const myMap = new Map();
            const skillLuis = new SkillLuis(myMap);

            const [type, score] = LuisRecognizerEx.getSentimentInfo(skillLuis,
                (skillLuis) => {
                  return skillLuis.properties;  
                } 
            );
            strictEqual(SentimentType.None, type);
            strictEqual(0.0, score);
        });
    });
});