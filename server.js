const express = require('express');
require('dotenv').config();
const path = require('path');
const userRouter = require('./routers/users');
const adminRouter = require('./routers/admin');
const connectDB = require('./db/connectDB');
const session = require('express-session');
const nocache = require('nocache');
const passport = require('./config/passport');
const cors = require('cors');

const app = express()





// app.use(nocache())
app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}))


app.use(cors());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

app.use(passport.initialize())
app.use(passport.session())

app.use(express.urlencoded({ extended: true }))
app.use(express.json())


app.use('/', userRouter)
app.use('/admin', adminRouter);

connectDB();



app.listen(3000, () => { 
    console.log(`------------------------------------------`),
    console.log(`USER SIDE   :  http://localhost:3000/home`),
    console.log(`ADMIN SIDE  :  http://localhost:3000/admin`)
    console.log(`------------------------------------------`)
})