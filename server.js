import express from 'express';
import neo4j from 'neo4j-driver';
import cors from 'cors';
import { createClient } from 'redis';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

const redisClient = createClient();
redisClient.on('error', (err) => console.error('Redis client error', err));

await redisClient.connect();

const TOMTOM_API_KEY = 'sU9wuNPP1q7ArCeFNDDCyhozpXxWzhlx';
const driver = neo4j.driver('bolt://localhost:7690', neo4j.auth.basic('neo4j', 'Kim@30tae'));

// Bounding box coordinates for Heidelberg
const lat = 49.3988;
const lon = 8.6724;

app.get('/api/data', async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(
      'LOAD CSV FROM \'file:///addresses_and_hubs_coordinates.csv\' AS row RETURN row[0] AS parcelId, row[2] AS address, row[7] AS hub LIMIT 5'
    );

    const data = result.records.map(record => ({
      parcelId: record.get('parcelId'),
      address: record.get('address'),
      hub: record.get('hub')
    }));

    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
});


const createGraph = async (addressCoords, hubCoords, routes) => {
  const session = driver.session();
  try {
    
    await session.run(
      'MERGE (a:Location {name: $address, lat: $addressLat, lon: $addressLon}) ' +
      'MERGE (h:Location {name: $hub, lat: $hubLat, lon: $hubLon})',
      {
        address: 'Address',
        addressLat: addressCoords.lat,
        addressLon: addressCoords.lon,
        hub: 'Hub',
        hubLat: hubCoords.lat,
        hubLon: hubCoords.lon
      }
    );

   
    for (const route of routes) {
      await session.run(
        'MATCH (a:Location {name: "Address"}), (h:Location {name: "Hub"}) ' +
        'MERGE (a)-[r:ROUTE {duration: $duration, points: $points}]->(h)',
        {
          duration: route.duration,
          points: JSON.stringify(route.points) 
        }
      );
    }
  } catch (error) {
    console.error('Error creating graph:', error);
  } finally {
    await session.close();
  }
};


app.post('/api/save-routes', async (req, res) => {
  const { addressCoords, hubCoords, routes } = req.body;

  try {
    await createGraph(addressCoords, hubCoords, routes);
    res.json({ message: 'Graph data saved successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/shortest-route', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (start:Location {name: "Address"}), (end:Location {name: "Hub"}), ' +
      'path = shortestPath((start)-[:ROUTE*]->(end)) ' +
      'RETURN path'
    );

    const path = result.records[0].get('path');
    const shortestRoute = {
      points: path.segments.flatMap(segment => JSON.parse(segment.relationship.properties.points)),
      duration: path.segments.reduce((total, segment) => total + segment.relationship.properties.duration, 0)
    };

    res.json(shortestRoute);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
});

app.get('/fetch-traffic', async (req, res) => {
  try {
    const response = await fetch(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${TOMTOM_API_KEY}&point=${lat},${lon}`);

    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching traffic data:', errorText);
      return res.status(response.status).send('Error fetching traffic data: ' + errorText);
    }

    const responseBody = await response.text();
    console.log('Raw response:', responseBody);

    
    const data = JSON.parse(responseBody);

   
    await redisClient.set('trafficData', JSON.stringify(data), {
      EX: 60 * 15 
    });

    res.send('Traffic data stored in Redis');
  } catch (error) {
    console.error('Error fetching traffic data:', error);
    res.status(500).send('Error fetching traffic data');
  }
});


app.get('/traffic-data', async (req, res) => {
  try {
    const data = await redisClient.get('trafficData');
    if (!data) {
      return res.status(404).send('No traffic data found');
    }
    res.send(JSON.parse(data));
  } catch (error) {
    console.error('Error retrieving data from Redis:', error);
    res.status(500).send('Error retrieving data from Redis');
  }
});


app.get('/api/display-traffic', async (req, res) => {
  try {
    const data = await redisClient.get('trafficData');
    if (!data) {
      console.log('No traffic data found in Redis');
      return res.status(404).send('No traffic data found');
    }
    console.log('Traffic Data:', JSON.parse(data));
    res.send('Traffic data displayed in console');
  } catch (error) {
    console.error('Error retrieving data from Redis:', error);
    res.status(500).send('Error retrieving data from Redis');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
