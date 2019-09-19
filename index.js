const { promisify } = require("util");

const mongoose = require("mongoose");
const authenticate = require("mm-authenticate")(mongoose);
const { Script, Match } = require("mm-schemas")(mongoose);
const fetch = require("node-fetch");
const url = require("url");

const send = (res, status, data) => (res.statusCode = status, res.end(data));

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true});
mongoose.Promise = global.Promise;

const getStatsForScript = async (req, res, key) => {
  console.log(`${req.user.name} - Getting matches for ${key}`);
  const matchesReq = await fetch(
    `https://matches.mechmania.io/matches/${key}`,
    {
      headers: {
        Authorization: `Bearer ${req.user.token}`
      }
    }
  );
  const matches = await matchesReq.json();
  console.log(`${req.user.name} - Calculating Wins/Losses`);
  let wins = 0;
  let losses = 0;
  let ties = 0;
  matches.forEach(({ match: { key: matchKey, winner } }) => {
    const p2 = matchKey.split(":")[1];
    if (winner === 3) {
      ties++;
    } else if (p2 === key) {
      // Logged in player was p2;
      if (winner === 2) {
        wins++;
      } else {
        losses++;
      }
    } else {
      // Logged in player was p1;
      if (winner === 1) {
        wins++;
      } else {
        losses++;
      }
    }
  });
  return send(res, 200, JSON.stringify({ wins, losses, ties }));
};

module.exports = authenticate(
  async (req, res) => {
    console.log(req.url); // "/", "/id"
    if (req.url === "/") {
        const team = req.user;
        console.log(`${team.name} - Getting script`);
        const script = await Script.findById(team.latestScript).exec();
        return getStatsForScript(req, res, script.key);
    } else {
      getStatsForScript(req, res, req.pathname.slice(1));
    }
  }
);
      // router(
      //   get("/", async (req, res) => {
      //     const team = req.user;
      //     console.log(`${team.name} - Getting script`);
      //     const script = await Script.findById(team.latestScript).exec();
      //     return getStatsForScript(req, res, script.key);
      //   }),
      //   get("/:script", async (req, res) =>
      //     getStatsForScript(req, res, req.params.script)
      //   )
