const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');

const app = express();
const port = 443;

const cors = require('cors');

const rateLimit = require('express-rate-limit');


app.use(cors({
    origin: '*'
}));

// Setting Up DynamoDB
AWS.config.update({
    region: "localhost", 
    endpoint: "http://localhost:8000",
    // Replace for productions
    accessKeyId: "your-access-key-id",
    secretAccessKey: "your-secret-access-key"
});

AWS.config.credentials = new AWS.Credentials("fakeMyKeyId", "fakeSecretAccessKey");

const ddb = new AWS.DynamoDB.DocumentClient();
const dynamoDb = new AWS.DynamoDB(); 
app.use(bodyParser.json());

async function ensureUserTableExists() {
    const tableName = "USERS";
    const params = {
        TableName: tableName,
        AttributeDefinitions: [
            { AttributeName: "CUSTOMER_ID", AttributeType: "S" },
            { AttributeName: "CUSTOMER_NAME", AttributeType: "S" },
        ],
        KeySchema: [
            { AttributeName: "CUSTOMER_ID", KeyType: "HASH" },
            { AttributeName: "CUSTOMER_NAME", KeyType: "RANGE" }
            
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        }
    };

    try {
        await dynamoDb.describeTable({ TableName: tableName }).promise();
        console.log(`${tableName} table exists.`);
    } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
            console.log(`${tableName} table does not exist. Creating...`);
            await dynamoDb.createTable(params).promise();
            console.log(`${tableName} table created.`);
        } else {
            throw error;
        }
    }
}

async function ensureMessagesTableExists() {
    const tableName = "MESSAGES";
    const params = {
        TableName: tableName,
        AttributeDefinitions: [
            { AttributeName: "CUSTOMER_ID", AttributeType: "S" }, 
            { AttributeName: "TIMESTAMP", AttributeType: "S" }
        ],
        KeySchema: [
            { AttributeName: "CUSTOMER_ID", KeyType: "HASH" }, 
            { AttributeName: "TIMESTAMP", KeyType: "RANGE" }  
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        }
    };

    try {
        await dynamoDb.describeTable({ TableName: tableName }).promise();
        console.log(`${tableName} table exists.`);
    } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
            console.log(`${tableName} table does not exist. Creating...`);
            await dynamoDb.createTable(params).promise();
            console.log(`${tableName} table created.`);
        } else {
            throw error;
        }
    }
}

// Call ensureTableExists at the start of your application
ensureUserTableExists().catch(err => {
    console.error("Failed to ensure Users table exists:", err);
    process.exit(1); // Exit if there's an issue creating the table
});

ensureMessagesTableExists().catch(err => {
    console.error("Failed to ensure Messages table exists:", err);
    process.exit(1); // Exit if there's an issue creating the table
});

// Define a route for adding new users
app.post('/setUsers', async (req, res) => {
  const { CUSTOMER_ID, CUSTOMER_EMAIL, CUSTOMER_NAME } = req.body;

  if (!CUSTOMER_ID || !CUSTOMER_EMAIL || !CUSTOMER_NAME) {
      return res.status(400).send('Missing required fields: CUSTOMER_ID, CUSTOMER_EMAIL, CUSTOMER_NAME');
  }

  const params = {
      TableName: "USERS",
      Item: {
          CUSTOMER_ID, 
          CUSTOMER_EMAIL,
          CUSTOMER_NAME
      }
  };
  try {
      await ddb.put(params).promise();
      res.status(201).send('User added successfully');
  } catch (err) {
      console.error("Error adding user:", err);
      res.status(500).send(err.toString());
  }
});


// Define a route for retrieving a user by CUSTOMER_ID
app.get('/getUser/:id', async (req, res) => {
  const params = {
    TableName: "USERS",
    Key: {
        CUSTOMER_ID: req.params.id
    }
  };
  try {
      const data = await ddb.get(params).promise();
      if (data.Item) {
          res.json(data.Item);
      } else {
          res.status(404).send('User not found');
      }
  } catch (err) {
      console.error("Error retrieving user:", err);
      res.status(500).send(err.toString());
  }
});

const sendMessage_limiter = rateLimit({
    windowMs: 1 * 1000, // 1 sec
    max: 5, // # requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: function(req, res, /*next*/) {
      res.status(this.statusCode).json({
        message: "Too many requests, please try again later."
      });
    }
  });

app.post('/sendMessage', sendMessage_limiter , async (req, res) => {
    const { TIMESTAMP, CUSTOMER_ID, CUSTOMER_NAME, MESSAGE} = req.body;
    const params = {
      TableName: "MESSAGES",
      Item: {
        TIMESTAMP,
        CUSTOMER_ID,    
        CUSTOMER_NAME,
        MESSAGE
    }
    };
    console.log(params)
    try {
        await ddb.put(params).promise();
        res.status(201).send('User added successfully');
    } catch (err) {
        console.error("Error adding user:", err);
        res.status(500).send(err.toString());
    }
});



app.get('/getMessages', async (req, res) => {
    const params = {
        TableName: "MESSAGES"
    };
    try {
        let data = await ddb.scan(params).promise();
        let allMessages = data.Items;

        while (data.LastEvaluatedKey) {
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            data = await ddb.scan(params).promise();
            allMessages = allMessages.concat(data.Items);
        }
        
        allMessages.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));

        res.json(allMessages);
    } catch (err) {
        console.error("Error retrieving messages:", err);
        res.status(500).send(err.toString());
    }
});


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
