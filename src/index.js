require("dotenv").config();
const requestPromise = require("request-promise");
const checksum = require("checksum");
const cheerio = require("cheerio");

// require bitly
const { BitlyClient } = require('bitly');
// create new instance of bitly to be used in application, using my access token 
const bitly = new BitlyClient(process.env.BITLY_AUTH_TOKEN, {}); 

// use my own credentials for this one - put this in a .env file later before going on GitHub
const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Zillow URL: add url here through process.env
const zillowURL = process.env.ZILLOW_URL_LA;

let bitlyURL;

// from bitly npm package documentation
async function init() {
    try {
      bitlyURL = await bitly.shorten(zillowURL);
    } catch (error) {
      throw error;
    }
    return bitlyURL;
}
  
// calling method to create short bitly link
init();
// console.log(bitlyURL.link) // this isn't defined in scope
/*
Ok great, we’re getting a list of unique ID numbers. These ID’s are the only information we care about on the page.
So let’s go back to our original plan of comparing hashes, except we’ll only hash the unique IDs:
IDs are logged out on line 21
*/

// declare a variable hash so we can save its value
let hash = "";

// checking the site URL and creating a hash using checksum package
function checkURL(siteToCheck) {
    
    return requestPromise(siteToCheck)
        .then(HTMLresponse => {

            const $ = cheerio.load(HTMLresponse);
            let apartmentString = "";
            
            $(".list-card.list-card-short").each((i, element) => {
                // gets me all the IDs of the ads on Zillow from url page.
                apartmentString += `${element.attribs.id}`
            });

            // now, check if the hash is the same as the previous hash

            // if hash variable is empty, set apartmentString as a hash equal to variable, hash.
            if (hash === "") {
                console.log("Making initial fetch...");
                hash = checksum(apartmentString);
            }

            // if hash variable and checksum(apartmentString) are NOT the same - return true, send text alert.
            if (checksum(apartmentString) !== hash) {
                // set hash variable to updated apartmentString
                hash = checksum(apartmentString);
                return true;
            }

            // else, no changes, return false
            console.log("No updated postings yet.");
            return false;
        })
        .catch(error => {
            console.log(`Could not complete fetch of ${zillowURL}: ${error}`);
        });
};

// Twilio API SMS Messaging part
function SMS({ body, to, from }) {
    client.messages.create({
        body,
        to,
        from
    }).then(() => {
        console.log(`👍 Success! Message has been sent to ${to}`);
    }).catch(err => {
        console.log(err);
    })
}



// check every 10 seconds
// doing this asynchonously so our fetch is sure to resolve
setInterval(async () => {
    // if checkURL is true, send a text message!
    if (await checkURL(zillowURL)) {
        console.log("Found a change! Sending updated text now..")

        SMS({
            body: `Look at these apartment listings! ${bitlyURL}`,
            to: process.env.CP_NUMBER,
            from: process.env.TWILIO_NUMBER
        });
    }
}, 10000);


// const accountSid = process.env.TWILIO_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;

// client.messages
//       .create({body: `Matt Asher has a skinny belly at ${zillowURL}, tehe.`, from: '+13104608664', to: '+13104608664'})
//       .then(message => console.log(message.sid));
