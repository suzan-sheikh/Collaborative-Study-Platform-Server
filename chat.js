const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const nodemailer = require("nodemailer");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 8000;
// const { Resend } = require('resend')
// const resend = new Resend(api_key)
// middleware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://brainbond-e920d.web.app",
    "https://brainbond-e920d.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// send email
const sendEmail = (emailAddress, emailData) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: process.env.TRANSPORTER_EMAIL,
      pass: process.env.TRANSPORTER_PASS,
    },
  });

  // verify transporter
  // verify connection configuration
  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
  });
  const mailBody = {
    from: `"StayVista" <${process.env.TRANSPORTER_EMAIL}>`, // sender address
    to: emailAddress, // list of receivers
    subject: emailData.subject, // Subject line
    html: emailData.message, // html body
  };

  transporter.sendMail(mailBody, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email Sent: " + info.response);
    }
  });
};



// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ykkxidd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const uri = "mongodb://localhost:27017";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// --------------------------CookieOption Related------------------------------
const cookieOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    const db = client.db("BrainBond");
    const sessionCollection = db.collection("session");
    const usersCollection = db.collection("users");
    const materialCollection = db.collection("material");

    // -------------------------- verify Related------------------------------
   

    // home page session data get conditionally  ------------> runnin
    app.get('/collections', async (req, res) => {
      const { skip = 0, limit = 6 } = req.query;
      try {
        const collections = await sessionCollection.find().skip(parseInt(skip)).limit(parseInt(limit)).toArray();
        res.send(collections);
      } catch (error) {
        res.status(500).send({ message: 'Internal server error', error });
      }
    });
   
    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 })
    console.log("You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from StayVista Server..");
});
app.listen(port, () => {
  console.log(`BrainBond is running on port ${port}`);
});
