import { Client } from "twitter-api-sdk";
import * as fs from 'fs';

const DATA_FILE_NAME = "data.csv"
const QUERY = `@1Password lang:en`
const BEARER_TOKEN = process.env.BEARER_TOKEN
const client = new Client(BEARER_TOKEN);


async function findTweetsById(ids) {
    const { data, includes } = await client.tweets.findTweetsById({
    "ids": ids,
    "tweet.fields": [
      "attachments",
      "public_metrics",
      "created_at",
      "conversation_id"
    ],
    "expansions": [
      "attachments.media_keys"
    ],
    "media.fields": [
      "alt_text",
      "duration_ms",
      "preview_image_url",
      "public_metrics",
      "variants"
    ]
  })
  if (!data) throw new Error("Couldn't retrieve Tweet");

  // dump whole JSON data objects
  console.log("data", JSON.stringify(data, null, 1));
  console.log("includes", JSON.stringify(includes, null, 1));

  return data
}

async function populateThreadImpressionsAndEngagementForTweets(tweets) {
    for (let i = 0; i < tweets.length; i++) {
      tweets[i].generated_impressions = 0
      tweets[i].generated_engagement = 0
      if(tweets[i].public_metrics.reply_count === 0) continue
      var convId = tweets[i].conversation_id

      console.log("Conversation id:" + convId)

      const { data, includes } = await client.tweets.tweetsRecentSearch({
        "query": "conversation_id:"+convId,
        "tweet.fields": [
          "public_metrics",
          "created_at",
          "conversation_id",
        ],
        "max_results": 20
        //max_results=100&start_time=2019-01-01T17:00:00Z&end_time=2020-12-12T01:00:00Z
      })
      if(!data)continue

      //console.log("nesteddd", JSON.stringify(data, null, 1));
      
      for (let j = 0; j < data.length; j++) { 
        tweets[i].generated_impressions += data[j].public_metrics.impression_count
        tweets[i].generated_engagement += data[j].public_metrics.like_count + data[j].public_metrics.reply_count + data[j].public_metrics.retweet_count
      }
    }
}


async function searchRecentTweetsByQuery(query, pagination_token, limit) {
    if(limit === 9) return [] 
    var params = {
      "query": query,
      "tweet.fields": [
        "attachments",
        "public_metrics",
        "created_at",
        "conversation_id",
        "context_annotations",
        "entities"
      ],
      "expansions": [
        "attachments.media_keys"
      ],
      "media.fields": [
        "alt_text",
        "duration_ms",
        "preview_image_url",
        "public_metrics",
        "variants"
      ],
      "max_results": 100,
      //max_results=100&start_time=2019-01-01T17:00:00Z&end_time=2020-12-12T01:00:00Z
    }

    if(pagination_token) {
      params.pagination_token = pagination_token
    }


    const res = await client.tweets.tweetsRecentSearch(params)
    if (!res || !res.data) throw new Error("Couldn't retrieve Tweet");
    
    // dump whole JSON data objects
    // console.log("data", JSON.stringify(res.data, null, 1));
    // console.log("includes", JSON.stringify(includes, null, 1));
    console.log(res.data.length)

    await populateThreadImpressionsForTweets(res.data)

    var data = res.data
    if(res.meta && res.meta.next_token) {
      console.log("HHMMMMMM")
      var additional_data = await searchRecentTweetsByQuery(query, res.meta.next_token, limit + 1)
      console.log("BAAAAAA")
      data = data.concat(additional_data)
    }
    
    return data
}

async function getFilteredStreamFromQuery() {

    await client.tweets.addOrDeleteRules(
      {
        add: [
          { value: "cat has:media", tag: "cats with media" },
          { value: "cat has:media -grumpy", tag: "happy cats with media" },
          { value: "meme", tag: "funny things" },
          { value: "meme has:images" },
        ],
      }
    );
    const rules = await client.tweets.getRules();
    console.log(rules);
    const stream = client.tweets.searchStream({
      "tweet.fields": ["author_id", "geo"],
    });
    for await (const tweet of stream) {
      console.log(tweet.data?.author_id);
    }
  }

  function convertJSONToCSV(data) {
    var csv = "id, link, content, created_at, views, likes, retweets, comments, total_generated_impressions, total_generated_engagement\n"
    for (let i = 0; i < data.length; i++) { 
      var d = data[i];
      
      csv += d.id + 
      ", " + "https://twitter.com/twitter/status/"+ d.id + 
      ", " + "\""+ d.text.replace(/\s+/g, ' ').trim().replaceAll('"', '\'') + "\"" +
      ", " + d.created_at.substring(0, 10) +
      ", " + d.public_metrics.impression_count + 
      ", " + d.public_metrics.like_count +
      ", " + d.public_metrics.retweet_count + 
      ", " + d.public_metrics.reply_count +
      ", " + d.generated_impressions + 
      ", " + d.generated_engagement + '\n'
    }

    console.log(csv)

    return csv
  }


  function writeToFile(data) {

    // Write data in 'data.csv' .
    fs.writeFile(DATA_FILE_NAME, data, (err) => {
          
        // In case of a error throw err.
        if (err) throw err;
    })
  }


  async function main() {
    // const more_comprehensive_query = `context:47.10045019101 OR #1Password OR @1Password OR "shell plugins" OR "Shell Plugins" OR "1Password"`
    var data = await searchRecentTweetsByQuery(QUERY, null, 0)
    var csv = convertJSONToCSV(data)
    writeToFile(csv)
  }

  main()