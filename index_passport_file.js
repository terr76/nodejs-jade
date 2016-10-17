var express = require('express');
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var bodyParser = require('body-parser');
var bkfd2Password = require('pbkdf2-password');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var hasher = bkfd2Password();

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
  secret: '2134123sdfsadfas&*^',
  resave: false,
  saveUninitialized: true,
  store: new FileStore()
}));
app.use(passport.initialize());
app.use(passport.session()); // it must be under session setting
app.get('/count', function(req, res){
  if(req.session.count){
    req.session.count++;
  } else {
    req.session.count = 1;
  }
  res.send('count :' + req.session.count);
});
app.get('/auth/logout', function(req, res){
  req.logout();
  req.session.save(function(){
    res.redirect('/welcome');
  });
});
app.get('/welcome', function(req, res){
  if(req.user && req.user.displayName){
    res.send(`
      <h1>Hello, ${req.user.displayName}</h1>
      <a href="/auth/logout">Logout</a>
    `);
  } else {
    res.send(`
      <h1>Welcome</h1>
      <ul>
        <li><a href="/auth/login">Login</a></li>
        <li><a href="/auth/register">Register</a></li>
      </ul>
    `);
  }
});
passport.serializeUser(function(user, done){
  console.log('serializeUser', user);
  done(null, user.authId);
});
passport.deserializeUser(function(id, done){
  console.log('deserializeUser', id)
  for(var i=0; i<users.length; i++){
    var user = users[i];
    if(user.authId === id){
      return done(null, user);
    }
  }
  done('There is no user.');
});
passport.use(new LocalStrategy(
  function(username, password, done){
    var uname = username;
    var pwd = password;
    for(var i=0; i<users.length; i++){
      var user = users[i];
      if(uname === user.username){
        return hasher({password:pwd, salt:user.salt}, function(err, pass, salt, hash){
          if(hash === user.password){
            console.log('LocalStrategy', user);
            done(null, user);
          } else {
            done(null, false);
          }
        });
      }
    }
    done(null, false);
  }
));
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID, 
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "http://www.example.com/auth/facebook/callback",
    profileFields:['id','email','gender','link','locale','name','timezone','updated_time','verified','displayName']
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile);
    var authId = 'facebook: '+profile.id;
    for(var i=0; i<users.length; i++){
      var user = users[i];
      if(user.authId === authId){
        return done(null, user);
      }
    }
    var newuser = {
      'authId':authId,
      'displayName':profile.displayName,
      'email':profile.emails[0].value
    }
    users.push(newuser);
    done(null, newuser);
  }
));
app.post('/auth/login', passport.authenticate('local', {
  successRedirect: '/welcome', 
  failureRedirect: '/auth/login', 
  failureFlash: false
}));
app.get('/auth/facebook', passport.authenticate('facebook',{
  scope:'email'
}));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { 
  successRedirect: '/welcome',
  failureRedirect: '/auth/login' 
}));
var users = [
  {
    authId:'local:kibeom',
    username: 'kibeom',
    password: '6cB8DTCa4wod5NsAg0mRU4jRFSOd321AZAmqAGoiyShHG71EXy6cS/tllJncuiYbIdOH39vTbD9d57boAZNzYT5RC2/8TVdQJHchGKxRDl8P5UzabFfx5310kqhvv0zNiNnY9/ZacdamNWmE0YOuPoN2DjP+oib4I8GmQolUnnQ=',
    salt: 'B1z6wVBW4dPv42iCC52Uhpr7XeOoWPPOtgtIJle/KTPGkAC3I249e0QIY+XkLhTAP8HVXEbDawX+tds6Li/6ig==',
    displayName:'Kibeom'
  }
];
app.post('/auth/register', function(req, res){
  hasher({password:req.body.password}, function(err, pass, salt, hash){
    var user = {
      authId:'local:'+req.body.username,
      username:req.body.username,
      password:hash,
      salt:salt,
      displayName:req.body.displayName
    };
    users.push(user);
    req.login(user, function(err){
      req.session.save(function(){
        res.redirect('/welcome');
      });      
    });
  });
});
app.get('/auth/register', function(req, res){
  var output = `
  <h1>Register</h1>
  <form action="/auth/register" method="post">
    <p>
      <input type="text" name="username" placeholder="username">
    </p>
    <p>
      <input type="password" name="password" placeholder="password">
    </p>
    <p>
      <input type="text" name="displayName" placeholder="displayName">
    </p>
    <p>
      <input type="submit">
    </p>
  </form>
  `;
  res.send(output);
});
app.get('/auth/login', function(req, res){
  var output = `
  <h1>Login</h1>
  <form action="/auth/login" method="post">
    <p>
      <input type="text" name="username" placeholder="username">
    </p>
    <p>
      <input type="password" name="password" placeholder="password">
    </p>
    <p>
      <input type="submit">
    </p>
  </form>
  <a href="/auth/facebook">Facebook</a>
  `;
  res.send(output);
});
app.get('/temp', function(req, res){
  res.send('result :' + req.session.count);
});
app.listen(3004, function(){
  console.log('Connected 3004 port');
});