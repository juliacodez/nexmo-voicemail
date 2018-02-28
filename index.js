'use strict'
const app = require('express')();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

app.get('/answer', function(req, res) {
  const ncco = [{
      "action": "talk",
      "text": "Please wait while we connect you."
    },
    {
      "action": "connect",
      "eventUrl": ["http://47a71745.ngrok.io/event"],
      "from": req.body.from,
      "endpoint": [{
        "type": "phone",
        "number": "447403969038"
      }]
    }
  ];
  res.json(ncco);
});

app.post('/event', function(req, res) {
  console.log(req.body);
  res.status(204).end();
});
