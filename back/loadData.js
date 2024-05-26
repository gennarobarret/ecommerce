require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Country = require('./models/countriesModel');
const State = require('./models/statesModel');
const logger = require('./helpers/logHelper');

// Verificar y crear el directorio de logs si no existe
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    logger.info('Connected to the MongoDB database.');
    loadData().then(() => {
        logger.info('Data loading complete.');
        process.exit();
    }).catch(err => {
        logger.error('Data loading error:', err);
        process.exit(1);
    });
}).catch(err => {
    logger.error('Failed to connect to the database', err);
    process.exit(1);
});

const loadCountries = async () => {
    const countriesPath = path.join(__dirname, 'data', 'countries.json');
    const statesPath = path.join(__dirname, 'data', 'states.json');

    const countriesData = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
    const statesData = JSON.parse(fs.readFileSync(statesPath, 'utf8'));

    await Country.deleteMany({});

    // Crear un mapa de country_id a ObjectId
    const countryIdMap = {};
    const countriesWithId = countriesData.map(country => {
        const newId = new mongoose.Types.ObjectId();
        countryIdMap[country.id] = newId;  // Asigna un nuevo ObjectId
        country._id = newId;
        return country;
    });

    await Country.insertMany(countriesWithId);
    logger.info('Countries loaded successfully');
    return countryIdMap;  // Devolver el mapa de country_id a ObjectId
};

const loadStates = async (countryIdMap) => {
    const statesPath = path.join(__dirname, 'data', 'states.json');
    const statesData = JSON.parse(fs.readFileSync(statesPath, 'utf8'));

    await State.deleteMany({});

    const statesWithCountryId = statesData.map(state => {
        const countryObjectId = countryIdMap[state.country_id];
        if (countryObjectId) {
            return { ...state, country: countryObjectId };
        } else {
            logger.warn(`Country with id ${state.country_id} not found for state ${state.province_name}`);
            return null;
        }
    }).filter(state => state !== null);

    await State.insertMany(statesWithCountryId);
    logger.info('States loaded successfully');
};

const loadData = async () => {
    try {
        const countryIdMap = await loadCountries();
        await loadStates(countryIdMap);
    } catch (error) {
        logger.error('Error loading data', error);
        throw error;
    } finally {
        mongoose.connection.close();
    }
};
