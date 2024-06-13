import express from 'express';
import neo4j from 'neo4j-driver';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const driver = neo4j.driver('bolt://localhost:7690', neo4j.auth.basic('neo4j', 'Kim@30tae'));

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
