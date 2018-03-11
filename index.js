require("dotenv").config({
  path: __dirname + "/.env"
});
var config = {
  API_KEY: process.env.API_KEY || "",
  API_SECRET: process.env.API_SECRET || "",
  TO_NUMBER: process.env.TO_NUMBER || "",
  MEDIA_ID: process.env.MEDIA_ID || "",
  APP_ID: process.env.APP_ID || "",
  PRIVATE_KEY: process.env.PRIVATE_KEY || "",
  SERVER: process.env.SERVER || "",
  DEBUG: process.env.DEBUG === "true"
};
module.exports = config;

const Nexmo = require("nexmo");
const nexmo = new Nexmo({
  apiKey: config.API_KEY,
  apiSecret: config.API_SECRET,
  applicationId: config.APP_ID,
  privateKey: config.PRIVATE_KEY
});
var STATUS = "available";
const app = require("express")();
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
const server = app.listen(process.env.PORT || 3000, () => {
  console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
});

app.get("/answer", function(req, res) {
  if (STATUS.toLowerCase() === "available") {
    const ncco = [{
        "action": "talk",
        "text": "Please wait while we connect you."
      },
      {
        "action": "connect",
        "eventUrl": [config.SERVER + "/event"],
        "from": req.query.from,
        "endpoint": [{
          "type": "phone",
          "number": config.TO_NUMBER
        }]
      }
    ];
    res.json(ncco);
  } else {
    const ncco = [{
        "action": "talk",
        "voiceName": "Jennifer",
        "text": "Hi, " + STATUS + " Please leave your name and quick message after the tone, then press #."
      },
      {
        "action": "record",
        "eventUrl": [config.SERVER + "/record?from=" + req.query.from],
        "endOnSilence": "3",
        "endOnKey": "#",
        "beepStart": "true"
      },
      {
        "action": "talk",
        "voiceName": "Jennifer",
        "text": "Thank you for your message. Bye!"
      }
    ];
    res.json(ncco);
  }
});

app.post("/record", (req, res) => {
let audioURL = req.body.recording_url;
let audioFile = "recordings/" + req.query.from + "_" + audioURL.split("/").pop() + ".mp3";
console.log(audioFile);
nexmo.files.save(audioURL, audioFile, (err, response) => {
  if(err) console.log(err);
if(response) {console.log("The audio is downloaded successfully!");}
});
res.status(204).end();
});

app.post("/event", function(req, res) {
  console.log(req.body);
  res.status(204).end();
});

app.post("/sms", (req, res) => {
  console.log(req.body);

  if (req.body.msisdn === config.TO_NUMBER) {
    STATUS = req.body.text;
    console.log(req.body.text);
    res.status(200).end();
  } else {
    nexmo.message.sendSms(
      req.body.msisdn, config.TO_NUMBER, req.body.text, {type: "unicode"},
      (err, responseData) => {
        if (err) {
          console.log(err);
        } else {
          console.dir(responseData);
        }
      }
    );
    res.status(200).end();
  }
});
