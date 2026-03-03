require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// MONGODB CONNECT
// ===============================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => console.log("MongoDB Error ❌", err));

// ===============================
// USER MODEL
// ===============================
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    phone: String,
    password: String,
    verified: { type: Boolean, default: true },
    role: { type: String, default: "user" }
});

const User = mongoose.model("User", userSchema);

// ===============================
// TEMP OTP STORE
// ===============================
let otpStore = {};

// ===============================
// TEST ROUTE
// ===============================
app.get("/test", (req, res) => {
    res.send("Backend working ✅");
});

// ===============================
// SEND OTP
// ===============================
app.post("/send-otp", async (req, res) => {

    const { email } = req.body;

    if (!email) {
        return res.json({ success: false });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;

    console.log("Generated OTP:", otp);

    try {

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP is: ${otp}`
        });

        res.json({ success: true });

    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
});

// ===============================
// VERIFY OTP
// ===============================
app.post("/verify-otp", (req, res) => {

    const { email, otp } = req.body;

    if (otpStore[email] && otpStore[email] == otp) {
        delete otpStore[email];
        return res.json({ success: true });
    }

    res.json({ success: false });
});

// ===============================
// REGISTER USER
// ===============================
app.post("/register", async (req, res) => {

    try {

        const { username, email, phone, password } = req.body;

        const existingUser = await User.findOne({
            $or: [{ email }, { phone }]
        });

        if (existingUser) {
            return res.json({ success: false, message: "User already exists" });
        }

        const newUser = new User({
            username,
            email,
            phone,
            password
        });

        await newUser.save();

        res.json({ success: true });

    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
});

// ===============================
// LOGIN
// ===============================
app.post("/login", async (req, res) => {

    const { identifier, password } = req.body;

    const user = await User.findOne({
        $or: [{ email: identifier }, { phone: identifier }]
    });

    if (!user || user.password !== password) {
        return res.json({ success: false });
    }

    res.json({ success: true, username: user.username });
});

// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
// ===============================
// GET USER DATA
// ===============================
app.get("/get-user/:username", async (req, res) => {

    const username = req.params.username;

    try {
       const user = await User.findOne({
    username: { $regex: new RegExp("^" + username + "$", "i") }
});

        if (!user) {
            return res.json({ success: false });
        }

        res.json({
            success: true,
            password: user.password
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});