const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const userSchema = require("../models/userRegister")
const env = require("dotenv").config()

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},

    async (accessToken, refreshToken, profile, done) => {
        try {

            let user = await userSchema.findOne({ googleId: profile.id ,isDeleted: false})
            if (user) {
                return done(null, user)
            }

            // Check if a user with the same email exists
            user = await userSchema.findOne({ email: profile.emails[0].value});

            if (user) {
                // Update the existing user with the Google ID
                if (!user.googleId) {
                    user.googleId = profile.id;
                    user.isGoogleLogin = true;
                    await user.save();
                }
                return done(null, user);
            }

            // Create a new user if no conflicts
            const newUser = new userSchema({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                isGoogleLogin: true,
                isDeleted: false,
            });
            await newUser.save();
            return done(null, newUser);

        } catch (err) {
            return done(err, null)
        }
    }
))


passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser((id, done) => {
    userSchema.findById(id)
        .then(user => {
            done(null, user)
        })
        .catch(err => {
            done(err, null)
        })
})


module.exports = passport