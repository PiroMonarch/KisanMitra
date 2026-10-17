const Scheme = require('../models/Scheme');

/**
 * Get schemes metadata (version and count)
 */
exports.getMetadata = async (req, res) => {
    try {
        const count = await Scheme.countDocuments();
        const latestScheme = await Scheme.findOne().sort({ last_updated: -1 });

        res.json({
            count,
            version: latestScheme ? latestScheme.version : '0.0.0',
            last_updated: latestScheme ? latestScheme.last_updated : null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch metadata' });
    }
};

/**
 * Get all schemes
 */
exports.getAllSchemes = async (req, res) => {
    try {
        const schemes = await Scheme.find().sort({ scheme_id: 1 });
        res.json(schemes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch schemes' });
    }
};
