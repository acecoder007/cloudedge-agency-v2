const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

// ---------- Middleware ----------
app.use(bodyParser.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

// ---------- Database Setup (MongoDB Atlas) ----------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---------- Schemas ----------
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});

const blogSchema = new mongoose.Schema({
  title: String,
  content: String,
  image: String,
  author: String,
  authorEmail: String,
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Blog = mongoose.model("Blog", blogSchema);

// ---------- File Upload ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "_" + file.originalname),
});
const upload = multer({ storage });

// ---------- Auth Endpoints ----------
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const newUser = new User({ name, email, password });
    await newUser.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    res.json({ success: false, error: "Email already exists" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) res.json({ success: true, user });
  else res.json({ success: false, error: "Invalid email or password" });
});

// ---------- Blog Endpoints ----------
app.get("/get-blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json({ success: true, blogs });
  } catch (err) {
    res.json({ success: false, error: "DB error" });
  }
});

app.post("/save-blog", async (req, res) => {
  try {
    const { title, content, image, author, authorEmail } = req.body;
    const newBlog = new Blog({ title, content, image, author, authorEmail });
    await newBlog.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: "Failed to save blog" });
  }
});

app.post("/update-blog", async (req, res) => {
  try {
    const { id, title, content, image, authorEmail } = req.body;
    const blog = await Blog.findOneAndUpdate(
      { _id: id, authorEmail },
      { title, content, image, updatedAt: new Date() }
    );
    if (!blog) return res.json({ success: false, error: "Not authorized or not found" });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: "Update failed" });
  }
});

app.post("/delete-blog", async (req, res) => {
  try {
    const { id, authorEmail } = req.body;
    const blog = await Blog.findOneAndDelete({ _id: id, authorEmail });
    if (!blog) return res.json({ success: false, error: "Delete failed" });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: "Delete failed" });
  }
});

app.post("/increment-view", async (req, res) => {
  try {
    const { id } = req.body;
    await Blog.findByIdAndUpdate(id, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// ---------- Upload Image ----------
app.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, error: "No file uploaded" });

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

// ---------- OTP Email ----------
app.post("/send-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Cloud Edge Agency" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.json({ success: false, error: "Failed to send OTP" });
  }
});

// ---------- Start ----------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
});
