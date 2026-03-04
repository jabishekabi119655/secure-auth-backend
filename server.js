require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// CHECK ENV VARIABLES
// ===============================
if (!process.env.MONGO_URI) {
    console.log("❌ MONGO_URI missing");
    process.exit(1);
}

// ===============================
// MONGODB CONNECT
// ===============================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => {
    console.log("MongoDB Error ❌", err);
    process.exit(1);
});

// ===============================
// USER MODEL
// ===============================
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    phone: String,
    password: String,
    verified: { type: Boolean, default: true },
    locked: { type: Boolean, default: false }, // 👈 ADD THIS
    role: { type: String, default: "user" }
});

const User = mongoose.model("User", userSchema);

// ===============================
// TEMP OTP STORE
// ===============================
let otpStore = {};

// ===============================
// ROOT ROUTE
// ===============================
app.get("/", (req, res) => {
    res.send("Secure Auth Backend Live 🚀");
});

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
        console.log("Mail Error ❌", error);
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
        console.log("Register Error ❌", error);
        res.json({ success: false });
    }
});

// ===============================
// LOGIN
// ===============================
app.post("/login", async (req, res) => {
    const { identifier, password } = req.body;

    try {
        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        });

        if (!user || user.password !== password) {
            return res.json({ success: false });
        }
        if (user.locked) {
    return res.json({ success: false, message: "Account Locked 🔒" });
}
         res.json({ success: true, username: user.username });

    } catch (error) {
        console.log("Login Error ❌", error);
        res.json({ success: false });
    }
});
// ===============================
// ADMIN LOCK / UNLOCK
// ===============================
app.put("/admin/lock/:id", async (req, res) => {

    try {
        const user = await User.findById(req.params.id);

        if (!user) return res.json({ success: false });

        user.locked = !user.locked;
        await user.save();

        res.json({ success: true });

    } catch (error) {
        res.json({ success: false });
    }
});

// ===============================
// ADMIN DELETE USER
// ===============================
app.delete("/admin/delete/:id", async (req, res) => {

    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.log("Delete Error ❌", error);
        res.json({ success: false });
    }
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
            id: user._id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            locked: user.locked,
            role: user.role,
            password: user.password
        });

    } catch (error) {
        console.log("Get User Error ❌", error);
        res.json({ success: false });
    }
});
// ===============================
// START SERVER (ONLY ONCE)
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});