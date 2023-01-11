# TwitterMetrics
A small script for measuring word of mouth marketing via tweets on certain topics.

Some not-straightforward metrics computed here:

`total_generated_impressions` : impressions gathered by all replies of tweets matching a certain query (including replies of replies)
`total_generated_engagement` : engagement (likes + comms + retweets) gathered by all replies of tweets matching a certain query (including replies of replies)

# Pre-requisites
You will need a Twitter developer app with the Essential (free) package.
Then you will need to generate yourself a BEARER_TOKEN.

# How to run
```
export BEARER_TOKEN=<your_bearer_token>
npm i && npm start // this will perform a recent search of tweets that contain the `#1Password` hashtag and save them in a csv file.
```
