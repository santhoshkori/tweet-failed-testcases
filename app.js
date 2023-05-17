const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const path = require("path");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const main_path = path.join(__dirname, "twitterClone.db");
//console.log(main_path);
let tweet = null;

const connect_to_tweet_DB = async () => {
  try {
    tweet = await open({
      filename: main_path,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running at port 3000");
    });
  } catch (e) {
    console.log(`${e.message}`);
    process.exit(1);
  }
};

connect_to_tweet_DB();

app.post("/register", async (request, response) => {
  let { username, name, password, gender, location } = request.body;
  const length_pass = password.length;
  const hashed_pass = bcrypt.hash(password, 10);
  //console.log(username);
  const check_user = `SELECT * FROM user WHERE username="${username}";`;
  const get_user = await tweet.get(check_user);
  //console.log(get_user);
  if (get_user !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (length_pass < 6) {
      response.status(400);
      response.send("Password is too short");
    } else if (length_pass >= 6) {
      const register_query = `
      INSERT INTO user (name,username,password,gender)
      VALUES
      ("${name}","${username}","${hashed_pass}","${gender}")
      ;`;
      const register_user = await tweet.run(register_query);
      response.send("User created successfully");
    }
  }
});

//----login
app.post("/login/", async (request, response) => {
  let { username, password } = request.body;
  const check_user = `SELECT * FROM user WHERE username="${username}";`;
  const get_user = await tweet.get(check_user);
  //console.log(get_user);
  if (get_user === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const compare_pass = await bcrypt.compare(password, get_user.password);
    //console.log(compare_pass);
    if (compare_pass === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "mytoken");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//---middole ware
const auth_middleware_fun = (request, response, next) => {
  let jwt_tk;
  const auth_headers = request.headers["authorization"];
  if (auth_headers !== undefined) {
    jwt_tk = auth_headers.split(" ")[1];
  }
  if (jwt_tk === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwt_tk, "mytoken", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.get(
  "/user/tweets/feed/",
  auth_middleware_fun,
  async (request, response) => {
    //console.log("user_op");
    const user_name = request.username;
    const latest_tweete_query = `
    SELECT
    username,tweet,date_time
    FROM
    (user INNER JOIN follower ON user.user_id=follower.following_user_id) AS NEWTABLE INNER JOIN tweet ON NEWTABLE.following_user_id=tweet.user_id
    WHERE
    user.username="${user_name}"
    LIMIT 4
    OFFSET 0    


     
    ;`;
    const latest_tweete = await tweet.all(latest_tweete_query);
    response.send(latest_tweete);
  }
);

app.get("/user/following/", auth_middleware_fun, async (request, response) => {
  const user_name = request.username;
  const following_query = `
  SELECT 
  name
  FROM 
  user INNER JOIN follower ON user.user_id=follower.following_user_id
  WHERE
  username="${user_name}";`;
  const folling_user = await tweet.all(following_query);
  response.send([folling_user]);
});

app.get("/user/followers/", auth_middleware_fun, async (request, response) => {
  const user_name = request.username;
  const follower_query = `
  SELECT 
  *
  FROM 
  user INNER JOIN follower ON user.user_id=follower.follower_user_id
  WHERE
  username="${user_name}"
  ;`;
  const follwers = await tweet.all(follower_query);
  response.send(follwers);
});
module.exports = app;
