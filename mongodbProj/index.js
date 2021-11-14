require("dotenv/config")
const { DB_CONNECT } = process.env
const { MongoClient } = require("mongodb")

const client = new MongoClient(DB_CONNECT)

async function filterFoods(database) {
  const foods = database.collection("foods")
  const result = await foods.find().toArray()
  console.log(result)
  // const result = await foods.
}

async function run() {
  try {
    await client.connect()
    const database = client.db("Cinema")
    const movies = database.collection("movies")
    const result = await movies.find().toArray()
    console.log(result)
    await filterFoods(database)
    // const doc = {
    //   title: "Back to the Future 2",
    //   content: "No bytes, no problem",
    // }
    // const result = await movies.insertOne(doc);
    // console.log(`A document was inserted with the _id: ${result.insertedId}`);
    // // Query for a movie that has the title 'Back to the Future'
    // const query = { title: 'Back to the Future' };
    // const movie = await movies.findOne(query);
    // console.log(movie);

    // const foods = database.collection("foods");
    // // create an array of documents to insert
    // const docs = [
    //   { name: "cake", healthy: false },
    //   { name: "lettuce", healthy: true },
    //   { name: "donut", healthy: false }
    // ];
    // // this option prevents additional documents from being inserted if one fails
    // const options = { ordered: true };
    // const result2 = await foods.insertMany(docs, options);
    // console.log(`${result2.insertedCount} documents were inserted`);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close()
  }
}
run().catch(console.dir)
