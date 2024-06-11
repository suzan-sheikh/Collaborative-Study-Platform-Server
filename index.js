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

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  console.log(req.headers);
  const token = req.headers;
  console.log(token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
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
    // verify admin middleware --------> pending
    const verifyAdmin = async (req, res, next) => {
      console.log("hello");
      const user = req.user;
      const query = { email: user?.email };
      const result = await usersCollection.findOne(query);
      console.log(result?.role);
      if (!result || result?.role !== "admin")
        return res.status(401).send({ message: "unauthorized access!!" });
      next();
    };

    // verify host middleware --------> pending
    const verifyHost = async (req, res, next) => {
      console.log("hello");
      const user = req.user;
      const query = { email: user?.email };
      const result = await usersCollection.findOne(query);
      console.log(result?.role);
      if (!result || result?.role !== "host") {
        return res.status(401).send({ message: "unauthorized access!!" });
      }

      next();
    };

    // -------------------------- JWT Related------------------------------

    // JWT auth related api  -------> OK
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    // Logout
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", { ...cookieOption, maxAge: 0 })
          .send({ success: true });
        console.log("Logout successful");
      } catch (err) {
        res.status(500).send(err);
      }
    });

    // -------------------------- First Time create User------------------------------

    // save a user data in db ------> OK
    app.put("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      // check if user already exists in db
      const isExist = await usersCollection.findOne(query);
      if (isExist) {
        // if existing user login again
        return res.send(isExist);
      }
      // save user for the first time
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // --------------------------Session Related------------------------------

    // Save a session data in db  -------> OK
    app.post("/session", async (req, res) => {
      const sessionData = req.body;
      const result = await sessionCollection.insertOne(sessionData);
      res.send(result);
    });

    // get all session from db -------> OK
    app.get("/session", async (req, res) => {
      const result = await sessionCollection.find().toArray();
      res.send(result);
    });

    // Get all Approved Session from db -------> OK
    app.get("/approved", async (req, res) => {
      const status = "approved";
      const query = { status: status };
      const result = await sessionCollection.find(query).toArray();
      res.send(result);
    });

    // Get all Approved Session from db -------> OK
    app.get("/manageSession", async (req, res) => {
      const statuses = ["pending", "approved"];
      const query = { status: { $in: statuses } };
      const result = await sessionCollection.find(query).toArray();
      res.send(result);
    });

    // Get Session query to it for upload materials from db -------> OK
    app.get("/getToID/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await sessionCollection.findOne(query);
      res.send(result);
    });

    // session status update by Admin to db ------------> OK
    app.patch("/manageAdmin/update/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { status, price } = req.body;
      const updateDoc = {
        $set: { status: status, fee: price },
      };
      const result = await sessionCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // delete a session to Admin from bd -----> Ok
    app.delete("/deleteSession/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await sessionCollection.deleteOne(query);
      res.send(result);
    });

    // session status update by Admin to db ------------> ok
    app.put("/rejectedAdmin/:id", async (req, res) => {
      const id = req.params.id;
      const { reason, feedback, status } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          reason,
          feedback,
          status,
        },
      };
      const result = await sessionCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // update Admin Approved full session data ------------> Ok
    app.put("/updateAdminSession/update/:id", async (req, res) => {
      const id = req.params.id;
      const sessionData = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: sessionData,
      };
      const result = await sessionCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // reject Session approved request sent by tutor ------------> ok
    app.patch("/rejectSession/update/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status },
      };
      const result = await sessionCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Get all common Session for home page -------> running
    app.get("/commonSession", async (req, res) => {
      const status = "approved";
      const query = { status: status };
      const result = await sessionCollection.find(query).toArray();
      res.send(result);
    });

    // home page session data get conditionally  ------------> pending now working
    // app.get("/sessionLimitData", async (req, res) => {
    //   const { skip = 0, limit = 3 } = req.query; // Default to fetching 3 items if no limit is specified
    //   try {
    //     const sessions = await sessionCollection
    //       .find()
    //       .skip(parseInt(skip))
    //       .limit(parseInt(limit))
    //       .toArray();
    //     res.send(sessions);
    //   } catch (error) {
    //     res.status(500).send({ message: "Internal server error", error });
    //   }
    // });
    // --------------------------material Related------------------------------

    // Save a material data in db  -------> OK
    app.post("/materials", async (req, res) => {
      const materialsData = req.body;
      const result = await materialCollection.insertOne(materialsData);
      res.send(result);
    });

    // get all materials from db -------> OK
    app.get("/materials", async (req, res) => {
      const result = await materialCollection.find().toArray();
      res.send(result);
    });

    // Get update material data for upload from db -------> OK
    app.get("/materialToID/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await materialCollection.findOne(query);
      res.send(result);
    });

    // update material in db --------> OK
    app.put("/updateMaterial/:id", async (req, res) => {
      const id = req.params.id;
      const materialData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...materialData,
        },
      };
      const result = await materialCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // delete a material in bd -----> OK
    app.delete("/deleteMaterial/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await materialCollection.deleteOne(query);
      res.send(result);
    });

    // --------------------------Admin (user Related)------------------------------

    // get all users data from db
    // app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
    //   const result = await usersCollection.find().toArray();
    //   res.send(result);
    // });

    // get all users data from db -------> OK
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // data for pagination --------> OK
    app.get("/userCount", async (req, res) => {
      const search = req.query.search;
      const query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
      const count = await usersCollection.countDocuments(query);
      res.send({ count });
    });

    // search Data get from db --------> OK
    app.get("/allUser", async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      const search = req.query.search;

      const query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };

      const result = await usersCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // update user role ------------> OK
    app.patch("/users/update/:email", async (req, res) => {
      const email = req.params.email;
      const { role } = req.body;
      const query = { email };
      const updateDoc = {
        $set: { role },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Verify Token Middleware   --------> OK
    const checkToken = async (req, res, next) => {
      // console.log("inside checkToken First Time?", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      // console.log("token", token);
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          // console.log("error", err);
          return res.status(401).send({ message: "Unauthorized access" });
        }
        // console.log("decoded value", decoded);
        req.decoded = decoded;
        next();
      });
    };

    // get users   -------> Ok example
    app.get("/user", async (req, res) => {
      // console.log(req.headers);
      const result = await usersCollection.find().toArray();
      res.send(result);
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
