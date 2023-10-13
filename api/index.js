const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
var bcrypt = require("bcryptjs");
var salt = bcrypt.genSaltSync(10);
const secret = "wng2i4y3kwrgou32ogbdo2gehg82348u3ibebu8cbdf";
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");
const Post = require("./models/Post");
const postModel = require("./models/Post");

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose.connect(
  "mongodb+srv://fuaadshobambi:T3Hml91L0j9IRAad@cluster0.hfjsgyp.mongodb.net/?retryWrites=true&w=majority"
);

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: "Username already exists." });
    } else {
      res.status(500).json({ message: "Server Error" });
    }
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    jwt.sign({ username, id: username._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({
        username,
        id: userDoc._id,
      });
    });
  } else {
    res.status(400).json({ message: "Password is incorrect." });
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) {
      console.error(err);
      return res
        .status(401)
        .json({ message: "Unauthorized", error: err.message });
    }
    res.json(info);
  });
});

app.post("/logout", (req, res) => {
  res.clearCookie("token").json("ok");
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.json(postDoc);
  });
});

app.get("/post", async (req, res) => {
  try {
    const posts = await postModel
      .find()
      .populate("author", "username")
      .sort({ createdAt: -1 })
      .limit(15);
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const postDoc = await Post.findById(id);
    res.json(postDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

app.listen(4000);
