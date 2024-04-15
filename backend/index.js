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

async function ensureUsersTableExists() {
    const tableName = "USERS";
    const params = {
        TableName: tableName,
        AttributeDefinitions: [
            { AttributeName: "CUSTOMER_ID", AttributeType: "S" },
            { AttributeName: "CUSTOMER_EMAIL", AttributeType: "S" },
        ],
        KeySchema: [
            { AttributeName: "CUSTOMER_ID", KeyType: "HASH" },
            { AttributeName: "CUSTOMER_EMAIL", KeyType: "RANGE" }
            
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

async function ensureAdminsTableExists() {
    const tableName = "ADMINS";
    const params = {
        TableName: tableName,
        AttributeDefinitions: [
            { AttributeName: "CUSTOMER_ID", AttributeType: "S" }, 
            { AttributeName: "CUSTOMER_EMAIL", AttributeType: "S" },
        ],
        KeySchema: [
            { AttributeName: "CUSTOMER_ID", KeyType: "HASH" }, 
            { AttributeName: "CUSTOMER_EMAIL", KeyType: "RANGE" }  
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
            { AttributeName: "TIMESTAMP", AttributeType: "S" },
            { AttributeName: "CUSTOMER_ID", AttributeType: "S" }, 
        ],
        KeySchema: [
            { AttributeName: "TIMESTAMP", KeyType: "HASH" },
            { AttributeName: "CUSTOMER_ID", KeyType: "RANGE" }, 
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

// ENSURE & GENERATE TABLE OF ALL CHATROOMS THAT EXISTS (CHATROOMS)
async function ensureChatroomsTableExists() {
    const chatroomTableName = "CHATROOMS";

    try {
        await dynamoDb.describeTable({ TableName: chatroomTableName }).promise();
        console.log(`${chatroomTableName} table exists.`);
        await ensureGroups();
    } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
            console.log(`${chatroomTableName} table does not exist. Creating...`);
            await generateChatroomsTable();
            await ensureGroups();
        } else {
            console.error("Error ensuring CHATROOMS tables:", error);
            throw error;
        }
    }
}

async function generateChatroomsTable() {
    const params = {
        TableName: "CHATROOMS",
        AttributeDefinitions: [
            { AttributeName: "GROUP_ID", AttributeType: "S" }
        ],
        KeySchema: [
            { AttributeName: "GROUP_ID", KeyType: "HASH" }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        }
    };

    try {
        await dynamoDb.createTable(params).promise();
        console.log("CHATROOMS table created.");
    } catch (error) {
        console.error("Error creating CHATROOMS table:", error);
        throw error;
    }
}

// ENSURE & GENERATE ALL GROUPS 
async function ensureGroups() {
    const params = {
        TableName: "CHATROOMS"
    };

    try {
        const data = await ddb.scan(params).promise();
        const chatrooms = data.Items;

        for (const room of chatrooms) {
            const groupID = String(room.GROUP_ID);
            await ensureGroupTable(groupID);
        }

        console.log("All group tables ensured.");
    } catch (error) {
        console.error("Error ensuring group tables:", error);
        throw error;
    }
}

// ENSURE & GENERATE SINGLE GROUP
async function ensureGroupTable(roomID) {
    const tableName = roomID;
    const params = {
        TableName: tableName,
        AttributeDefinitions: [
            { AttributeName: "MESSAGE_ID", AttributeType: "S" },
            { AttributeName: "CUSTOMER_ID", AttributeType: "S" }
        ],
        KeySchema: [
            { AttributeName: "MESSAGE_ID", KeyType: "HASH" },
            { AttributeName: "CUSTOMER_ID", KeyType: "RANGE" }
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

async function ensureDatabase() {
    ensureUsersTableExists().catch(err => {
        console.error("Failed to ensure Users table exists:", err);
        process.exit(1);
    });

    ensureAdminsTableExists().catch(err => {
        console.error("Failed to ensure Admin table exists:", err);
        process.exit(1);
    });

    ensureMessagesTableExists().catch(err => {
        console.error("Failed to ensure Messages table exists:", err);
        process.exit(1);
    });

    ensureChatroomsTableExists().catch(err => {
        console.error("Failed to ensure Chatrooms table exists:", err);
        process.exit(1);
    });

    
    
}

ensureDatabase()

app.post('/setUsers', async (req, res) => {
  const { CUSTOMER_ID, CUSTOMER_EMAIL, CUSTOMER_NAME } = req.body;  
  const ROOM_ACCESS = []
  if (!CUSTOMER_ID || !CUSTOMER_EMAIL || !CUSTOMER_NAME) {
      return res.status(400).send('Missing required fields: CUSTOMER_ID, CUSTOMER_EMAIL, CUSTOMER_NAME');
  }

  const params = {
      TableName: "USERS",
      Item: {
          CUSTOMER_ID, 
          CUSTOMER_EMAIL,
          CUSTOMER_NAME,
          ROOM_ACCESS
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

app.get('/checkAdmin', async (req, res) => {
    const { customer_id, customer_email } = req.query;

    const params = {
        TableName: "ADMINS",
        FilterExpression: "CUSTOMER_ID = :id AND CUSTOMER_EMAIL = :email",
        ExpressionAttributeValues: {
            ":id": customer_id,
            ":email": customer_email
        }
    };

    try {

        const data = await ddb.scan(params).promise();
        console.log(data);
        if (data.Items && data.Items.length > 0) {
            res.json({ exists: true, data: data.Items[0] });
        } else {
            res.status(404).json({ error: 'Admin not found' });
        }
    } catch (err) {
        console.error("Failed to check admin status:", err);
        res.status(500).json({ error: err.toString() });
    }
});

app.post('/sendMessage', async (req, res) => {
    const { TIMESTAMP, CUSTOMER_ID, CUSTOMER_NAME, MESSAGE, ROOMID } = req.body;
    console.log(req.body)
    const params = {
      TableName: ROOMID,
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
    const { roomId } = req.query

    const params = {
        TableName: roomId
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

async function deleteRoom(roomId) {
    const params = {
        TableName: roomId
    };
    try {
        await dynamoDb.deleteTable(params).promise();
        console.log(`Table deleted: ${roomId}`);
    } catch (error) {
        console.error(`Error deleting room table ${roomId}:`, error);
        throw error;
    }
}

app.post('/createRoom', async (req, res) => {
    const { roomId, customerId, customerEmail, roomName, inviteCode } = req.body;

    if (!roomId || !customerId || !customerEmail|| !roomName || !inviteCode ) {
        return res.status(400).json({ error: 'Room ID, Customer ID, Room Name, and Customer Email and invitecode are required' });
    }

    try {
        // Create the new room
        const roomParams = {
            TableName: roomId,
            AttributeDefinitions: [
                { AttributeName: "TIMESTAMP", AttributeType: "S" },
                { AttributeName: "CUSTOMER_ID", AttributeType: "S" }
            ],
            KeySchema: [
                { AttributeName: "TIMESTAMP", KeyType: "HASH" },
                { AttributeName: "CUSTOMER_ID", KeyType: "RANGE" }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
            }
        };
        await dynamoDb.createTable(roomParams).promise();
        console.log("Table created:", roomId);

        // Update admin's room list
        const updateAdminParams = {
            TableName: "ADMINS",
            Key: {
                "CUSTOMER_ID": customerId,
                "CUSTOMER_EMAIL": customerEmail
            },
            UpdateExpression: "SET ROOM_IDS = list_append(if_not_exists(ROOM_IDS, :empty_list), :new_room)",
            ExpressionAttributeValues: {
                ":new_room": [roomId],
                ":empty_list": []
            },
            ReturnValues: "UPDATED_NEW"
        };
        await ddb.update(updateAdminParams).promise();
        console.log("Admin updated successfully with new room ID");

        // Add to chatroom's room list
        const updateChatroomsParams = {
            TableName: "CHATROOMS",
            Item: {
                "GROUP_ID": roomId,
                "ROOM_NAME": roomName,
                "INVITE_CODE": inviteCode
            }
        };
        await ddb.put(updateChatroomsParams).promise();
        console.log("Chatroom entry added successfully");

        res.status(200).json({ message: 'Room created and admin and chatrooms updated successfully', roomId: roomId });
    } catch (error) {
        console.error('Error during room creation or updates:', error);
        try {
            await deleteRoom(roomId);
            // Additional cleanup can be added here if needed, e.g., removing entries from the chatrooms table if it was added
        } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
        }
        res.status(500).json({ error: 'Failed to create room or update admin or chatrooms', details: error.toString() });
    }
});

app.post('/deleteRoom', async (req, res) => {
    const { roomId, customerId, customerEmail } = req.body;

    if (!roomId) {
        return res.status(400).json({ error: 'Room ID is required' });
    }

    try {
        const deleteRoomParams = {
            TableName: roomId
        };
        await dynamoDb.deleteTable(deleteRoomParams).promise();
        console.log(`Table deleted: ${roomId}`);

        // Remove room ID from ADMINS table
        // Assuming you have the customerId and customerEmail available
        const adminParams = {
            TableName: "ADMINS",
            Key: {
                "CUSTOMER_ID": customerId,
                "CUSTOMER_EMAIL": customerEmail
            }
        };
        const adminData = await ddb.get(adminParams).promise();
        const currentRoomIds = adminData.Item.ROOM_IDS || [];

        // Remove the specified roomId from the current list
        const updatedRoomIds = currentRoomIds.filter(id => id !== roomId);

        // Update the ADMINS table with the updated list of room IDs
        const updateAdminParams = {
            TableName: "ADMINS",
            Key: {
                "CUSTOMER_ID": customerId,
                "CUSTOMER_EMAIL": customerEmail
            },
            UpdateExpression: "SET ROOM_IDS = :updatedRoomIds",
            ExpressionAttributeValues: {
                ":updatedRoomIds": updatedRoomIds
            },
            ReturnValues: "ALL_NEW"
        };
        await ddb.update(updateAdminParams).promise();
        await ddb.update(updateAdminParams).promise();
        console.log(`Room ID removed from ADMINS table: ${roomId}`);

        // Delete the entry from CHATROOMS table
        const deleteChatroomParams = {
            TableName: "CHATROOMS",
            Key: {
                "GROUP_ID": roomId
            }
        };
        await ddb.delete(deleteChatroomParams).promise();
        console.log(`Chatroom entry deleted: ${roomId}`);

        res.status(200).json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: 'Failed to delete room', details: error.toString() });
    }
});

app.get('/admin/roomids', async (req, res) => {
    const { customerId, customerEmail } = req.query; // Assuming customerId is provided as a query parameter

    try {
        // Fetch admin data from the ADMINS table
        const adminParams = {
            TableName: "ADMINS",
            Key: {
                "CUSTOMER_ID": customerId,
                "CUSTOMER_EMAIL": customerEmail
            }
        };
        const adminData = await ddb.get(adminParams).promise();
        console.log(adminData)
        // Extract room IDs from the admin data
        const roomIds = adminData.Item.ROOM_IDS || [];

        // Fetch room names associated with the room IDs from the CHATROOMS table
        const roomNames = [];
        const roomInvites = [];
        for (const roomId of roomIds) {
            const chatroomParams = {
                TableName: "CHATROOMS",
                Key: {
                    "GROUP_ID": roomId
                }
            };
            const chatroomData = await ddb.get(chatroomParams).promise();
            roomNames.push(chatroomData.Item.ROOM_NAME);
            roomInvites.push(chatroomData.Item.INVITE_CODE);
        }

        // Combine room IDs and names into an array of objects
        const roomData = roomIds.map((roomId, index) => ({
            roomId,
            roomName: roomNames[index],
            inviteCode: roomInvites[index]
        }));

        res.json(roomData);
    } catch (error) {
        console.error('Error fetching room IDs:', error);
        res.status(500).json({ error: 'Failed to fetch room IDs', details: error.toString() });
    }
});

app.get('/user/roomids', async (req, res) => {
    const { customerId, customerEmail } = req.query; // Assuming customerId is provided as a query parameter

    try {
        // Fetch admin data from the ADMINS table
        const userParams = {
            TableName: "USERS",
            Key: {
                "CUSTOMER_ID": customerId,
                "CUSTOMER_EMAIL": customerEmail
            }
        };
        const userData = await ddb.get(userParams).promise();
        console.log(userData)
        // Extract room IDs from the admin data
        const roomIds = userData.Item.ROOM_ACCESS || [];

        // Fetch room names associated with the room IDs from the CHATROOMS table
        const roomNames = [];

        for (const roomId of roomIds) {
            const chatroomParams = {
                TableName: "CHATROOMS",
                Key: {
                    "GROUP_ID": roomId
                }
            };
            const chatroomData = await ddb.get(chatroomParams).promise();
            roomNames.push(chatroomData.Item.ROOM_NAME);
        }

        // Combine room IDs and names into an array of objects
        const roomData = roomIds.map((roomId, index) => ({
            roomId,
            roomName: roomNames[index],
        }));

        res.json(roomData);
    } catch (error) {
        console.error('Error fetching room IDs:', error);
        res.status(500).json({ error: 'Failed to fetch room IDs', details: error.toString() });
    }
});

app.post('/addUserToChatroom', async (req, res) => {
    const { customerId, inviteCode, customerEmail } = req.body;

    if (!customerId || !inviteCode || !customerEmail) {
        return res.status(400).json({ error: 'Customer ID, EMAIL, and invite code are required' });
    }

    try {
        // Fetch the chatroom to ensure the invite code is valid
        const chatroomParams = {
            TableName: "CHATROOMS",
            FilterExpression: "INVITE_CODE = :inviteCode",
            ExpressionAttributeValues: {
                ":inviteCode": inviteCode
            }
        };
        
        const chatroomData = await ddb.scan(chatroomParams).promise();
        
        if (chatroomData.Items.length === 0) {
            return res.status(404).json({ error: 'No chatroom found with that invite code' });
        }
        
        const { GROUP_ID } = chatroomData.Items[0];
        
        // Retrieve the current room access list for the user
        const userParamsGet = {
            TableName: "USERS",
            Key: {
                "CUSTOMER_ID": customerId,
                "CUSTOMER_EMAIL": customerEmail
            }
        };

        const userData = await ddb.get(userParamsGet).promise();
        const currentRoomAccess = userData.Item ? userData.Item.ROOM_ACCESS || [] : [];

        // Check if the GROUP_ID is already in the ROOM_ACCESS list
        if (currentRoomAccess.includes(GROUP_ID)) {
            return res.status(409).json({ error: 'User is already added to this chatroom' });
        }

        // Update user's room access list if GROUP_ID is not present
        const userParamsUpdate = {
            TableName: "USERS",
            Key: {
                "CUSTOMER_ID": customerId,
                "CUSTOMER_EMAIL": customerEmail
            },
            UpdateExpression: "SET ROOM_ACCESS = list_append(if_not_exists(ROOM_ACCESS, :empty_list), :room_id)",
            ExpressionAttributeValues: {
                ":room_id": [GROUP_ID],
                ":empty_list": []
            },
            ReturnValues: "UPDATED_NEW"
        };

        await ddb.update(userParamsUpdate).promise();
        console.log(`User ${customerId} added to chatroom ${GROUP_ID} successfully.`);

        res.status(200).json({
            message: 'User added to chatroom successfully',
            chatroomId: GROUP_ID
        });
    } catch (error) {
        console.error('Failed to add user to chatroom:', error);
        res.status(500).json({ error: 'Internal server error', details: error.toString() });
    }
});


app.post('/leaveRoom', async (req, res) => {
    const { roomId, customerId, customerEmail } = req.body;

    if (!roomId) {
        return res.status(400).json({ error: 'Room ID is required' });
    }

    try {
        const userParams = {
            TableName: "USERS",
            Key: {
                "CUSTOMER_ID": customerId,
                "CUSTOMER_EMAIL": customerEmail
            }
        };
        const userData = await ddb.get(userParams).promise();
        const currentRoomIds = userData.Item.ROOM_ACCESS || [];

        // Remove the specified roomId from the current list
        const updatedRoomIds = currentRoomIds.filter(id => id !== roomId);

        // Update the USERS table with the updated list of room IDs
        const updateUsersParams = {
            TableName: "USERS",
            Key: {
                "CUSTOMER_ID": customerId,
                "CUSTOMER_EMAIL": customerEmail
            },
            UpdateExpression: "SET ROOM_ACCESS = :updatedRoomIds",
            ExpressionAttributeValues: {
                ":updatedRoomIds": updatedRoomIds
            },
            ReturnValues: "ALL_NEW"
        };
        await ddb.update(updateUsersParams).promise();
        console.log(`Room ID removed from USERS table: ${roomId}`);
        console.log("Update completed");

        res.status(200).json({ message: 'Room left successfully' });
    } catch (error) {
        console.error('Error leaving room:', error);
        res.status(500).json({ error: 'Failed to leave room', details: error.toString() });
    }
});


 







app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
