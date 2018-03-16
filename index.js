require("dotenv").config({
  path: __dirname + "/.env"
});

const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();
const nodemailer = require('nodemailer');
const Nexmo = require("nexmo");
const app = require("express")();
const bodyParser = require("body-parser");

var config = {
  API_KEY: process.env.API_KEY || "",
  API_SECRET: process.env.API_SECRET || "",
  TO_NUMBER: process.env.TO_NUMBER || "",
  APP_ID: process.env.APP_ID || "",
  PRIVATE_KEY: process.env.PRIVATE_KEY || "",
  SERVER: process.env.SERVER || "",
  DEBUG: process.env.DEBUG === "true",
  MAIL_SERVICE: process.env.MAIL_SERVICE || "",
  MAIL_USER: process.env.MAIL_USER || "",
  MAIL_PASS: process.env.MAIL_PASS || ""
};

const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-GB';

const recordConfig = {
  encoding: encoding,
  sampleRateHertz: sampleRateHertz,
  languageCode: languageCode,
};

var transporter = nodemailer.createTransport({
  service: config.MAIL_SERVICE,
  auth: {
    user: config.MAIL_USER,
    pass: config.MAIL_PASS
  }
});

const nexmo = new Nexmo({
  apiKey: config.API_KEY,
  apiSecret: config.API_SECRET,
  applicationId: config.APP_ID,
  privateKey: config.PRIVATE_KEY
});

var STATUS = "available";

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
        "text": "Hi, " + STATUS + "  Please leave your name and quick message after the tone, then press #."
      },
      {
        "action": "record",
        "eventUrl": [config.SERVER + "/record?from=" + req.query.from],
        "endOnSilence": "3",
        "endOnKey": "#",
        "beepStart": "true",
        "format": "wav"
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
  nexmo.files.get(req.body.recording_url, (err, responseData) => {
    if (responseData) {

      var request = {
        config: recordConfig,
        audio: {
          content: responseData.toString("base64")
        }
      };

      // Detects speech in the audio file
      client
        .recognize(request)
        .then(data => {
          const response = data[0];
          const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
          console.log(`Transcription: `, transcription);
          
          nexmo.message.sendSms(req.query.from, config.TO_NUMBER, transcription);

          var mailOptions = {
            from: config.MAIL_USER,
            to: config.MAIL_USER,
            subject: req.query.from,
            text: transcription
          };

          transporter.sendMail(mailOptions, function(error, info) {
            console.log('shot');
            if (error) {
              console.log("error:", error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
          console.log("messages sent");
        })
        .catch(err => {
          console.log('ERROR:', err);
        });

    }
  });
  res.send("ok");
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
      req.body.msisdn, config.TO_NUMBER, req.body.text, {
        type: "unicode"
      },
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

module.exports = config;
