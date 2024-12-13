const bcrypt= require('bcrypt');
const express= require('express');
const app= express();
const UserModel= require('./config/database');
const session= require('express-session');
const MongoStore= require('connect-mongo'); //to store the session ids
const passport= require('passport');
const configurePassport= require('./config/passport');

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/passport', collectionName: "sessions"}),
  cookie: { maxAge: 1000*60*60*24 }
}))

configurePassport(passport);

app.use(passport.initialize())
app.use(passport.session())

app.get('/login', (req,res) => {
    //res.send("Login get");
    res.render('login');
})

app.get('/register', (req,res) => {
    //res.send("Register get");
    console.log("Register page requested"); 
    res.render('register');
})

//app.post('/login', passport.authenticate('local', {successRedirect: 'protected'}))

app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        // Authentication failed
        return res.status(400).json({ message: info.message });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.redirect('/protected');
      });
    })(req, res, next);
  });

app.post('/register', (req, res) => {
    console.log("Registering in db...");
    console.log("Password received:", req.body.password);
    
    bcrypt.hash(req.body.password, 10)
        .then(hashedPassword => {
            console.log("Hashed password:", hashedPassword);

            let user = new UserModel({
                username: req.body.username,
                password: hashedPassword
            });

            return user.save();
        })
        .then(savedUser => {
            console.log("User saved:", savedUser);
            res.send({ success: true });
        })
        .catch(err => {
            console.error("Error saving user:", err);
            res.status(500).send({ success: false, message: "Failed to save user." });
        });
    });

app.get('/logout', (req,res) => {
   // res.send("Logout get");
   req.logout((err) => {
    if (err) {
      return res.redirect('/');
    }
    res.redirect('/login');
  });
})

app.get('/protected', (req,res) => {
    console.log(req.session);
    console.log(req.user);

    if(req.isAuthenticated())
    {
        res.send("Protected");
    }
    else{
        res.status(401).send({msg: "Unauthorised"});
    }  
})

app.get('/', (req,res) => {
    res.send("Hello World! This is the home page.");
})

app.listen(5000, (req,res) => {
    console.log("Listening to port 5000");
});
