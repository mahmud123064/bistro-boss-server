const express = require('express')
const app = express()
const cors = require("cors")
const port = process.env.PORT || 5000;
require('dotenv').config()
const jwt = require('jsonwebtoken');

// middleware

app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "UnAuthorization access" })
  }

  // Bearer token
  const token = authorization.split(" ")[1]

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ error: true, message: "UnAuthorization access" })
    }
    req.decoded = decoded;
    next();
  })
}


////////////////////////// MongoDb code  //////////////


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6rkaped.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const menuCollecction = client.db('bistroDb').collection('menu');
    const reviewCollecction = client.db('bistroDb').collection('reviews');
    const cartCollection = client.db("bistroDb").collection("cart");
    const usersCollection = client.db("bistroDb").collection("users");

    // JWT token  
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    /*
    * 1. use jwt token : verifyJWT
      2. do not show secure links to those who should no see the links 
      3. use admin verify middleware
    */

const verifyAdmin = async(req, res, next) => {
  const email = req.decoded.email;
  const query = { email : email } 
  const user = await usersCollection.findOne(query)
if(user?. role !== "admin"){
  return res.status(403).send({ error : true, message: "forbidden message" })
}
next()
}

    //user related apis
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      console.log("existing user", existingUser);
      if (existingUser) {
        return res.send("Already exist this user ")
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })


    // security laywer : verifyJWT
    // same email
    // check admin

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" }
      res.send(result)
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }

      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    // menu related apis
    app.get('/menu', async (req, res) => {
      const result = await menuCollecction.find().toArray();
      res.send(result);
    })

    app.post("/menu", async(req, res)=> {
      const newItem = req.body;
      const result = await menuCollecction.insertOne(newItem)
      res.send(result)
    })

    // review related apis
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollecction.find().toArray();
      res.send(result);
    })

    ////////// Cart collection api ///////////

    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: "forbidden access" })
      }
      const query = { email: email }
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })

    app.post("/carts", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await cartCollection.insertOne(item)
      res.send(result)

    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query)
      console.log(result);
      res.send(result);
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


///////////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.send("server is running")
})

app.listen(port, () => {
  console.log("server is running on port: ", port);
})




/**
 * -------------------------------
 * Naming Convention
 * -------------------------------
 * 
 * 1. user : collection
 * app.get("/users")
 * app.get("/users/:id")
 * app.post("/users")
 * app.patch("/users/:id")
 * app.put("/users/:id")
 * app.delete("/users/:id")
 * 
 * **/ 