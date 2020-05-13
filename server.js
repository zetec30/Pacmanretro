var express = require('express');
var app = express();

var mongoose = require('mongoose');
var bodyParser = require('body-parser');
//Require the handlebars express package
var handlebars = require('express-handlebars');
var bcrypt = require('bcryptjs');
const passport = require('passport');
const session = require('express-session');

const port = process.env.port || 3001;
const mongoURL = process.env.mongoURL || 'mongodb+srv://mike:DIgitalcat14!@cluster0-fssfj.mongodb.net/Pacman-515?retryWrites=true&w=majority';

const { isAuth } = require('./middleware/isAuth');
require('./middleware/passport')(passport);

const Contact = require('./models/Contact');
const User = require('./models/User');

app.use(express.static('public'));

app.use(
    session({
        secret: 'secret',
        resave: true,
        saveUninitialized: true,
        cookie: { maxAge: 60000 }
    })
);

app.use(passport.initialize());
app.use(passport.session());
//We Use body Parser to structure the request into a format that is simple to use
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
//use app.set to tell express to use handlebars as our view engine
app.set('view engine', 'hbs');
//Pass some additional information to handlebars to that is can find our layouts folder, and allow
//us to use the .hbs extension for our files.
app.engine('hbs', handlebars({
    layoutsDir: __dirname + '/views/layouts',
    extname: 'hbs'
}))

app.get('/', (req, res) => {
    try {
        res.render('login', { layout: 'main' });
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server Error')
    }

})

//Dashboard view
app.get('/dashboard', isAuth, (req, res) => {

    try {
        var users;
        var contacts;
        Contact.find({ user: req.user.id }).lean()
            .exec((err, contacts) => {
                console.log(contacts);
            });
        User.find({}).lean()
            .exec((err, users) => {
                console.log(users)
            })
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server Error')
    }

});

app.get('/signout', (req, res) => {
    //Logs the logged in user out and redirects to the sign in page
    req.logout();
    res.redirect('/');
})

//POST Signup
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        //If user exists stop the process and render login view with userExist true
        if (user) {
            return res.status(400).render('login', { layout: 'main', userExist: true });
        }
        //If user does not exist, then continue
        user = new User({
            username,
            password
        });
        //Salt Generation
        const salt = await bcrypt.genSalt(10);
        //Password Encryption using password and salt
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.status(200).render('login', { layout: 'main', userDoesNotExist: true });
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server Error')
    }
})

app.post('/signin', (req, res, next) => {
    try {
        passport.authenticate('local', {
            successRedirect: '/dashboard',
            failureRedirect: '/?incorrectLogin'
        })(req, res, next)
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server Error')
    }

})

app.post('/addContact', (req, res) => {
    //Uses destructuring to extract name, email and number from the req
    const { name, email, number } = req.body;
    try {
        let contact = new Contact({
            user: req.user.id,
            name,
            email,
            number
        });

        contact.save()
        res.redirect('/dashboard?contactSaved');
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server Error')
    }

})

mongoose.connect(mongoURL, {
    useUnifiedTopology: true,
    useNewUrlParser: true
})
    .then(() => {
        console.log('connected to DB')//Upon Successful connection, we are using a Javasctipt .then block here to give us a message in in our console 
    })
    .catch((err) => {
        console.log('Not Connected to DB : ' + err);//Upon unuccessful connection, we are using a Javasctipt .catch block here to give us a message in in our console with err displayed so that we can see what the issue is.
    });

//Listening for requests on port 3000
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
