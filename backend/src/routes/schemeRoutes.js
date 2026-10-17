const express = require('express');
const { getMetadata, getAllSchemes } = require('../controllers/schemeController');

const router = express.Router();

router.get('/metadata', getMetadata);
router.get('/', getAllSchemes);

module.exports = router;
